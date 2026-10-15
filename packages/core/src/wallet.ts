import type { StorageAdapter } from './storage';
import { getTier } from './pricing';
import {
  emptyLedger,
  isLedger,
  LEDGER_KEY,
  type CheerEntry,
  type Ledger,
  type LedgerEntry,
  type PurchaseEntry,
  type ResistedEntry,
} from './ledger';

/** Twitch caps a single cheer at 100,000 bits. */
export const MAX_CHEER_BITS = 100_000;
/** Twitch chat message limit. */
export const MAX_MESSAGE_LENGTH = 500;

const CHANNEL_PATTERN = /^[a-z0-9_]{1,25}$/;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class InsufficientBitsError extends Error {
  constructor(
    public readonly needed: number,
    public readonly available: number,
  ) {
    super(`Need ${needed} bits but only ${available} available`);
    this.name = 'InsufficientBitsError';
  }
}

export interface WalletOptions {
  storage: StorageAdapter;
  /** Injectable clock for tests. */
  now?: () => Date;
  /** Injectable id generator for tests. */
  newId?: () => string;
}

export interface CheerInput {
  bits: number;
  channel: string;
  message?: string;
}

export interface ChannelStat {
  channel: string;
  bits: number;
  cheers: number;
}

export interface WalletSummary {
  balanceBits: number;
  /** Fake money "spent" on bits, which is real money not spent. */
  moneySavedUsdCents: number;
  bitsSent: number;
  purchases: number;
  cheers: number;
  resisted: number;
  /** Every urge that ended here instead of on Twitch. */
  cravingsBeaten: number;
  /** Channels sorted by bits "sent", most first. */
  topChannels: ChannelStat[];
}

/** Lowercase, trimmed, leading "@" removed. Throws if the result is not a plausible Twitch login. */
export function normalizeChannel(raw: string): string {
  const channel = raw.trim().replace(/^@/, '').toLowerCase();
  if (!CHANNEL_PATTERN.test(channel)) {
    throw new ValidationError('Channel must be 1 to 25 letters, digits or underscores');
  }
  return channel;
}

/** Missing or unrecognisable data reads as an empty ledger. */
async function loadLedger(storage: StorageAdapter): Promise<Ledger> {
  const stored = await storage.get<unknown>(LEDGER_KEY);
  return isLedger(stored) ? stored : emptyLedger();
}

/**
 * Several wallets can share one storage: the popup and every Twitch tab open their
 * own. Mutations therefore re-read storage before applying and run one at a time
 * within a wallet, so one context never overwrites another's entries with a stale copy.
 */
export class Wallet {
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly storage: StorageAdapter,
    private readonly now: () => Date,
    private readonly newId: () => string,
    private ledger: Ledger,
  ) {}

  /** Loads the ledger from storage. Missing or unrecognisable data starts an empty wallet. */
  static async open(options: WalletOptions): Promise<Wallet> {
    return new Wallet(
      options.storage,
      options.now ?? (() => new Date()),
      options.newId ?? (() => crypto.randomUUID()),
      await loadLedger(options.storage),
    );
  }

  /** Re-reads storage, e.g. after another context changed it. */
  reload(): Promise<void> {
    return this.serial(async () => {
      this.ledger = await loadLedger(this.storage);
    });
  }

  get balanceBits(): number {
    return this.ledger.balanceBits;
  }

  /** Newest first. */
  get entries(): readonly LedgerEntry[] {
    return [...this.ledger.entries].reverse();
  }

  async buy(tierId: string): Promise<PurchaseEntry> {
    const tier = getTier(tierId);
    if (!tier) throw new ValidationError(`Unknown bit tier "${tierId}"`);

    return this.mutate((ledger) => {
      const entry: PurchaseEntry = {
        ...this.stamp(),
        kind: 'purchase',
        tierId: tier.id,
        bits: tier.bits,
        usdCents: tier.usdCents,
      };
      ledger.balanceBits += tier.bits;
      return entry;
    });
  }

  async cheer(input: CheerInput): Promise<CheerEntry> {
    const { bits } = input;
    if (!Number.isInteger(bits) || bits < 1 || bits > MAX_CHEER_BITS) {
      throw new ValidationError(`Bits must be a whole number between 1 and ${MAX_CHEER_BITS}`);
    }
    const channel = normalizeChannel(input.channel);
    const message = input.message?.trim();
    if (message !== undefined && message.length > MAX_MESSAGE_LENGTH) {
      throw new ValidationError(`Message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    }

    // The balance check runs against the freshly loaded ledger, not this wallet's copy.
    return this.mutate((ledger) => {
      if (bits > ledger.balanceBits) {
        throw new InsufficientBitsError(bits, ledger.balanceBits);
      }
      const entry: CheerEntry = {
        ...this.stamp(),
        kind: 'cheer',
        bits,
        channel,
        ...(message ? { message } : {}),
      };
      ledger.balanceBits -= bits;
      return entry;
    });
  }

  async resist(channel?: string): Promise<ResistedEntry> {
    const normalized = channel !== undefined ? normalizeChannel(channel) : undefined;
    return this.mutate((): ResistedEntry => ({
      ...this.stamp(),
      kind: 'resisted',
      ...(normalized !== undefined ? { channel: normalized } : {}),
    }));
  }

  summary(): WalletSummary {
    const summary: WalletSummary = {
      balanceBits: this.ledger.balanceBits,
      moneySavedUsdCents: 0,
      bitsSent: 0,
      purchases: 0,
      cheers: 0,
      resisted: 0,
      cravingsBeaten: 0,
      topChannels: [],
    };
    const byChannel = new Map<string, ChannelStat>();

    for (const entry of this.ledger.entries) {
      switch (entry.kind) {
        case 'purchase':
          summary.purchases += 1;
          summary.moneySavedUsdCents += entry.usdCents;
          break;
        case 'cheer': {
          summary.cheers += 1;
          summary.bitsSent += entry.bits;
          const stat = byChannel.get(entry.channel) ?? {
            channel: entry.channel,
            bits: 0,
            cheers: 0,
          };
          stat.bits += entry.bits;
          stat.cheers += 1;
          byChannel.set(entry.channel, stat);
          break;
        }
        case 'resisted':
          summary.resisted += 1;
          break;
      }
    }

    summary.cravingsBeaten = summary.cheers + summary.resisted;
    summary.topChannels = [...byChannel.values()].sort((a, b) => b.bits - a.bits);
    return summary;
  }

  /** Wipes everything. There is no undo. */
  reset(): Promise<void> {
    return this.serial(async () => {
      this.ledger = emptyLedger();
      await this.storage.remove(LEDGER_KEY);
    });
  }

  private stamp(): { id: string; at: string } {
    return { id: this.newId(), at: this.now().toISOString() };
  }

  /** Runs `work` once every earlier operation on this wallet has settled. */
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /**
   * Loads the latest ledger, lets `apply` adjust a copy and produce the entry, then
   * persists. If `apply` throws, nothing is written and the wallet keeps the fresh copy.
   */
  private mutate<T extends LedgerEntry>(apply: (ledger: Ledger) => T): Promise<T> {
    return this.serial(async () => {
      this.ledger = await loadLedger(this.storage);
      const next: Ledger = { ...this.ledger, entries: [...this.ledger.entries] };
      const entry = apply(next);
      next.entries.push(entry);
      await this.storage.set(LEDGER_KEY, next);
      this.ledger = next;
      return entry;
    });
  }
}
