import { getDb, setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { getMeta } from '../meta'
import { seedFakeData } from '../seed'
import { createTestDb } from './helpers/testDb'

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

test('seeds one plausible row per day and marks meta', () => {
  seedFakeData(30)
  const rows = getDb().all<{ steps: number }>('SELECT steps FROM daily_metrics')
  expect(rows).toHaveLength(30)
  for (const r of rows) {
    expect(r.steps).toBeGreaterThanOrEqual(0)
    expect(r.steps).toBeLessThan(40000)
  }
  expect(getMeta(getDb(), 'seeded')).toBe('1')
})
