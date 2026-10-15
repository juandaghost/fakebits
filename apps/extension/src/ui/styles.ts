/** Shared Tailwind class strings so buttons and inputs look the same everywhere. */
const btn =
  'rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40';

export const cx = {
  btnPrimary: `${btn} bg-violet-600 text-white hover:bg-violet-500`,
  btnAccent: `${btn} bg-emerald-600 text-white hover:bg-emerald-500`,
  btnGhost: `${btn} border border-zinc-800 text-zinc-300 hover:bg-zinc-900`,
  btnLink: 'text-xs text-violet-400 hover:text-violet-300',
  input:
    'w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none',
  label: 'mb-1 block text-xs font-medium text-zinc-400',
  card: 'rounded-xl bg-zinc-900 p-4',
  eyebrow: 'text-xs uppercase tracking-wide text-zinc-500',
  chip: 'rounded-full px-2.5 py-1 text-xs transition',
  chipOn: 'bg-violet-600 text-white',
  chipOff: 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800',
};

export const fmtBits = (bits: number): string => bits.toLocaleString('en-US');
