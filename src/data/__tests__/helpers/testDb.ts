import Database from 'better-sqlite3'
import type { Db, SqlParam } from '../../db/db'

export function createTestDb(): Db {
  const raw = new Database(':memory:')
  raw.pragma('foreign_keys = ON')
  return {
    exec: (sql: string) => { raw.exec(sql) },
    run: (sql: string, params: SqlParam[] = []) => { raw.prepare(sql).run(...params) },
    all: <T>(sql: string, params: SqlParam[] = []) => raw.prepare(sql).all(...params) as T[],
    get: <T>(sql: string, params: SqlParam[] = []) => raw.prepare(sql).get(...params) as T | undefined,
  }
}
