import { useMemo, useState } from 'preact/hooks';
import { cravingStreak, formatUsd } from '@fakebits/core';
import { EntryRow } from './EntryRow';
import { cx, fmtBits } from './styles';
import type { WalletView } from './useWallet';
import type { Go } from './views';

export function Home({ wallet, go }: { wallet: WalletView; go: Go }) {
  const { summary, entries } = wallet;
  const [logged, setLogged] = useState(false);
  const streak = useMemo(() => cravingStreak(entries, new Date()), [entries]);

  const logResist = async () => {
    await wallet.resist();
    setLogged(true);
    setTimeout(() => setLogged(false), 1800);
  };

  return (
    <div class="space-y-3">
      <section class={cx.card}>
        <p class={cx.eyebrow}>Balance</p>
        <p class="text-3xl font-semibold">
          {fmtBits(summary.balanceBits)}{' '}
          <span class="text-base font-normal text-zinc-400">bits</span>
        </p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class={`${cx.btnPrimary} flex-1`}
            onClick={() => go({ name: 'buy' })}
          >
            Buy bits
          </button>
          <button
            type="button"
            class={`${cx.btnAccent} flex-1`}
            onClick={() => go({ name: 'cheer' })}
          >
            Cheer
          </button>
        </div>
      </section>

      <section class="rounded-xl bg-emerald-950/60 p-4">
        <p class="text-xs tracking-wide text-emerald-500 uppercase">Real money not spent</p>
        <p class="text-2xl font-semibold text-emerald-300">
          {formatUsd(summary.moneySavedUsdCents)}
        </p>
        <p class="mt-1 text-xs text-emerald-500/80">
          {summary.cravingsBeaten === 0
            ? 'No cravings beaten yet. The first one is the hardest.'
            : `${summary.cravingsBeaten} craving${summary.cravingsBeaten === 1 ? '' : 's'} beaten`}
        </p>
        {streak.current > 0 && (
          <p class="mt-2 text-sm font-medium text-emerald-300" data-testid="streak">
            {streak.current}-day streak
            <span class="font-normal text-emerald-500/80">
              {streak.today ? '' : ' · beat one today to keep it'}
              {streak.best > streak.current ? ` · best ${streak.best}` : ''}
            </span>
          </p>
        )}
      </section>

      <button type="button" class={`${cx.btnGhost} w-full`} onClick={logResist} disabled={logged}>
        {logged ? 'Logged. Nice.' : 'I wanted to cheer but didn’t'}
      </button>

      <section>
        <div class="mb-1 flex items-center justify-between">
          <h2 class={cx.eyebrow}>Recent</h2>
          {entries.length > 0 && (
            <button type="button" class={cx.btnLink} onClick={() => go({ name: 'history' })}>
              See all
            </button>
          )}
        </div>
        {entries.length === 0 ? (
          <p class="py-4 text-center text-sm text-zinc-600">Nothing yet. Buy some fake bits.</p>
        ) : (
          <ul class="divide-y divide-zinc-900">
            {entries.slice(0, 4).map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
