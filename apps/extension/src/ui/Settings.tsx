import { useEffect, useState } from 'preact/hooks';
import { MAX_DISPLAY_NAME_LENGTH, formatUsd } from '@fakebits/core';
import { play } from './sound';
import { cx, fmtBits } from './styles';
import { useSettings } from './useSettings';
import type { WalletView } from './useWallet';

/** How long the reset button stays armed after the first tap. */
const CONFIRM_WINDOW_MS = 4000;

export function Settings({ wallet }: { wallet: WalletView }) {
  const { ready, settings, save } = useSettings();
  const [name, setName] = useState(settings.displayName);
  const [saved, setSaved] = useState(false);

  // Fill the field once the stored value arrives, and when another context changes it.
  useEffect(() => setName(settings.displayName), [settings.displayName]);

  const saveName = async () => {
    const next = await save({ displayName: name });
    setName(next.displayName);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!ready) return <p class="py-10 text-center text-sm text-zinc-600">Loading…</p>;

  return (
    <div class="space-y-4">
      <form
        class="space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          void saveName();
        }}
      >
        <label class={cx.label} for="fb-display-name">
          Name on your chat lines
        </label>
        <div class="flex gap-2">
          <input
            id="fb-display-name"
            class={cx.input}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            autoComplete="off"
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
            onBlur={() => {
              if (name !== settings.displayName) void saveName();
            }}
          />
          <button type="submit" class={cx.btnPrimary}>
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
        <p class="text-xs text-zinc-500">
          Shown on the “local only” line in your chat. Only you see it.
        </p>
      </form>

      <div class={`${cx.card} flex items-center justify-between gap-3`}>
        <label class="flex flex-1 cursor-pointer items-center gap-3" for="fb-sound">
          <input
            id="fb-sound"
            type="checkbox"
            class="size-4 accent-violet-500"
            checked={settings.sound}
            onChange={(e) => void save({ sound: e.currentTarget.checked })}
          />
          <span class="text-sm">Sound on buy and cheer</span>
        </label>
        <button type="button" class={cx.btnLink} onClick={() => void play('cheer', 1000, true)}>
          Test
        </button>
      </div>

      <ResetWallet wallet={wallet} />

      <p class="text-xs leading-relaxed text-zinc-600">
        FakeBits is a simulation. It is not affiliated with Twitch, never sends anything to a
        channel, and never charges money. Everything stays in this browser.
      </p>
    </div>
  );
}

function ResetWallet({ wallet }: { wallet: WalletView }) {
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState(false);
  const { summary, entries } = wallet;

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const onClick = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    await wallet.reset();
    setArmed(false);
    setDone(true);
  };

  return (
    <section class="space-y-2 rounded-xl border border-red-950 p-4">
      <p class="text-sm font-medium text-zinc-200">Reset wallet</p>
      <p class="text-xs text-zinc-500">
        {done
          ? 'Wallet cleared. Your settings were kept.'
          : entries.length === 0
            ? 'Nothing to clear.'
            : `Deletes ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}, ${fmtBits(summary.balanceBits)} bits and the ${formatUsd(summary.moneySavedUsdCents)} not spent. There is no undo.`}
      </p>
      <button
        type="button"
        class={`${armed ? 'bg-red-600 text-white hover:bg-red-500' : 'border border-red-900 text-red-400 hover:bg-red-950'} w-full rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40`}
        disabled={entries.length === 0}
        onClick={() => void onClick()}
      >
        {armed ? 'Tap again to delete everything' : 'Reset wallet'}
      </button>
    </section>
  );
}
