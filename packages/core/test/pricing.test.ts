import { BIT_TIERS, estimateUsdCents, formatUsd, getTier } from '../src';

describe('pricing', () => {
  it('lists tiers in ascending order of bits', () => {
    const bits = BIT_TIERS.map((t) => t.bits);
    expect(bits).toEqual([...bits].sort((a, b) => a - b));
  });

  it('finds a tier by id', () => {
    expect(getTier('bits-100')).toEqual({ id: 'bits-100', bits: 100, usdCents: 140 });
  });

  it('returns undefined for an unknown tier', () => {
    expect(getTier('bits-7')).toBeUndefined();
  });

  it('estimates the value of arbitrary bits at 1.4 cents each', () => {
    expect(estimateUsdCents(100)).toBe(140);
    expect(estimateUsdCents(1)).toBe(1);
    expect(estimateUsdCents(333)).toBe(466);
  });

  it('formats cents as US dollars', () => {
    expect(formatUsd(140)).toBe('$1.40');
    expect(formatUsd(30800)).toBe('$308.00');
    expect(formatUsd(0)).toBe('$0.00');
  });
});
