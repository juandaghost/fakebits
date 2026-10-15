/**
 * Persisted shape of the wallet. Everything the app shows is derived from
 * `entries`; `balanceBits` is kept alongside as a cache.
 */
export const LEDGER_VERSION = 1;

/** Storage key for the ledger. Bump the suffix together with LEDGER_VERSION when the shape changes. */
export const LEDGER_KEY = 'fakebits.ledger.v1';

interface EntryBase {
  readonly id: string;
  /** ISO 8601 timestamp */
  readonly at: string;
}

export interface PurchaseEntry extends EntryBase {
  readonly kind: 'purchase';
  readonly tierId: string;
  readonly bits: number;
  readonly usdCents: number;
}

export interface CheerEntry extends EntryBase {
  readonly kind: 'cheer';
  readonly bits: number;
  readonly channel: string;
  readonly message?: string;
}

/** The user wanted to cheer and logged it instead of "sending" anything. */
export interface ResistedEntry extends EntryBase {
  readonly kind: 'resisted';
  readonly channel?: string;
}

export type LedgerEntry = PurchaseEntry | CheerEntry | ResistedEntry;

export interface Ledger {
  readonly version: typeof LEDGER_VERSION;
  balanceBits: number;
  entries: LedgerEntry[];
}

export function emptyLedger(): Ledger {
  return { version: LEDGER_VERSION, balanceBits: 0, entries: [] };
}

/** Loose structural check so corrupt or outdated storage falls back to an empty ledger. */
export function isLedger(value: unknown): value is Ledger {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate['version'] === LEDGER_VERSION &&
    typeof candidate['balanceBits'] === 'number' &&
    Array.isArray(candidate['entries'])
  );
}
