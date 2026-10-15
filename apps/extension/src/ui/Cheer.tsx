import { useEffect, useState } from 'preact/hooks';
import { estimateUsdCents, formatUsd, type CheerEntry } from '@fakebits/core';
import { activeTwitchChannel } from '@/src/twitch/activeChannel';
import { Burst } from './Burst';
import { Cheermote } from './Cheermote';
import { play } from './sound';
import { AmountPicker, CheerSummary, MessageField } from './CheerParts';
import { cx, fmtBits } from './styles';
import type { WalletView } from './useWallet';
import type { Go } from './views';

export function Cheer({
  wallet,
  go,
  initialChannel,
}: {
  wallet: WalletView;
  go: Go;
  initialChannel?: string;
}) {
  const [channel, setChannel] = useState(initialChannel ?? '');
  const [fromTab, setFromTab] = useState(false);
  const [bits, setBits] = useState(100);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<CheerEntry | null>(null);

  useEffect(() => {
    if (initialChannel) return;
    let cancelled = false;
    activeTwitchChannel().then((found) => {
      if (cancelled || !found) return;
      setChannel(found);
      setFromTab(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initialChannel]);

  const balance = wallet.summary.balanceBits;
  const short = bits > balance;

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      const trimmed = message.trim();
      setSent(await wallet.cheer({ bits, channel, ...(trimmed ? { message: trimmed } : {}) }));
      void play('cheer', bits);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const resist = async () => {
    setBusy(true);
    try {
      await wallet.resist(channel.trim() || undefined);
    } catch {
      await wallet.resist();
    } finally {
      setBusy(false);
      go({ name: 'home' });
    }
  };

  if (sent) {
    return (
      <Sent
        entry={sent}
        onAgain={() => {
          setSent(null);
          setMessage('');
        }}
        go={go}
      />
    );
  }

  return (
    <form
      class="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !short) void send();
      }}
    >
      <div>
        <label class={cx.label} for="fb-channel">
          Channel {fromTab && <span class="text-zinc-600">(from this tab)</span>}
        </label>
        <input
          id="fb-channel"
          class={cx.input}
          placeholder="streamer login"
          autoComplete="off"
          value={channel}
          onInput={(e) => {
            setChannel(e.currentTarget.value);
            setFromTab(false);
          }}
        />
      </div>

      <AmountPicker bits={bits} onChange={setBits} />
      <MessageField id="fb-message" value={message} onChange={setMessage} onCheerAmount={setBits} />
      <CheerSummary bits={bits} balance={balance} onBuy={() => go({ name: 'buy' })} />

      {error && <p class="text-xs text-red-400">{error}</p>}

      <button type="submit" class={`${cx.btnAccent} w-full`} disabled={busy || short}>
        {busy ? 'Cheering…' : `Cheer ${fmtBits(bits)} bits`}
      </button>
      <button type="button" class={`${cx.btnGhost} w-full`} onClick={resist} disabled={busy}>
        Actually, I’ll just log that I resisted
      </button>
    </form>
  );
}

function Sent({ entry, onAgain, go }: { entry: CheerEntry; onAgain: () => void; go: Go }) {
  return (
    <div class="relative space-y-3 pt-2 text-center">
      <Burst />
      <Cheermote bits={entry.bits} size={72} class="fb-pop mx-auto" />
      <h2 class="text-lg font-semibold">
        You cheered {fmtBits(entry.bits)} bits to {entry.channel}
      </h2>
      {entry.message && <p class="text-sm text-zinc-400 italic">"{entry.message}"</p>}
      <p class="text-sm text-zinc-300">
        Nobody saw it, and about {formatUsd(estimateUsdCents(entry.bits))} stayed in your pocket.
      </p>
      <div class="flex gap-2 pt-2">
        <button type="button" class={`${cx.btnGhost} flex-1`} onClick={onAgain}>
          Cheer again
        </button>
        <button
          type="button"
          class={`${cx.btnPrimary} flex-1`}
          onClick={() => go({ name: 'home' })}
        >
          Home
        </button>
      </div>
    </div>
  );
}
