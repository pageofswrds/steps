import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite'
import { migrate } from './migrations'

export type SqlParam = string | number | null

/** Minimal synchronous DB surface. Production wraps expo-sqlite; tests wrap better-sqlite3. */
export interface Db {
  exec(sql: string): void
  run(sql: string, params?: SqlParam[]): void
  all<T>(sql: string, params?: SqlParam[]): T[]
  get<T>(sql: string, params?: SqlParam[]): T | undefined
}

class ExpoDb implements Db {
  constructor(private readonly db: SQLiteDatabase) {}
  exec(sql: string): void {
    this.db.execSync(sql)
  }
  run(sql: string, params: SqlParam[] = []): void {
    this.db.runSync(sql, params)
  }
  all<T>(sql: string, params: SqlParam[] = []): T[] {
    return this.db.getAllSync<T>(sql, params)
  }
  get<T>(sql: string, params: SqlParam[] = []): T | undefined {
    return this.db.getFirstSync<T>(sql, params) ?? undefined
  }
}

let instance: Db | null = null

/** Opens (once), enables foreign keys, migrates, and returns the app database. */
export function getDb(): Db {
  if (!instance) {
    const raw = openDatabaseSync('steps.db')
    raw.execSync('PRAGMA foreign_keys = ON')
    const db = new ExpoDb(raw)
    migrate(db)
    instance = db
  }
  return instance
}

/** Test seam: swap the singleton for an in-memory Db (pass null to reset). */
export function setDbForTesting(db: Db | null): void {
  instance = db
}
