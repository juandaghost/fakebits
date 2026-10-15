import type { LedgerEntry } from './ledger';

export interface Streak {
  /** Consecutive days, ending today or yesterday, with at least one craving beaten. */
  current: number;
  /** Longest run of such days ever. */
  best: number;
  /** Whether today already counts. If not, `current` is still alive until midnight. */
  today: boolean;
}

/** Calendar day in the device's local time zone. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Local calendar day `offset` days from `date`. Built from parts, so DST shifts do not matter. */
function shiftDay(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/**
 * A craving is beaten by a fake cheer or a logged "I resisted": either way no real
 * bits were bought. Purchases do not count, they are the craving, not the win.
 */
export function cravingStreak(entries: readonly LedgerEntry[], now: Date): Streak {
  const days = new Map<string, Date>();
  for (const entry of entries) {
    if (entry.kind === 'purchase') continue;
    const at = new Date(entry.at);
    days.set(dayKey(at), shiftDay(at, 0));
  }

  const runFrom = (start: Date) => {
    let length = 0;
    while (days.has(dayKey(shiftDay(start, -length)))) length += 1;
    return length;
  };

  const today = days.has(dayKey(now));
  const current = runFrom(today ? now : shiftDay(now, -1));

  let best = 0;
  for (const day of days.values()) {
    // Only measure from the last day of each run.
    if (!days.has(dayKey(shiftDay(day, 1)))) best = Math.max(best, runFrom(day));
  }

  return { current, best, today };
}
