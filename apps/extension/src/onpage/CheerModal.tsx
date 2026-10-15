import { useEffect, useRef, useState } from 'preact/hooks';
import { estimateUsdCents, formatUsd, type CheerEntry } from '@fakebits/core';
import type { ChannelIdentity } from '@/src/twitch/twitchDom';
import { Burst } from '@/src/ui/Burst';
import { Buy } from '@/src/ui/Buy';
import { Cheermote } from '@/src/ui/Cheermote';
import { AmountPicker, CheerSummary, MessageField } from '@/src/ui/CheerParts';
import { play } from '@/src/ui/sound';
import { cx, fmtBits } from '@/src/ui/styles';
import { useWallet } from '@/src/ui/useWallet';

type Stage =
  | { name: 'cheer' }
  | { name: 'buy' }
  | { name: 'sent'; entry: CheerEntry; shown: boolean }
  | { name: 'resisted' };

interface Props {
  channel: string;
  identity: ChannelIdentity;
  /** Renders the local chat line. Returns false when the chat list could not be found. */
  onCheered: (entry: CheerEntry) => Promise<boolean>;
  onClose: () => void;
}

export function CheerModal({ channel, identity, onCheered, onClose }: Props) {
  const wallet = useWallet();
  const [stage, setStage] = useState<Stage>({ name: 'cheer' });
  const dialog = useRef<HTMLDivElement>(null);

  // Key events do not leave the shadow root (isolateEvents), so Escape is handled on the
  // overlay, and the dialog takes focus so it receives keys right away.
  useEffect(() => dialog.current?.focus(), []);

  const body = () => {
    if (!wallet.ready) return <p class="py-10 text-center text-sm text-zinc-500">Loading…</p>;
    switch (stage.name) {
      case 'buy':
        return <Buy wallet={wallet} go={() => setStage({ name: 'cheer' })} />;
      case 'sent':
        return <Sent entry={stage.entry} shown={stage.shown} onClose={onClose} />;
      case 'resisted':
        return (
          <div class="space-y-3 py-4 text-center">
            <p class="text-lg font-semibold">Logged. Nice.</p>
            <p class="text-sm text-zinc-400">
              {wallet.summary.cravingsBeaten} cravings beaten so far.
            </p>
            <button type="button" class={`${cx.btnPrimary} w-full`} onClick={onClose}>
              Close
            </button>
          </div>
        );
      case 'cheer':
        return (
          <CheerForm
            channel={channel}
            balance={wallet.summary.balanceBits}
            onBuy={() => setStage({ name: 'buy' })}
            onSend={async (bits, message) => {
              const entry = await wallet.cheer({
                bits,
                channel,
                ...(message ? { message } : {}),
              });
              void play('cheer', bits);
              setStage({ name: 'sent', entry, shown: await onCheered(entry) });
            }}
            onResist={async () => {
              await wallet.resist(channel);
              setStage({ name: 'resisted' });
            }}
          />
        );
    }
  };

  return (
    <div
      class="fb-root fixed inset-0 grid place-items-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Fake cheer for ${identity.displayName}`}
        class="flex max-h-[90vh] w-[380px] max-w-full flex-col overflow-hidden rounded-2xl bg-zinc-950 text-zinc-100 shadow-2xl ring-1 ring-zinc-800 outline-none"
      >
        <header class="flex items-center gap-3 border-b border-zinc-900 px-4 py-3">
          {identity.avatarUrl ? (
            <img src={identity.avatarUrl} alt="" class="size-9 rounded-full" />
          ) : (
            <span class="grid size-9 place-items-center rounded-full bg-zinc-800 text-sm font-semibold uppercase">
              {identity.displayName.slice(0, 1)}
            </span>
          )}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">Cheer {identity.displayName}</p>
            <p class="text-xs text-zinc-500">
              {fmtBits(wallet.summary.balanceBits)} fake bits in your wallet
            </p>
          </div>
          <span class="rounded bg-zinc-800 px-2 py-0.5 text-[10px] tracking-wide text-zinc-400 uppercase">
            simulation
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            class="grid size-7 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
          >
            ✕
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4">{body()}</div>

        <footer class="border-t border-zinc-900 px-4 py-2 text-center text-[10px] leading-snug text-zinc-600">
          FakeBits. Not affiliated with Twitch. Nothing is sent to the channel. No real money.
        </footer>
      </div>
    </div>
  );
}

function CheerForm({
  channel,
  balance,
  onBuy,
  onSend,
  onResist,
}: {
  channel: string;
  balance: number;
  onBuy: () => void;
  onSend: (bits: number, message: string) => Promise<void>;
  onResist: () => Promise<void>;
}) {
  const [bits, setBits] = useState(100);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const short = bits > balance;

  const run = async (work: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <form
      class="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !short) void run(() => onSend(bits, message.trim()));
      }}
    >
      <AmountPicker bits={bits} onChange={setBits} />
      <MessageField
        id="fb-onpage-message"
        value={message}
        onChange={setMessage}
        onCheerAmount={setBits}
      />
      <CheerSummary bits={bits} balance={balance} onBuy={onBuy} />

      <p class="text-xs text-zinc-500">
        The cheer shows up as a line in your own chat, marked “local only”. {channel} and everyone
        else in chat will not see it.
      </p>

      {error && <p class="text-xs text-red-400">{error}</p>}

      <button type="submit" class={`${cx.btnAccent} w-full`} disabled={busy || short}>
        {busy ? 'Cheering…' : `Cheer ${fmtBits(bits)} bits`}
      </button>
      <button
        type="button"
        class={`${cx.btnGhost} w-full`}
        onClick={() => void run(onResist)}
        disabled={busy}
      >
        Actually, I’ll just log that I resisted
      </button>
    </form>
  );
}

function Sent({
  entry,
  shown,
  onClose,
}: {
  entry: CheerEntry;
  shown: boolean;
  onClose: () => void;
}) {
  return (
    <div class="relative space-y-3 pt-2 text-center">
      <Burst />
      <Cheermote bits={entry.bits} size={72} class="fb-pop mx-auto" />
      <h2 class="text-lg font-semibold">You cheered {fmtBits(entry.bits)} bits</h2>
      <p class="text-sm text-zinc-300">
        {shown
          ? 'It is in your chat now, visible only to you.'
          : 'Could not find the chat on this page, but it is in your history.'}{' '}
        About {formatUsd(estimateUsdCents(entry.bits))} stayed in your pocket.
      </p>
      <button type="button" class={`${cx.btnPrimary} w-full`} onClick={onClose}>
        Close
      </button>
    </div>
  );
}
