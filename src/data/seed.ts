import { getDb } from './db/db'
import { addDays, dateKey } from './dates'
import { setMeta } from './meta'
import { upsertDailyMetrics, type DailyMetric } from './metrics'

/**
 * Dev-only: fills daily_metrics with a plausible year of fake steps so the
 * simulator is useful without a phone. Weekends trend higher; there's a slow
 * seasonal wave and daily noise. Safe to run repeatedly (upserts by date).
 */
export function seedFakeData(days = 365): void {
  const today = new Date()
  const rows: DailyMetric[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const seasonal = Math.sin((i / 365) * Math.PI * 2) * 2000
    const noise = Math.random() * 5000
    const steps = Math.max(0, Math.round(6000 + seasonal + noise + (weekend ? 3000 : 0)))
    rows.push({ date: dateKey(d), steps, distanceMeters: Math.round(steps * 0.75) })
  }
  upsertDailyMetrics(rows, new Date().toISOString())
  setMeta(getDb(), 'seeded', '1')
}
