import { addDays, addMonths, dateKey, lastNDateKeys, startOfDay, startOfMonth } from '../dates'

test('dateKey formats local YYYY-MM-DD with padding', () => {
  expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
})

test('addDays crosses month boundaries', () => {
  expect(dateKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
})

test('lastNDateKeys returns n ascending keys ending at from', () => {
  const keys = lastNDateKeys(3, new Date(2026, 7, 13))
  expect(keys).toEqual(['2026-08-11', '2026-08-12', '2026-08-13'])
})

test('startOfDay zeroes the time', () => {
  const d = startOfDay(new Date(2026, 7, 13, 17, 45))
  expect(d.getHours()).toBe(0)
  expect(dateKey(d)).toBe('2026-08-13')
})

test('startOfMonth returns the first, time zeroed', () => {
  const d = startOfMonth(new Date(2026, 7, 13, 17, 45))
  expect(dateKey(d)).toBe('2026-08-01')
  expect(d.getHours()).toBe(0)
})

test('addMonths crosses year boundaries and lands on the first', () => {
  expect(dateKey(addMonths(new Date(2026, 0, 15), -1))).toBe('2025-12-01')
  expect(dateKey(addMonths(new Date(2026, 11, 15), 1))).toBe('2027-01-01')
})
