import { getDb } from './db/db'
import { addDays, startOfDay } from './dates'
import { notify } from './emitter'
import { healthKitSource } from './health/healthkit'
import type { HealthSource } from './health/types'
import { getMeta, setMeta } from './meta'
import { upsertDailyMetrics, upsertWorkouts } from './metrics'

export type SyncStatus = 'ok' | 'unavailable' | 'permission-needed' | 'error'

const BACKFILL_DAYS = 365
const WINDOW_DAYS = 90

/**
 * Pulls daily totals + walking/hiking workouts from Apple Health into SQLite.
 * Idempotent: upserts by date/id, so re-running is always safe.
 */
export async function syncHealth(options?: { requestPermissionIfNeeded?: boolean; source?: HealthSource }): Promise<{ status: SyncStatus }> {
  const source = options?.source ?? healthKitSource
  const db = getDb()
  try {
    if (!(await source.isAvailable())) return { status: 'unavailable' }

    let permission = await source.permissionStatus()
    if (permission === 'shouldRequest' && options?.requestPermissionIfNeeded) {
      await source.requestPermissions()
      permission = await source.permissionStatus()
    }
    setMeta(db, 'permission_state', permission)
    if (permission === 'shouldRequest') {
      notify('meta')
      return { status: 'permission-needed' }
    }

    const days = getMeta(db, 'first_sync_done') === '1' ? WINDOW_DAYS : BACKFILL_DAYS
    const end = new Date()
    const start = startOfDay(addDays(end, -(days - 1)))

    const totals = await source.getDailyTotals(start, end)
    upsertDailyMetrics(totals, new Date().toISOString())
    upsertWorkouts(await source.getWorkouts(start, end))

    setMeta(db, 'first_sync_done', '1')
    setMeta(db, 'last_synced_at', new Date().toISOString())
    notify('meta')
    return { status: 'ok' }
  } catch (e) {
    console.warn('health sync failed; keeping last-known data', e)
    return { status: 'error' }
  }
}
