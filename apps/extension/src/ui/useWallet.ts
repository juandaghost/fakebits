import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import {
  LEDGER_KEY,
  Wallet,
  type CheerEntry,
  type CheerInput,
  type LedgerEntry,
  type PurchaseEntry,
  type ResistedEntry,
  type WalletSummary,
} from '@fakebits/core';
import { ExtensionStorage } from '@/src/storage';

export interface WalletView {
  ready: boolean;
  summary: WalletSummary;
  entries: readonly LedgerEntry[];
  buy(tierId: string): Promise<PurchaseEntry>;
  cheer(input: CheerInput): Promise<CheerEntry>;
  resist(channel?: string): Promise<ResistedEntry>;
  reset(): Promise<void>;
}

interface Snapshot {
  summary: WalletSummary;
  entries: readonly LedgerEntry[];
}

const EMPTY: WalletSummary = {
  balanceBits: 0,
  moneySavedUsdCents: 0,
  bitsSent: 0,
  purchases: 0,
  cheers: 0,
  resisted: 0,
  cravingsBeaten: 0,
  topChannels: [],
};

/** Opens the wallet once and re-snapshots after every mutation so components re-render. */
export function useWallet(): WalletView {
  const walletRef = useRef<Wallet | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const refresh = useCallback(() => {
    const wallet = walletRef.current;
    if (wallet) setSnapshot({ summary: wallet.summary(), entries: wallet.entries });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Wallet.open({ storage: new ExtensionStorage() }).then((wallet) => {
      if (cancelled) return;
      walletRef.current = wallet;
      refresh();
    });

    // The popup and every Twitch tab hold their own wallet. Follow writes made elsewhere.
    const onChanged = (changes: Record<string, unknown>, area: string) => {
      const wallet = walletRef.current;
      if (area !== 'local' || !(LEDGER_KEY in changes) || !wallet) return;
      void wallet.reload().then(() => {
        if (!cancelled) refresh();
      });
    };
    browser.storage.onChanged.addListener(onChanged);

    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, [refresh]);

  const wallet = (): Wallet => {
    if (!walletRef.current) throw new Error('Wallet not ready');
    return walletRef.current;
  };

  const then = async <T>(work: Promise<T>): Promise<T> => {
    const result = await work;
    refresh();
    return result;
  };

  return {
    ready: snapshot !== null,
    summary: snapshot?.summary ?? EMPTY,
    entries: snapshot?.entries ?? [],
    buy: (tierId) => then(wallet().buy(tierId)),
    cheer: (input) => then(wallet().cheer(input)),
    resist: (channel) => then(wallet().resist(channel)),
    reset: () => then(wallet().reset()),
  };
}
