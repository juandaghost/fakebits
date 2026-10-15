import { formatRelative } from '../src';

describe('formatRelative', () => {
  const now = new Date('2026-10-14T12:00:00.000Z');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [0, 'just now'],
    [44_000, 'just now'],
    [45_000, '1 min ago'],
    [5 * 60_000, '5 min ago'],
    [59 * 60_000, '59 min ago'],
    [60 * 60_000, '1 h ago'],
    [23 * 3_600_000, '23 h ago'],
    [24 * 3_600_000, '1 d ago'],
    [6 * 86_400_000, '6 d ago'],
  ])('%i ms ago -> %s', (ms, expected) => {
    expect(formatRelative(ago(ms), now)).toBe(expected);
  });

  it('falls back to a short date after a week', () => {
    expect(formatRelative('2026-10-01T12:00:00.000Z', now)).toBe('Oct 1');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(formatRelative('nope', now)).toBe('');
  });

  it('defaults to the current time', () => {
    expect(formatRelative(new Date().toISOString())).toBe('just now');
  });
});
