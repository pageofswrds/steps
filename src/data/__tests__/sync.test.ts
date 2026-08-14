import { getDb, setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import type { HealthSource } from '../health/types'
import { getMeta } from '../meta'
import { getDailyMetrics } from '../metrics'
import { syncHealth } from '../sync'
import { createTestDb } from './helpers/testDb'

function fakeSource(overrides: Partial<HealthSource> = {}): HealthSource & { calls: { start: Date; end: Date }[] } {
  const calls: { start: Date; end: Date }[] = []
  return {
    calls,
    isAvailable: async () => true,
    permissionStatus: async () => 'requested' as const,
    requestPermissions: async () => {},
    getDailyTotals: async (start: Date, end: Date) => {
      calls.push({ start, end })
      return [{ date: '2026-08-13', steps: 1234, distanceMeters: 900 }]
    },
    getWorkouts: async () => [
      { id: 'w1', date: '2026-08-13', start: '2026-08-13T09:00:00.000Z', end: '2026-08-13T10:00:00.000Z', type: 'walking' as const, distanceMeters: 4000, durationS: 3600 },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

const daySpan = (c: { start: Date; end: Date }) => Math.round((c.end.getTime() - c.start.getTime()) / 86400000)

test('first sync backfills ~365 days, later syncs ~90, and data lands', async () => {
  const source = fakeSource()
  expect((await syncHealth({ source })).status).toBe('ok')
  expect(daySpan(source.calls[0])).toBeGreaterThanOrEqual(364)
  expect((await syncHealth({ source })).status).toBe('ok')
  expect(daySpan(source.calls[1])).toBeLessThanOrEqual(91)
  const today = getDailyMetrics({ start: '2026-08-13', end: '2026-08-13' })[0]
  expect(today.steps).toBe(1234)
  expect(getMeta(getDb(), 'first_sync_done')).toBe('1')
  expect(getMeta(getDb(), 'last_synced_at')).toBeTruthy()
})

test('re-sync is idempotent (no duplicate rows)', async () => {
  const source = fakeSource()
  await syncHealth({ source })
  await syncHealth({ source })
  const all = getDb().all('SELECT * FROM daily_metrics')
  expect(all).toHaveLength(1)
  expect(getDb().all('SELECT * FROM workouts')).toHaveLength(1)
})

test('permission-needed: does not query, records state, unless asked to request', async () => {
  let asked = false
  const source = fakeSource({
    permissionStatus: async () => (asked ? ('requested' as const) : ('shouldRequest' as const)),
    requestPermissions: async () => {
      asked = true
    },
  })
  expect((await syncHealth({ source })).status).toBe('permission-needed')
  expect(source.calls).toHaveLength(0)
  expect(getMeta(getDb(), 'permission_state')).toBe('shouldRequest')
  expect((await syncHealth({ source, requestPermissionIfNeeded: true })).status).toBe('ok')
  expect(getMeta(getDb(), 'permission_state')).toBe('requested')
})

test('unavailable and error statuses', async () => {
  expect((await syncHealth({ source: fakeSource({ isAvailable: async () => false }) })).status).toBe('unavailable')
  const failing = fakeSource({
    getDailyTotals: async () => {
      throw new Error('boom')
    },
  })
  expect((await syncHealth({ source: failing })).status).toBe('error')
})
