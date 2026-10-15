/**
 * Cheermote tiers: the colour of the "Cheer" emote scales with the amount.
 * Thresholds and colours follow Twitch's standard cheermote set.
 */
export interface CheermoteTier {
  readonly minBits: number;
  readonly name: string;
  readonly color: string;
}

export const CHEERMOTE_TIERS: readonly CheermoteTier[] = [
  { minBits: 1, name: 'gray', color: '#979797' },
  { minBits: 100, name: 'purple', color: '#9c3ee8' },
  { minBits: 1000, name: 'green', color: '#1db2a5' },
  { minBits: 5000, name: 'blue', color: '#0099fe' },
  { minBits: 10000, name: 'red', color: '#f43021' },
];

/** Highest tier whose threshold the amount reaches. Anything below 1 gets the lowest tier. */
export function cheermoteTier(bits: number): CheermoteTier {
  let match = CHEERMOTE_TIERS[0]!;
  for (const tier of CHEERMOTE_TIERS) {
    if (bits >= tier.minBits) match = tier;
  }
  return match;
}
