import { healthKitSource } from './health/healthkit'
import { getDailyMetrics } from './metrics'

export interface HourlySteps {
  /** 0–23, local time. */
  hour: number
  steps: number
}

export function emptyHours(): HourlySteps[] {
  return Array.from({ length: 24 }, (_, hour) => ({ hour, steps: 0 }))
}

/**
 * One day's steps, hour by hour.
 *
 * Unlike daily totals, hourly data is NOT stored in SQLite — it is asked of
 * HealthKit on demand, only ever for the day on screen, and Health stays its
 * source of truth. Re-asking is cheap; storing it would just be a second copy
 * to keep honest.
 *
 * Dev fallback: where HealthKit doesn't exist (the simulator) but the dev
 * seed has filled the database, the day's stored total is spread over a
 * plausible, deterministic waking-hours curve so the chart has something to
 * draw. __DEV__ only, and it sums exactly to the day's total — a real install
 * on a phone always sees honest HealthKit numbers (or honest zeros).
 */
export async function getHourlySteps(date: string): Promise<HourlySteps[]> {
  if (await healthKitSource.isAvailable()) {
    // Noon: any moment inside the day works, and midnight has DST edges.
    return healthKitSource.getHourlySteps(new Date(date + 'T12:00:00'))
  }
  if (__DEV__) {
    const [metric] = getDailyMetrics({ start: date, end: date })
    if (metric && metric.steps > 0) return synthesizeHourly(date, metric.steps)
  }
  return emptyHours()
}

/**
 * Deterministic per date — the same day always yields the same curve (the
 * seed is the date string, never Math.random, so renders don't flicker).
 */
function synthesizeHourly(date: string, total: number): HourlySteps[] {
  // FNV-1a hash of the date string, then mulberry32.
  let s = 2166136261
  for (let i = 0; i < date.length; i++) {
    s ^= date.charCodeAt(i)
    s = Math.imul(s, 16777619)
  }
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  // A plausible walking day: asleep until 6, morning rise, midday plateau,
  // evening peak, wind-down. Zero weight means zero steps, honestly.
  const shape = [
    0, 0, 0, 0, 0, 0, // 12a–5a
    0.2, 0.5, 0.8, 0.7, 0.6, 0.7, // 6a–11a
    0.9, 0.8, 0.6, 0.7, 0.9, 1, // 12p–5p
    0.9, 0.7, 0.5, 0.3, 0.1, 0, // 6p–11p
  ]
  const weights = shape.map((w) => w * (0.7 + rand() * 0.6))
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const steps = weights.map((w) => Math.floor((w / weightSum) * total))
  // Hand the rounding remainder to the biggest hour, so the bars sum exactly
  // to the day's total — the chart and the headline number always agree.
  const remainder = total - steps.reduce((a, b) => a + b, 0)
  steps[weights.indexOf(Math.max(...weights))] += remainder
  return steps.map((stepCount, hour) => ({ hour, steps: stepCount }))
}
