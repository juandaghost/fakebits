import { useState } from 'preact/hooks';
import { BIT_TIERS, formatUsd, type BitTier, type PurchaseEntry } from '@fakebits/core';
import { Burst } from './Burst';
import { play } from './sound';
import { cx, fmtBits } from './styles';
import type { WalletView } from './useWallet';
import type { Go } from './views';

type Stage = 'pick' | 'checkout' | 'processing' | 'done';

const FAKE_PROCESSING_MS = 1100;

const formatCard = (raw: string) =>
  raw
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};
const formatCvc = (raw: string) => raw.replace(/\D/g, '').slice(0, 4);

export function Buy({ wallet, go }: { wallet: WalletView; go: Go }) {
  const [stage, setStage] = useState<Stage>('pick');
  const [tier, setTier] = useState<BitTier | null>(null);
  const [receipt, setReceipt] = useState<PurchaseEntry | null>(null);

  const pick = (t: BitTier) => {
    setTier(t);
    setStage('checkout');
  };

  const pay = async () => {
    if (!tier) return;
    setStage('processing');
    await new Promise((resolve) => setTimeout(resolve, FAKE_PROCESSING_MS));
    setReceipt(await wallet.buy(tier.id));
    void play('purchase');
    setStage('done');
  };

  if (stage === 'done' && receipt) {
    return (
      <Receipt
        entry={receipt}
        onCheer={() => go({ name: 'cheer' })}
        onAgain={() => {
          setReceipt(null);
          setStage('pick');
        }}
      />
    );
  }

  if ((stage === 'checkout' || stage === 'processing') && tier) {
    return (
      <Checkout
        tier={tier}
        processing={stage === 'processing'}
        onPay={pay}
        onBack={() => setStage('pick')}
      />
    );
  }

  return (
    <div class="space-y-3">
      <p class="text-sm text-zinc-400">
        Pick a bundle. The checkout is a stage prop: it accepts anything and charges nothing.
      </p>
      <div class="grid grid-cols-2 gap-2">
        {BIT_TIERS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pick(t)}
            class="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-violet-500 hover:bg-zinc-800"
          >
            <p class="text-lg font-semibold">{fmtBits(t.bits)}</p>
            <p class="text-xs text-zinc-500">bits</p>
            <p class="mt-2 text-sm text-violet-300">{formatUsd(t.usdCents)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Checkout({
  tier,
  processing,
  onPay,
  onBack,
}: {
  tier: BitTier;
  processing: boolean;
  onPay: () => void;
  onBack: () => void;
}) {
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const complete = card.length > 0 && expiry.length > 0 && cvc.length > 0 && name.trim().length > 0;

  return (
    <form
      class="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (complete && !processing) onPay();
      }}
    >
      <div class={`${cx.card} flex items-center justify-between`}>
        <div>
          <p class="text-lg font-semibold">{fmtBits(tier.bits)} bits</p>
          <p class="text-xs text-zinc-500">Fake purchase</p>
        </div>
        <p class="text-xl font-semibold text-violet-300">{formatUsd(tier.usdCents)}</p>
      </div>

      <div>
        <label class={cx.label} for="fb-card">
          Card number
        </label>
        <input
          id="fb-card"
          class={cx.input}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000 0000 0000 0000"
          value={card}
          onInput={(e) => setCard(formatCard(e.currentTarget.value))}
          disabled={processing}
        />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class={cx.label} for="fb-expiry">
            Expiry
          </label>
          <input
            id="fb-expiry"
            class={cx.input}
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/YY"
            value={expiry}
            onInput={(e) => setExpiry(formatExpiry(e.currentTarget.value))}
            disabled={processing}
          />
        </div>
        <div>
          <label class={cx.label} for="fb-cvc">
            CVC
          </label>
          <input
            id="fb-cvc"
            class={cx.input}
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            value={cvc}
            onInput={(e) => setCvc(formatCvc(e.currentTarget.value))}
            disabled={processing}
          />
        </div>
      </div>
      <div>
        <label class={cx.label} for="fb-name">
          Name on card
        </label>
        <input
          id="fb-name"
          class={cx.input}
          autoComplete="off"
          placeholder="Anything goes"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          disabled={processing}
        />
      </div>

      <p class="text-xs text-zinc-500">
        Type whatever you like. Nothing is validated, stored beyond this screen, or sent anywhere.
      </p>

      <div class="flex gap-2">
        <button type="button" class={cx.btnGhost} onClick={onBack} disabled={processing}>
          Back
        </button>
        <button type="submit" class={`${cx.btnPrimary} flex-1`} disabled={!complete || processing}>
          {processing ? 'Processing…' : `Pay ${formatUsd(tier.usdCents)}`}
        </button>
      </div>
    </form>
  );
}

function Receipt({
  entry,
  onCheer,
  onAgain,
}: {
  entry: PurchaseEntry;
  onCheer: () => void;
  onAgain: () => void;
}) {
  return (
    <div class="relative space-y-3 pt-2 text-center">
      <Burst />
      <div class="fb-pop mx-auto grid size-16 place-items-center rounded-full bg-emerald-600 text-3xl text-white">
        ✓
      </div>
      <h2 class="text-lg font-semibold">Purchase complete</h2>
      <p class="text-sm text-zinc-300">
        +{fmtBits(entry.bits)} bits added. {formatUsd(entry.usdCents)} is still in your account,
        because no card was charged.
      </p>
      <div class="flex gap-2 pt-2">
        <button type="button" class={`${cx.btnGhost} flex-1`} onClick={onAgain}>
          Buy more
        </button>
        <button type="button" class={`${cx.btnAccent} flex-1`} onClick={onCheer}>
          Cheer now
        </button>
      </div>
    </div>
  );
}
