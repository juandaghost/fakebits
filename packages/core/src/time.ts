/** "just now", "5 min ago", "3 h ago", "2 d ago", then a short date. Empty string for bad input. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - Date.parse(iso);
  if (!Number.isFinite(diffMs)) return '';

  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
