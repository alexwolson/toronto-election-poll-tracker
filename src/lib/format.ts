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

/** An election-result share where tenths distinguish close factual thresholds. */
export function formatDetailedSharePct(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/** An ISO date as a day number (days since the Unix epoch, UTC) — a numeric
 *  horizontal coordinate for time-series fitting. Pure (no clock access). */
export function isoDayNumber(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return NaN;
  const [, y, m, d] = match;
  return Math.round(Date.UTC(Number(y), Number(m) - 1, Number(d)) / 86_400_000);
}

/** Parts of a whole (fractions summing to 1) as whole percents that add to
 *  exactly 100. Each part is floored, then the points still missing go to the
 *  parts with the largest remainders (earlier index wins a tie), so no value
 *  moves by a full point and plain rounding's 67 + 8 + 26 = 101 cannot happen. */
export function percentagesToHundred(fractions: number[]): number[] {
  const scaled = fractions.map((f) => f * 100);
  const out = scaled.map((v) => Math.floor(v));
  const missing = 100 - out.reduce((a, b) => a + b, 0);
  const byRemainder = scaled
    .map((v, i) => ({ i, remainder: v - out[i] }))
    .sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (const { i } of byRemainder.slice(0, Math.max(0, missing))) out[i] += 1;
  return out;
}

/** Day numbers of the first day of each month within [minDay, maxDay], for axis
 *  ticks on short date ranges. */
export function monthStartDays(minDay: number, maxDay: number): number[] {
  const start = new Date(minDay * 86_400_000);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  if (start.getUTCDate() !== 1) month += 1;
  const days: number[] = [];
  for (;;) {
    const day = Math.round(Date.UTC(year, month, 1) / 86_400_000);
    if (day > maxDay) break;
    days.push(day);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return days;
}
