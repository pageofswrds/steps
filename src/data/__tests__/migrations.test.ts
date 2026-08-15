import { migrate } from '../db/migrations'
import { getMeta, setMeta } from '../meta'
import { createTestDb } from './helpers/testDb'

test('fresh migrate creates all tables and sets user_version', () => {
  const db = createTestDb()
  migrate(db)
  const tables = db
    .all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
    .map((r) => r.name)
  expect(tables).toEqual(expect.arrayContaining(['daily_metrics', 'workouts', 'entries', 'entry_photos', 'meta']))
  expect(db.get<{ user_version: number }>('PRAGMA user_version')?.user_version).toBe(1)
})

test('migrate is idempotent', () => {
  const db = createTestDb()
  migrate(db)
  migrate(db)
  expect(db.get<{ user_version: number }>('PRAGMA user_version')?.user_version).toBe(1)
})

test('deleting an entry cascades to entry_photos', () => {
  const db = createTestDb()
  migrate(db)
  db.run(`INSERT INTO entries (id, date, text, created_at, updated_at) VALUES ('e1', '2026-08-13', 'hi', 't', 't')`)
  db.run(`INSERT INTO entry_photos (id, entry_id, uri, position) VALUES ('p1', 'e1', 'file://x', 0)`)
  db.run(`DELETE FROM entries WHERE id = 'e1'`)
  expect(db.all(`SELECT * FROM entry_photos`)).toHaveLength(0)
})

test('meta get/set roundtrip', () => {
  const db = createTestDb()
  migrate(db)
  expect(getMeta(db, 'k')).toBeUndefined()
  setMeta(db, 'k', 'v1')
  setMeta(db, 'k', 'v2')
  expect(getMeta(db, 'k')).toBe('v2')
})
