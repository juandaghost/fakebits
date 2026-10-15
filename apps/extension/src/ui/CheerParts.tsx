import { useEffect, useState } from 'preact/hooks';
import {
  MAX_CHEER_BITS,
  MAX_MESSAGE_LENGTH,
  cheerAmountFromMessage,
  estimateUsdCents,
  formatUsd,
} from '@fakebits/core';
import { Cheermote } from './Cheermote';
import { cx, fmtBits } from './styles';

// Pieces of the cheer form shared by the popup's Cheer screen and the on-page modal.

const PRESETS = [1, 100, 500, 1000, 5000, 10000];

export function AmountPicker({
  bits,
  onChange,
}: {
  bits: number;
  onChange: (bits: number) => void;
}) {
  const [custom, setCustom] = useState('');
  const customActive = custom !== '';

  // The amount can also change from outside (a "cheer500" typed in the message). Mirror it:
  // presets light up, any other amount shows in the custom field.
  useEffect(() => {
    if (custom !== '' && Number(custom) === bits) return;
    setCustom(PRESETS.includes(bits) ? '' : String(bits));
    // Deliberately keyed on `bits` only: `custom` changes must not trigger this.
  }, [bits]);

  const pickPreset = (value: number) => {
    setCustom('');
    onChange(value);
  };
  const onCustom = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCustom(digits);
    if (digits) onChange(Math.min(Number(digits), MAX_CHEER_BITS));
  };

  return (
    <div>
      <p class={cx.label}>Amount</p>
      <div class="flex flex-wrap gap-1.5">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => pickPreset(value)}
            class={`${cx.chip} ${!customActive && bits === value ? cx.chipOn : cx.chipOff}`}
          >
            {fmtBits(value)}
          </button>
        ))}
        <input
          class={`${cx.input} w-24 py-1 ${customActive ? 'border-violet-500' : ''}`}
          inputMode="numeric"
          placeholder="custom"
          aria-label="Custom amount"
          value={custom}
          onInput={(e) => onCustom(e.currentTarget.value)}
        />
      </div>
    </div>
  );
}

/**
 * Message box. Typing a Twitch-style cheer ("cheer500", any case) sets the amount, but only
 * when the tokens change, so picking a preset afterwards is not undone by further typing.
 */
export function MessageField({
  id,
  value,
  onChange,
  onCheerAmount,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onCheerAmount: (bits: number) => void;
}) {
  const onInput = (next: string) => {
    const amount = cheerAmountFromMessage(next);
    if (amount !== undefined && amount !== cheerAmountFromMessage(value)) onCheerAmount(amount);
    onChange(next);
  };

  return (
    <div>
      <label class={cx.label} for={id}>
        Message <span class="text-zinc-600">(optional)</span>
      </label>
      <textarea
        id={id}
        class={`${cx.input} h-16 resize-none`}
        maxLength={MAX_MESSAGE_LENGTH}
        placeholder="Say something nobody will read"
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
      />
      <p class="mt-0.5 flex justify-between text-[10px] text-zinc-600">
        <span>Tip: type cheer500 to set the amount</span>
        <span>
          {value.length}/{MAX_MESSAGE_LENGTH}
        </span>
      </p>
    </div>
  );
}

/** Live preview of the cheer: tier gem, rough USD, balance afterwards or a "buy more" link. */
export function CheerSummary({
  bits,
  balance,
  onBuy,
}: {
  bits: number;
  balance: number;
  onBuy: () => void;
}) {
  return (
    <div class={`${cx.card} flex items-center gap-3`}>
      <Cheermote bits={bits} size={40} />
      <div class="flex-1">
        <p class="text-sm">
          <span class="font-semibold">{fmtBits(bits)}</span> bits, about{' '}
          {formatUsd(estimateUsdCents(bits))}
        </p>
        <p class="text-xs text-zinc-500">
          {bits > balance ? (
            <>
              You have {fmtBits(balance)}.{' '}
              <button type="button" class={cx.btnLink} onClick={onBuy}>
                Buy more
              </button>
            </>
          ) : (
            `${fmtBits(balance - bits)} left afterwards`
          )}
        </p>
      </div>
    </div>
  );
}
