import { act, renderHook } from '@testing-library/react-native'
import { isHealthDataAvailableAsync } from '@kingstinct/react-native-healthkit'
import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { addEntry } from '../entries'
import { useEntries, useHourlySteps, useToday } from '../hooks'
import { upsertDailyMetrics } from '../metrics'
import { todayKey } from '../dates'
import { createTestDb } from './helpers/testDb'

jest.mock('../ids', () => {
  let n = 0
  return { newId: () => `id-${++n}` }
})
jest.mock('../photos', () => ({
  importPhotos: jest.fn(async () => []),
  deletePhotosForEntry: jest.fn(),
}))

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

test('useEntries live-updates when an entry is added', async () => {
  const { result } = await renderHook(() => useEntries())
  expect(result.current).toHaveLength(0)
  await act(async () => {
    await addEntry({ text: 'hello' })
  })
  expect(result.current).toHaveLength(1)
  expect(result.current[0].text).toBe('hello')
})

test('useToday reflects synced metrics and defaults to zeros', async () => {
  const { result } = await renderHook(() => useToday())
  expect(result.current.steps).toBe(0)
  await act(() => {
    upsertDailyMetrics([{ date: todayKey(), steps: 777, distanceMeters: 500 }], 't')
  })
  expect(result.current.steps).toBe(777)
})

test('useHourlySteps returns 24 entries and refreshes when daily metrics change', async () => {
  ;(isHealthDataAvailableAsync as jest.Mock).mockResolvedValue(false) // the dev-fallback path
  const { result } = await renderHook(() => useHourlySteps(todayKey()))
  expect(result.current).toHaveLength(24)
  expect(result.current.every((h) => h.steps === 0)).toBe(true)
  await act(async () => {
    upsertDailyMetrics([{ date: todayKey(), steps: 4321, distanceMeters: 3241 }], 't')
    // let the hook's async re-query land
    await new Promise((r) => setTimeout(r, 0))
  })
  expect(result.current.reduce((a, h) => a + h.steps, 0)).toBe(4321)
})
