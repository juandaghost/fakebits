import { cravingStreak, type LedgerEntry } from '../src';

// Local-time dates, so the tests hold in any time zone.
const day = (d: number, hour = 12) => new Date(2026, 9, d, hour);

let n = 0;
const cheer = (at: Date): LedgerEntry => ({
  id: `c${++n}`,
  at: at.toISOString(),
  kind: 'cheer',
  bits: 1,
  channel: 'a',
});
const resisted = (at: Date): LedgerEntry => ({
  id: `r${++n}`,
  at: at.toISOString(),
  kind: 'resisted',
});
const purchase = (at: Date): LedgerEntry => ({
  id: `p${++n}`,
  at: at.toISOString(),
  kind: 'purchase',
  tierId: 'bits-100',
  bits: 100,
  usdCents: 140,
});

describe('cravingStreak', () => {
  it('is zero with no entries', () => {
    expect(cravingStreak([], day(14))).toEqual({ current: 0, best: 0, today: false });
  });

  it('does not count purchases', () => {
    expect(cravingStreak([purchase(day(14))], day(14))).toEqual({
      current: 0,
      best: 0,
      today: false,
    });
  });

  it('counts consecutive days ending today, once per day', () => {
    const entries = [cheer(day(12)), resisted(day(13, 9)), resisted(day(13, 22)), cheer(day(14))];
    expect(cravingStreak(entries, day(14, 20))).toEqual({ current: 3, best: 3, today: true });
  });

  it('stays alive through today when the run ended yesterday', () => {
    const entries = [resisted(day(12)), resisted(day(13))];
    expect(cravingStreak(entries, day(14))).toEqual({ current: 2, best: 2, today: false });
  });

  it('breaks after a missed day but remembers the best run', () => {
    const entries = [
      resisted(day(1)),
      resisted(day(2)),
      resisted(day(3)),
      resisted(day(4)),
      cheer(day(10)),
      cheer(day(11)),
    ];
    expect(cravingStreak(entries, day(14))).toEqual({ current: 0, best: 4, today: false });
    expect(cravingStreak(entries, day(12))).toEqual({ current: 2, best: 4, today: false });
  });

  it('counts across a month boundary', () => {
    const entries = [resisted(new Date(2026, 8, 30, 12)), resisted(new Date(2026, 9, 1, 12))];
    expect(cravingStreak(entries, new Date(2026, 9, 1, 18)).current).toBe(2);
  });
});
