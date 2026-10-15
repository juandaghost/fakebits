import { formatRelative, formatUsd, type LedgerEntry } from '@fakebits/core';
import { Cheermote } from './Cheermote';
import { fmtBits } from './styles';

export function EntryRow({ entry }: { entry: LedgerEntry }) {
  const when = <span class="shrink-0 text-xs text-zinc-600">{formatRelative(entry.at)}</span>;

  if (entry.kind === 'purchase') {
    return (
      <li class="flex items-center gap-3 py-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-950 text-emerald-400">
          +
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm text-zinc-200">+{fmtBits(entry.bits)} bits</p>
          <p class="truncate text-xs text-zinc-500">
            "Bought" for {formatUsd(entry.usdCents)}. Nothing was charged.
          </p>
        </div>
        {when}
      </li>
    );
  }

  if (entry.kind === 'cheer') {
    return (
      <li class="flex items-center gap-3 py-2">
        <Cheermote bits={entry.bits} size={32} class="shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm text-zinc-200">
            {fmtBits(entry.bits)} bits to <span class="font-medium">{entry.channel}</span>
          </p>
          {entry.message && <p class="truncate text-xs text-zinc-500 italic">"{entry.message}"</p>}
        </div>
        {when}
      </li>
    );
  }

  return (
    <li class="flex items-center gap-3 py-2">
      <span class="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-800 text-zinc-300">
        ✓
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-zinc-200">Resisted the urge</p>
        <p class="truncate text-xs text-zinc-500">
          {entry.channel ? `while watching ${entry.channel}` : 'no channel logged'}
        </p>
      </div>
      {when}
    </li>
  );
}
