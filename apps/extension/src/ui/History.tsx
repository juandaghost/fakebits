import { useMemo, useState } from 'preact/hooks';
import type { LedgerEntry } from '@fakebits/core';
import { EntryRow } from './EntryRow';
import { cx } from './styles';
import type { WalletView } from './useWallet';

type Kind = 'all' | LedgerEntry['kind'];

const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'purchase', label: 'Bought' },
  { value: 'cheer', label: 'Cheered' },
  { value: 'resisted', label: 'Resisted' },
];

export function History({
  wallet,
  initialChannel,
}: {
  wallet: WalletView;
  initialChannel?: string;
}) {
  const [channel, setChannel] = useState(initialChannel ?? '');
  const [kind, setKind] = useState<Kind>('all');

  const channels = useMemo(() => {
    const set = new Set<string>();
    for (const entry of wallet.entries) {
      if (entry.kind !== 'purchase' && entry.channel) set.add(entry.channel);
    }
    return [...set].sort();
  }, [wallet.entries]);

  const filtered = wallet.entries.filter((entry) => {
    if (kind !== 'all' && entry.kind !== kind) return false;
    if (channel && (entry.kind === 'purchase' || entry.channel !== channel)) return false;
    return true;
  });

  return (
    <div class="space-y-3">
      <div class="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            class={`${cx.chip} ${kind === k.value ? cx.chipOn : cx.chipOff}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {channels.length > 0 && (
        <select
          class={cx.input}
          value={channel}
          onChange={(e) => setChannel(e.currentTarget.value)}
          aria-label="Filter by channel"
        >
          <option value="">All channels</option>
          {channels.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      {filtered.length === 0 ? (
        <p class="py-8 text-center text-sm text-zinc-600">Nothing here.</p>
      ) : (
        <ul class="divide-y divide-zinc-900">
          {filtered.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
