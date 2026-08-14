import {
  AuthorizationRequestStatus,
  WorkoutActivityType,
  getRequestStatusForAuthorization,
  isHealthDataAvailableAsync,
  queryStatisticsCollectionForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit'
import { dateKey, startOfDay } from '../dates'
import type { HealthDailyTotal, HealthSource, HealthWorkout } from './types'

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKWorkoutTypeIdentifier',
] as const

function toMeters(q: { unit: string; quantity: number } | undefined): number {
  if (!q) return 0
  if (q.unit === 'km') return q.quantity * 1000
  if (q.unit === 'mi') return q.quantity * 1609.344
  return q.quantity // 'm'
}

function toSeconds(q: { unit: string; quantity: number }): number {
  if (q.unit === 'min') return q.quantity * 60
  if (q.unit === 'hr') return q.quantity * 3600
  return q.quantity // 's'
}

async function dailySums(identifier: (typeof READ_TYPES)[number], unit: string, start: Date, end: Date): Promise<Map<string, number>> {
  const responses = await queryStatisticsCollectionForQuantity(
    identifier as 'HKQuantityTypeIdentifierStepCount',
    ['cumulativeSum'],
    startOfDay(start),
    { day: 1 },
    // Drift from brief: queryStatisticsCollectionForQuantity's installed .d.ts (lib/typescript/healthkit.d.ts)
    // infers T from `identifier`, and options.unit is typed UnitForIdentifier<T> — a per-identifier literal
    // (e.g. 'count' for step count; a LengthUnit union for distance; see generated/healthkit.generated.d.ts
    // QuantityUnitByIdentifierMap). Since `identifier` above is already cast to a fixed literal so this
    // helper can be shared across identifiers, `unit: string` no longer matches that narrowed literal type.
    { filter: { date: { startDate: start, endDate: end } }, unit: unit as any },
  )
  const byDate = new Map<string, number>()
  for (const r of responses) {
    if (r.startDate) byDate.set(dateKey(new Date(r.startDate)), r.sumQuantity?.quantity ?? 0)
  }
  return byDate
}

export const healthKitSource: HealthSource = {
  isAvailable: () => isHealthDataAvailableAsync(),

  permissionStatus: async () => {
    const status = await getRequestStatusForAuthorization({ toRead: [...READ_TYPES] })
    return status === AuthorizationRequestStatus.shouldRequest ? 'shouldRequest' : 'requested'
  },

  requestPermissions: async () => {
    await requestAuthorization({ toRead: [...READ_TYPES] })
  },

  getDailyTotals: async (start: Date, end: Date): Promise<HealthDailyTotal[]> => {
    const steps = await dailySums('HKQuantityTypeIdentifierStepCount', 'count', start, end)
    const distance = await dailySums('HKQuantityTypeIdentifierDistanceWalkingRunning', 'm', start, end)
    const dates = new Set([...steps.keys(), ...distance.keys()])
    return [...dates].sort().map((date) => ({
      date,
      steps: Math.round(steps.get(date) ?? 0),
      distanceMeters: distance.get(date) ?? 0,
    }))
  },

  getWorkouts: async (start: Date, end: Date): Promise<HealthWorkout[]> => {
    const proxies = await queryWorkoutSamples({ limit: -1, filter: { date: { startDate: start, endDate: end } } })
    const wanted = new Map<number, HealthWorkout['type']>([
      [WorkoutActivityType.walking, 'walking'],
      [WorkoutActivityType.hiking, 'hiking'],
    ])
    return proxies
      .filter((p) => wanted.has(p.workoutActivityType))
      .map((p) => {
        const w = p.toJSON()
        const startDate = new Date(w.startDate)
        return {
          id: w.uuid,
          date: dateKey(startDate),
          start: startDate.toISOString(),
          end: new Date(w.endDate).toISOString(),
          type: wanted.get(w.workoutActivityType)!,
          distanceMeters: w.totalDistance ? toMeters(w.totalDistance) : null,
          durationS: toSeconds(w.duration),
        }
      })
  },
}
