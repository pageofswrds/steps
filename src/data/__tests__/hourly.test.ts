import { isHealthDataAvailableAsync, queryStatisticsCollectionForQuantity } from '@kingstinct/react-native-healthkit'
import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { healthKitSource } from '../health/healthkit'
import { emptyHours, getHourlySteps } from '../hourly'
import { upsertDailyMetrics } from '../metrics'
import { createTestDb } from './helpers/testDb'

const available = isHealthDataAvailableAsync as jest.Mock
const statsQuery = queryStatisticsCollectionForQuantity as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

test('healthkit adapter buckets hourly statistics and zero-fills to 24', async () => {
  statsQuery.mockResolvedValue([
    { startDate: '2026-08-13T07:00:00', sumQuantity: { unit: 'count', quantity: 640.4 } },
    { startDate: '2026-08-13T18:00:00', sumQuantity: { unit: 'count', quantity: 910 } },
  ])
  const hours = await healthKitSource.getHourlySteps(new Date(2026, 7, 13))
  expect(hours).toHaveLength(24)
  expect(hours.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i))
  expect(hours[7].steps).toBe(640) // rounded
  expect(hours[18].steps).toBe(910)
  expect(hours.filter((h) => h.steps > 0)).toHaveLength(2)
  // hourly interval, day-long filter window, same unit as daily step sums
  expect(statsQuery).toHaveBeenCalledWith(
    'HKQuantityTypeIdentifierStepCount',
    ['cumulativeSum'],
    expect.any(Date),
    { hour: 1 },
    expect.objectContaining({ unit: 'count' }),
  )
})

test('getHourlySteps delegates to HealthKit when available', async () => {
  available.mockResolvedValue(true)
  statsQuery.mockResolvedValue([{ startDate: '2026-08-13T09:00:00', sumQuantity: { unit: 'count', quantity: 55 } }])
  const hours = await getHourlySteps('2026-08-13')
  expect(hours[9].steps).toBe(55)
})

test('no HealthKit + a seeded day: the total is spread over a deterministic curve (dev fallback)', async () => {
  available.mockResolvedValue(false)
  upsertDailyMetrics([{ date: '2026-08-13', steps: 5000, distanceMeters: 3750 }], 't')
  const first = await getHourlySteps('2026-08-13')
  expect(first).toHaveLength(24)
  expect(first.reduce((a, h) => a + h.steps, 0)).toBe(5000) // bars sum to the headline number
  expect(first.slice(0, 6).every((h) => h.steps === 0)).toBe(true) // asleep hours stay empty
  expect(await getHourlySteps('2026-08-13')).toEqual(first) // deterministic — no render flicker
  expect(await getHourlySteps('2026-08-14')).toEqual(emptyHours()) // an unseeded day still reads as honest zeros

  // a different seeded day gets its own curve, not a copy of the 13th's
  upsertDailyMetrics([{ date: '2026-08-14', steps: 5000, distanceMeters: 3750 }], 't')
  const other = await getHourlySteps('2026-08-14')
  expect(other.reduce((a, h) => a + h.steps, 0)).toBe(5000)
  expect(other).not.toEqual(first)
})

test('no HealthKit + no data: honest zeros', async () => {
  available.mockResolvedValue(false)
  const hours = await getHourlySteps('2026-08-13')
  expect(hours).toHaveLength(24)
  expect(hours.every((h) => h.steps === 0)).toBe(true)
})
