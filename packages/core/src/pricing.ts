/**
 * Bit bundles the fake checkout offers. Prices mirror Twitch's US tiers so the
 * "money saved" number feels real. Checked against twitch.tv by the owner on
 * 2026-10-14. They are copied here, not fetched; re-check if Twitch changes prices.
 *
 * Money is stored in integer cents to avoid floating point drift.
 */
export interface BitTier {
  readonly id: string;
  readonly bits: number;
  readonly usdCents: number;
}

export const BIT_TIERS = [
  { id: 'bits-100', bits: 100, usdCents: 140 },
  { id: 'bits-500', bits: 500, usdCents: 700 },
  { id: 'bits-1500', bits: 1500, usdCents: 1995 },
  { id: 'bits-5000', bits: 5000, usdCents: 6440 },
  { id: 'bits-10000', bits: 10000, usdCents: 12600 },
  { id: 'bits-25000', bits: 25000, usdCents: 30800 },
] as const satisfies readonly BitTier[];

export type BitTierId = (typeof BIT_TIERS)[number]['id'];

export function getTier(id: string): BitTier | undefined {
  return BIT_TIERS.find((tier) => tier.id === id);
}

/** Rough USD value of an arbitrary number of bits, at the 100-bit tier rate of 1.4 cents each. */
export function estimateUsdCents(bits: number): number {
  return Math.round(bits * 1.4);
}

/** 140 -> "$1.40" */
export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
