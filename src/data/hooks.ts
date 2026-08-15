import { useEffect, useState } from 'react'
import { getDb } from './db/db'
import { todayKey } from './dates'
import { subscribe } from './emitter'
import { getEntry, listEntries, type Entry } from './entries'
import { getMeta } from './meta'
import { getDailyMetrics, getWorkouts, type DailyMetric, type WorkoutRow } from './metrics'

/** Core plumbing: run a query now, re-run it whenever any of `tables` changes. */
function useLiveQuery<T>(tables: string[], query: () => T, deps: unknown[]): T {
  const [value, setValue] = useState(query)
  useEffect(() => {
    setValue(query())
    const unsubs = tables.map((t) => subscribe(t, () => setValue(query())))
    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

/**
 * Daily step + distance rows for a date range, one row per day (zeros for
 * days with no data), oldest first.
 *
 * ```tsx
 * const week = useDailySteps({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
 * ```
 */
export function useDailySteps(range: { start: string; end: string }): DailyMetric[] {
  return useLiveQuery(['daily_metrics'], () => getDailyMetrics(range), [range.start, range.end])
}

/**
 * Today's steps and distance. Updates automatically after every Health sync.
 *
 * ```tsx
 * const today = useToday()
 * <Text>{today.steps} steps</Text>
 * ```
 */
export function useToday(): DailyMetric {
  return useLiveQuery(['daily_metrics'], () => getDailyMetrics({ start: todayKey(), end: todayKey() })[0], [])
}

/**
 * Journal entries, newest first, optionally restricted to a date range.
 * Updates whenever an entry is added, edited, or deleted.
 *
 * ```tsx
 * const entries = useEntries({ start: '2026-08-01', end: '2026-08-31' })
 * ```
 */
export function useEntries(range?: { start?: string; end?: string }): Entry[] {
  return useLiveQuery(['entries'], () => listEntries(range), [range?.start, range?.end])
}

/**
 * A single entry by id, or `undefined` if it doesn't exist (yet, or anymore).
 * Updates when that entry — or any entry — changes.
 *
 * ```tsx
 * const entry = useEntry(entryId)
 * if (!entry) return <NotFound />
 * ```
 */
export function useEntry(id: string): Entry | undefined {
  return useLiveQuery(['entries'], () => getEntry(id), [id])
}

/**
 * Workouts (walks/hikes from Health) in a date range, newest first.
 *
 * ```tsx
 * const workouts = useWorkouts({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
 * ```
 */
export function useWorkouts(range: { start: string; end: string }): WorkoutRow[] {
  return useLiveQuery(['workouts'], () => getWorkouts(range), [range.start, range.end])
}

/**
 * Health sync status: when data was last pulled, and whether permission
 * still needs to be requested from the user.
 *
 * ```tsx
 * const { lastSyncedAt, permissionState } = useSyncStatus()
 * if (permissionState === 'shouldRequest') return <ConnectHealthPrompt />
 * ```
 */
export function useSyncStatus(): { lastSyncedAt: string | null; permissionState: 'unknown' | 'shouldRequest' | 'requested' } {
  return useLiveQuery(
    ['meta'],
    () => {
      const db = getDb()
      const permission = getMeta(db, 'permission_state')
      return {
        lastSyncedAt: getMeta(db, 'last_synced_at') ?? null,
        permissionState: permission === 'shouldRequest' || permission === 'requested' ? permission : ('unknown' as const),
      }
    },
    [],
  )
}
