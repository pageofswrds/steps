import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { addEntry, deleteEntry, getEntry, listEntries, updateEntry } from '../entries'
import { createTestDb } from './helpers/testDb'

jest.mock('../ids', () => {
  let n = 0
  return { newId: () => `id-${++n}` }
})

jest.mock('../photos', () => ({
  importPhotos: jest.fn(async (entryId: string, uris: string[]) => uris.map((u, i) => `stored://${entryId}/${i}`)),
  deletePhotosForEntry: jest.fn(),
}))

const photos = jest.requireMock('../photos')

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
  jest.clearAllMocks()
})

afterEach(() => setDbForTesting(null))

test('addEntry stores text, defaults date to today, and copies photos', async () => {
  const entry = await addEntry({ text: 'long walk', photoUris: ['ph://a', 'ph://b'] })
  expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(entry.photos.map((p) => p.uri)).toEqual([`stored://${entry.id}/0`, `stored://${entry.id}/1`])
  expect(getEntry(entry.id)?.text).toBe('long walk')
})

test('listEntries returns newest first and respects range', async () => {
  await addEntry({ date: '2026-08-01', text: 'a' })
  await addEntry({ date: '2026-08-10', text: 'b' })
  await addEntry({ date: '2026-08-05', text: 'c' })
  expect(listEntries().map((e) => e.text)).toEqual(['b', 'c', 'a'])
  expect(listEntries({ start: '2026-08-02', end: '2026-08-09' }).map((e) => e.text)).toEqual(['c'])
})

test('updateEntry patches text and bumps updatedAt', async () => {
  const e = await addEntry({ date: '2026-08-01', text: 'before' })
  updateEntry(e.id, { text: 'after' })
  const updated = getEntry(e.id)!
  expect(updated.text).toBe('after')
  expect(updated.updatedAt >= e.updatedAt).toBe(true)
})

test('deleteEntry removes row, photo rows, and photo files', async () => {
  const e = await addEntry({ date: '2026-08-01', text: 'x', photoUris: ['ph://a'] })
  deleteEntry(e.id)
  expect(getEntry(e.id)).toBeUndefined()
  expect(photos.deletePhotosForEntry).toHaveBeenCalledWith(e.id)
})
