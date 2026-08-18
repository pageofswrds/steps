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

/**
 * An hour as the stretch it covers, the way the chart's callout says it:
 * `14 → '2–3 PM'`, `11 → '11 AM–12 PM'`. When both ends share a meridiem it's
 * said once — '2–3 PM', not '2 PM–3 PM'.
 */
export function hourRange(hour: number): string {
  const name = (h: number) => {
    const wrapped = h % 24
    return `${wrapped % 12 === 0 ? 12 : wrapped % 12} ${wrapped < 12 ? 'AM' : 'PM'}`
  }
  const start = name(hour)
  const end = name(hour + 1)
  const [startNum, startHalf] = start.split(' ')
  const [, endHalf] = end.split(' ')
  return startHalf === endHalf ? `${startNum}–${end}` : `${start}–${end}`
}
