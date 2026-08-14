import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { getDailyMetrics, getWorkouts, upsertDailyMetrics, upsertWorkouts } from '../metrics'
import { createTestDb } from './helpers/testDb'

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

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
