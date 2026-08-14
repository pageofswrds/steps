import { getDb } from './db/db'
import { addDays, dateKey } from './dates'
import { notify } from './emitter'

export interface DailyMetric {
  date: string
  steps: number
  distanceMeters: number
}

export interface WorkoutRow {
  id: string
  date: string
  start: string
  end: string
  type: string
  distanceMeters: number | null
  durationS: number
}

export function upsertDailyMetrics(rows: DailyMetric[], syncedAt: string): void {
  const db = getDb()
  for (const r of rows) {
    db.run(
      `INSERT INTO daily_metrics (date, steps, distance_meters, synced_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET steps = excluded.steps, distance_meters = excluded.distance_meters, synced_at = excluded.synced_at`,
      [r.date, r.steps, r.distanceMeters, syncedAt],
    )
  }
  if (rows.length) notify('daily_metrics')
}

/** One row per calendar day in [start, end], ascending; zeros where nothing is stored. */
export function getDailyMetrics(range: { start: string; end: string }): DailyMetric[] {
  const stored = new Map(
    getDb()
      .all<{ date: string; steps: number; distance_meters: number }>(
        'SELECT date, steps, distance_meters FROM daily_metrics WHERE date >= ? AND date <= ?',
        [range.start, range.end],
      )
      .map((r) => [r.date, r]),
  )
  const out: DailyMetric[] = []
  // Date keys are local dates; parse at noon to dodge DST edges.
  let cursor = new Date(`${range.start}T12:00:00`)
  const last = range.end
  while (dateKey(cursor) <= last) {
    const key = dateKey(cursor)
    const row = stored.get(key)
    out.push({ date: key, steps: row?.steps ?? 0, distanceMeters: row?.distance_meters ?? 0 })
    cursor = addDays(cursor, 1)
  }
  return out
}

export function upsertWorkouts(rows: WorkoutRow[]): void {
  const db = getDb()
  for (const w of rows) {
    db.run(
      `INSERT INTO workouts (id, date, start, end, type, distance_meters, duration_s) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET date = excluded.date, start = excluded.start, end = excluded.end, type = excluded.type, distance_meters = excluded.distance_meters, duration_s = excluded.duration_s`,
      [w.id, w.date, w.start, w.end, w.type, w.distanceMeters, w.durationS],
    )
  }
  if (rows.length) notify('workouts')
}

export function getWorkouts(range: { start: string; end: string }): WorkoutRow[] {
  return getDb()
    .all<{ id: string; date: string; start: string; end: string; type: string; distance_meters: number | null; duration_s: number }>(
      'SELECT * FROM workouts WHERE date >= ? AND date <= ? ORDER BY start DESC',
      [range.start, range.end],
    )
    .map((r) => ({ id: r.id, date: r.date, start: r.start, end: r.end, type: r.type, distanceMeters: r.distance_meters, durationS: r.duration_s }))
}
