import { act, renderHook } from '@testing-library/react-native'
import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { addEntry } from '../entries'
import { useEntries, useToday } from '../hooks'
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
