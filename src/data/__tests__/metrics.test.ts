import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { todayKey } from '../dates'
import { getDailyMetrics, getWorkouts, upsertDailyMetrics, upsertWorkouts } from '../metrics'
import { createTestDb } from './helpers/testDb'

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

// RED for this one was skipped deliberately: before the fix, a malformed `start`
// (e.g. 'today') makes the cursor 'Invalid Date' -> dateKey 'NaN-NaN-NaN', which
// never advances and never sorts >= a real end date -- the loop hangs forever.
// Running this against the pre-fix code would hang the whole suite, so it's
// written straight against the fixed implementation instead of run RED first.
test('getDailyMetrics returns [] for a malformed range.start instead of hanging', () => {
  expect(getDailyMetrics({ start: 'today', end: todayKey() })).toEqual([])
})

test('getDailyMetrics returns [] for a degenerate range (start > end)', () => {
  expect(getDailyMetrics({ start: '2026-08-12', end: '2026-08-10' })).toEqual([])
})

test('upsert replaces by date; getDailyMetrics gap-fills the range ascending', () => {
  upsertDailyMetrics([{ date: '2026-08-11', steps: 100, distanceMeters: 80 }], 't1')
  upsertDailyMetrics([{ date: '2026-08-11', steps: 250, distanceMeters: 200 }], 't2')
  const rows = getDailyMetrics({ start: '2026-08-10', end: '2026-08-12' })
  expect(rows).toEqual([
    { date: '2026-08-10', steps: 0, distanceMeters: 0 },
    { date: '2026-08-11', steps: 250, distanceMeters: 200 },
    { date: '2026-08-12', steps: 0, distanceMeters: 0 },
  ])
})

test('workouts upsert by id and read newest first', () => {
  const w = (id: string, start: string) => ({ id, date: start.slice(0, 10), start, end: start, type: 'walking', distanceMeters: 1000, durationS: 600 })
  upsertWorkouts([w('a', '2026-08-01T10:00:00.000Z'), w('b', '2026-08-02T10:00:00.000Z')])
  upsertWorkouts([w('a', '2026-08-01T10:00:00.000Z')])
  const rows = getWorkouts({ start: '2026-08-01', end: '2026-08-02' })
  expect(rows.map((r) => r.id)).toEqual(['b', 'a'])
})
