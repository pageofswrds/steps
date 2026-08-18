/**
 * Small shared formatting helpers.
 *
 * Anything that turns a number into text the user reads, and that more than one
 * screen needs, belongs here — so the two screens can't quietly drift into
 * disagreeing with each other.
 */

/**
 * An hour of the day, the short way: `0 → '12a'`, `6 → '6a'`, `12 → '12p'`,
 * `18 → '6p'`.
 *
 * Every hour gets a label, including the ones a chart may not end up drawing —
 * deciding *which* labels are shown is the chart's job (`labelEvery`), not this
 * function's.
 */
export function hourLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${hour < 12 ? 'a' : 'p'}`
}
