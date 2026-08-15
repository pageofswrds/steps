import { getDb } from './db/db'
import { todayKey } from './dates'
import { notify } from './emitter'
import { newId } from './ids'
import { deletePhotosForEntry, importPhotos } from './photos'

export interface EntryPhoto {
  id: string
  uri: string
  position: number
}

export interface Entry {
  id: string
  date: string
  text: string
  createdAt: string
  updatedAt: string
  photos: EntryPhoto[]
}

interface EntryRow {
  id: string
  date: string
  text: string
  created_at: string
  updated_at: string
}

function withPhotos(row: EntryRow): Entry {
  const photos = getDb().all<EntryPhoto>(
    'SELECT id, uri, position FROM entry_photos WHERE entry_id = ? ORDER BY position',
    [row.id],
  )
  return { id: row.id, date: row.date, text: row.text, createdAt: row.created_at, updatedAt: row.updated_at, photos }
}

export async function addEntry(input: { date?: string; text: string; photoUris?: string[] }): Promise<Entry> {
  const db = getDb()
  const id = newId()
  const now = new Date().toISOString()
  const date = input.date ?? todayKey()
  db.run('INSERT INTO entries (id, date, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [id, date, input.text, now, now])
  if (input.photoUris?.length) {
    const stored = await importPhotos(id, input.photoUris)
    stored.forEach((uri, position) => {
      db.run('INSERT INTO entry_photos (id, entry_id, uri, position) VALUES (?, ?, ?, ?)', [newId(), id, uri, position])
    })
  }
  notify('entries')
  return getEntry(id)!
}

export function updateEntry(id: string, patch: { date?: string; text?: string }): void {
  const db = getDb()
  const existing = db.get<EntryRow>('SELECT * FROM entries WHERE id = ?', [id])
  if (!existing) return
  db.run('UPDATE entries SET date = ?, text = ?, updated_at = ? WHERE id = ?', [
    patch.date ?? existing.date,
    patch.text ?? existing.text,
    new Date().toISOString(),
    id,
  ])
  notify('entries')
}

export function deleteEntry(id: string): void {
  getDb().run('DELETE FROM entries WHERE id = ?', [id])
  deletePhotosForEntry(id)
  notify('entries')
}

export function getEntry(id: string): Entry | undefined {
  const row = getDb().get<EntryRow>('SELECT * FROM entries WHERE id = ?', [id])
  return row ? withPhotos(row) : undefined
}

export function listEntries(range?: { start?: string; end?: string }): Entry[] {
  const where: string[] = []
  const params: string[] = []
  if (range?.start) {
    where.push('date >= ?')
    params.push(range.start)
  }
  if (range?.end) {
    where.push('date <= ?')
    params.push(range.end)
  }
  const sql = `SELECT * FROM entries ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY date DESC, created_at DESC`
  return getDb().all<EntryRow>(sql, params).map(withPhotos)
}
