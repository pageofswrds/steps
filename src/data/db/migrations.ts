import type { Db } from './db'

const migrations: ReadonlyArray<(db: Db) => void> = [
  (db) => {
    db.exec(`
      CREATE TABLE daily_metrics (
        date TEXT PRIMARY KEY,
        steps INTEGER NOT NULL DEFAULT 0,
        distance_meters REAL NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL
      );
      CREATE TABLE workouts (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        type TEXT NOT NULL,
        distance_meters REAL,
        duration_s REAL NOT NULL
      );
      CREATE INDEX idx_workouts_date ON workouts(date);
      CREATE TABLE entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_entries_date ON entries(date);
      CREATE TABLE entry_photos (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        uri TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_entry_photos_entry ON entry_photos(entry_id);
      CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
  },
]

export function migrate(db: Db): void {
  const current = db.get<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0
  for (let i = current; i < migrations.length; i++) {
    try {
      db.exec('BEGIN')
      migrations[i](db)
      db.exec(`PRAGMA user_version = ${i + 1}`)
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}
