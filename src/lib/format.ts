/** Small display formatters. Dates are parsed as plain calendar dates (no
 *  timezone shift), so an ISO "2026-08-16" always renders as Aug 16. */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

/** A poll share (0..1) as a whole-number percent, e.g. 0.4851 -> "49%". */
export function formatSharePct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** An ISO date as a day number (days since the Unix epoch, UTC) — a numeric
 *  horizontal coordinate for time-series fitting. Pure (no clock access). */
export function isoDayNumber(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return NaN;
  const [, y, m, d] = match;
  return Math.round(Date.UTC(Number(y), Number(m) - 1, Number(d)) / 86_400_000);
}
