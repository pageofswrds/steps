# Step Tracker Visualizer Journal — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data foundation and plain starter UI for a step tracker + memory journal iOS app, per the approved spec at `docs/specs/2026-08-13-foundation-design.md`.

**Architecture:** Local-first: a sync layer pulls daily step/distance totals and walking workouts from HealthKit into SQLite; journal entries and photo copies live in the same DB; a small set of typed hooks (`src/data/index.ts`) is the only API the UI layer touches. Everything under `src/data/` is the tested foundation; everything under `app/` and `src/components/` is the owner's playground.

**Tech Stack:** Expo SDK 57, TypeScript (strict), expo-router, expo-sqlite, @kingstinct/react-native-healthkit (+ react-native-nitro-modules), expo-file-system, expo-image-picker, expo-image, react-native-svg, @shopify/react-native-skia, react-native-reanimated, jest-expo + better-sqlite3 (tests).

## Global Constraints

- Repo root is `/Users/benatky/armillary/repos/steps` — a standalone git repo already initialized on `main` with `docs/` committed. **No studio dependencies** (no daoUI, no commons imports).
- Expo SDK 57. iOS only for now. Bundle identifier `studio.zojer.steps`, app display name `Steps` (placeholder — renaming is the owner's first task).
- **All native deps are installed in Task 1** and never afterwards — later tasks are JS/TS only. Never suggest adding a native module in tasks 2+.
- The playground layer (`app/`, `src/components/`) imports from `src/data` (the public index) **only** — never from `src/data/<internal file>`.
- Starter UI is deliberately plain: system fonts, default colors, minimal inline styles. No styling libraries, no theming.
- Prose files authored here (markdown) use no hard line-wrapping: one line per paragraph or bullet.
- Tests cover the data layer only. No tests for screens/components, by design.
- Dates are local-time `YYYY-MM-DD` strings everywhere in the DB. Timestamps are ISO 8601 strings from `new Date().toISOString()`.
- Every commit message ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Verified third-party API facts (do not re-derive)

These were confirmed against `kingstinct/react-native-healthkit` master source (2026-08). If TypeScript disagrees after install, the installed version drifted — adapt **inside `src/data/health/healthkit.ts` only**, keeping the `HealthSource` interface unchanged:

- `requestAuthorization(toRequest: { toShare?: [...], toRead?: [...] }): Promise<boolean>`
- `getRequestStatusForAuthorization(toCheck: { toRead?: [...] }): Promise<AuthorizationRequestStatus>` — enum: `unknown = 0`, `shouldRequest = 1`, `unnecessary = 2`
- `isHealthDataAvailableAsync(): Promise<boolean>`
- `queryStatisticsCollectionForQuantity(identifier, statistics: readonly ('cumulativeSum' | ...)[], anchorDate: Date, intervalComponents: { day?: number, ... }, options?: { filter?: { date?: { startDate?: Date, endDate?: Date } }, unit?: string }): Promise<readonly QueryStatisticsResponse[]>` — each response has `sumQuantity?: { unit: string, quantity: number }`, `startDate?: Date`, `endDate?: Date`
- `queryWorkoutSamples(options: { limit: number, filter?: { date?: { startDate?: Date, endDate?: Date } }, ascending?: boolean }): Promise<WorkoutProxy[]>` — `limit: -1` fetches all; each proxy has `uuid`, `startDate: Date`, `endDate: Date`, `workoutActivityType: WorkoutActivityType` (enum; `walking = 52`, `hiking = 24`), `duration: { unit, quantity }`, `totalDistance?: { unit, quantity }`, and `.toJSON()` returning a plain object
- Read-type identifiers: `'HKQuantityTypeIdentifierStepCount'`, `'HKQuantityTypeIdentifierDistanceWalkingRunning'`, `'HKWorkoutTypeIdentifier'`
- All of the above import from `@kingstinct/react-native-healthkit` (package root), including the `AuthorizationRequestStatus` and `WorkoutActivityType` enums.
- expo-file-system SDK 57 uses the class API: `import { Directory, File, Paths } from 'expo-file-system'`; `new Directory(Paths.document, 'photos')`, `dir.create({ intermediates: true })`, `dir.exists`, `dir.delete()`, `new File(dir, name)`, `srcFile.copy(destFile)`, `file.uri`.

## File Structure

```
app/                          # expo-router routes — the playground
  _layout.tsx                 # root Stack; DB init; sync triggers (launch + foreground)
  index.tsx                   # redirect: welcome on first run, else tabs
  welcome.tsx                 # one-time permission/welcome screen
  settings.tsx                # sync status, connect-health button, __DEV__ seed button
  entry/new.tsx               # add-entry modal (date picker, text, photos)
  entry/[id].tsx              # entry detail: view, edit text, delete
  day/[date].tsx              # day detail: metrics + that day's entries
  (tabs)/_layout.tsx          # Today / Journal / Days tab bar
  (tabs)/today.tsx
  (tabs)/journal.tsx
  (tabs)/days.tsx
src/components/
  BarChart.tsx                # heavily commented SVG bar chart template
src/data/
  index.ts                    # PUBLIC API — the only import surface for the playground
  db/db.ts                    # Db interface, expo-sqlite impl, singleton + setDbForTesting
  db/migrations.ts            # user_version runner + migration list (v1 schema)
  dates.ts                    # local-date helpers (dateKey, todayKey, addDays, lastNDateKeys)
  meta.ts                     # key-value meta helpers over the meta table
  ids.ts                      # newId() via expo-crypto (mockable seam)
  emitter.ts                  # table-keyed change emitter
  photos.ts                   # copy picked photos into documents dir; delete per entry
  entries.ts                  # entry CRUD
  metrics.ts                  # daily_metrics + workouts upserts/reads
  seed.ts                     # dev-only fake-data generator
  health/types.ts             # HealthSource interface + row types
  health/healthkit.ts         # the ONLY file touching @kingstinct/react-native-healthkit
  sync.ts                     # syncHealth() engine
  hooks.ts                    # useDailySteps, useToday, useEntries, useEntry, useWorkouts, useSyncStatus
src/data/__tests__/
  helpers/testDb.ts           # better-sqlite3-backed Db for tests
  migrations.test.ts
  emitter.test.ts
  dates.test.ts
  entries.test.ts
  metrics.test.ts
  seed.test.ts
  sync.test.ts
  hooks.test.tsx
CLAUDE.md                     # written for the owner (Task 13)
README.md
```

---

### Task 1: Scaffold the Expo app, install all native deps, wire test harness

**Files:**
- Create: entire Expo app skeleton at repo root (template files), `app.json`, `package.json`, `.gitignore`, `tsconfig.json`, `jest.config.js`
- Keep: existing `docs/` and `.git/`

**Interfaces:**
- Produces: a bootable Expo SDK 57 + expo-router + TypeScript app with every native dep installed, `npm test` (jest-expo) green on an empty suite, `npx tsc --noEmit` green.

- [ ] **Step 1: Scaffold into the existing repo**

`create-expo-app` refuses non-empty dirs, so scaffold in scratch and copy in (the default template ships SDK 57 + expo-router + TypeScript):

```bash
cd /private/tmp/claude-501/-Users-benatky-armillary/931ffaf8-9e4e-45d3-8daa-3d90f6342829/scratchpad
npx create-expo-app@latest steps-scaffold --template default --no-install
rsync -a --exclude .git steps-scaffold/ /Users/benatky/armillary/repos/steps/
cd /Users/benatky/armillary/repos/steps && npm install
```

- [ ] **Step 2: Reset the template to a blank slate**

The default template ships example screens. Run its own reset script, which moves examples out and leaves a minimal `app/`:

```bash
node scripts/reset-project.js --no-example 2>/dev/null || npm run reset-project
rm -rf app-example scripts/reset-project.js
```

If the reset script prompts, answer "n" to keeping the example. Afterwards `app/` should contain only `_layout.tsx` and `index.tsx`.

- [ ] **Step 3: Install every dependency (the one and only native-install moment)**

```bash
npx expo install expo-sqlite expo-image expo-image-picker expo-file-system expo-crypto expo-haptics react-native-svg react-native-reanimated react-native-gesture-handler @react-native-community/datetimepicker @shopify/react-native-skia
npx expo install @kingstinct/react-native-healthkit react-native-nitro-modules
npm install -D jest jest-expo @types/jest better-sqlite3 @types/better-sqlite3 @testing-library/react-native react-test-renderer
```

(`expo install` picks SDK-57-compatible versions; it passes through packages it doesn't pin.)

- [ ] **Step 4: Configure app.json**

Merge into the generated `app.json` (keep template values not mentioned here):

```json
{
  "expo": {
    "name": "Steps",
    "slug": "steps",
    "scheme": "steps",
    "newArchEnabled": true,
    "ios": {
      "bundleIdentifier": "studio.zojer.steps",
      "supportsTablet": false
    },
    "plugins": [
      "expo-router",
      [
        "@kingstinct/react-native-healthkit",
        {
          "NSHealthShareUsageDescription": "Steps reads your step count, walking distance, and walking workouts to show your activity and let you journal about it.",
          "background": false
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Steps lets you attach photos from your library to journal entries."
        }
      ]
    ]
  }
}
```

- [ ] **Step 5: Configure jest**

Create `jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo/ios',
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@kingstinct/.*|react-native-nitro-modules))',
  ],
}
```

Add to `package.json` scripts: `"test": "jest"`.

- [ ] **Step 6: Ensure .gitignore covers generated native dirs**

Append to `.gitignore` if not present (CNG: native projects are generated, never committed):

```
/ios
/android
```

- [ ] **Step 7: Verify**

```bash
npx tsc --noEmit
npx jest --passWithNoTests
npx expo-doctor
```

Expected: tsc silent; jest reports no tests, exit 0; expo-doctor all checks pass (warnings about unpinned non-Expo packages are acceptable; failures are not).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Expo SDK 57 app with all native deps and jest harness"
```

---

### Task 2: Db core — interface, expo-sqlite impl, migrations v1, dates util, meta helpers

**Files:**
- Create: `src/data/db/db.ts`, `src/data/db/migrations.ts`, `src/data/dates.ts`, `src/data/meta.ts`, `src/data/__tests__/helpers/testDb.ts`, `src/data/__tests__/migrations.test.ts`, `src/data/__tests__/dates.test.ts`

**Interfaces:**
- Produces:
  - `interface Db { exec(sql: string): void; run(sql: string, params?: SqlParam[]): void; all<T>(sql: string, params?: SqlParam[]): T[]; get<T>(sql: string, params?: SqlParam[]): T | undefined }` where `type SqlParam = string | number | null`
  - `getDb(): Db` (opens `steps.db`, enables foreign keys, migrates, memoizes), `setDbForTesting(db: Db | null): void`
  - `migrate(db: Db): void`
  - `dateKey(d: Date): string`, `todayKey(): string`, `addDays(d: Date, n: number): Date`, `startOfDay(d: Date): Date`, `lastNDateKeys(n: number, from?: Date): string[]` (ascending, ends at `from`)
  - `getMeta(db: Db, key: string): string | undefined`, `setMeta(db: Db, key: string, value: string): void`
  - Test helper `createTestDb(): Db` (in-memory better-sqlite3, foreign keys on, **not** migrated — tests call `migrate` themselves)

- [ ] **Step 1: Write failing tests**

`src/data/__tests__/helpers/testDb.ts`:

```ts
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
```

`src/data/__tests__/migrations.test.ts`:

```ts
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
```

`src/data/__tests__/dates.test.ts`:

```ts
import { addDays, dateKey, lastNDateKeys, startOfDay } from '../dates'

test('dateKey formats local YYYY-MM-DD with padding', () => {
  expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
})

test('addDays crosses month boundaries', () => {
  expect(dateKey(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
})

test('lastNDateKeys returns n ascending keys ending at from', () => {
  const keys = lastNDateKeys(3, new Date(2026, 7, 13))
  expect(keys).toEqual(['2026-08-11', '2026-08-12', '2026-08-13'])
})

test('startOfDay zeroes the time', () => {
  const d = startOfDay(new Date(2026, 7, 13, 17, 45))
  expect(d.getHours()).toBe(0)
  expect(dateKey(d)).toBe('2026-08-13')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/data/__tests__/migrations.test.ts src/data/__tests__/dates.test.ts`
Expected: FAIL — cannot find modules `../db/migrations`, `../meta`, `../dates`, `../../db/db`.

- [ ] **Step 3: Implement**

`src/data/db/db.ts`:

```ts
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
```

`src/data/db/migrations.ts`:

```ts
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
    migrations[i](db)
    db.exec(`PRAGMA user_version = ${i + 1}`)
  }
}
```

`src/data/dates.ts`:

```ts
/** Local-time date key, e.g. 2026-08-13. All DB dates use this format. */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(): string {
  return dateKey(new Date())
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** n date keys ascending, ending at `from` (inclusive). */
export function lastNDateKeys(n: number, from: Date = new Date()): string[] {
  const keys: string[] = []
  for (let i = n - 1; i >= 0; i--) keys.push(dateKey(addDays(from, -i)))
  return keys
}
```

`src/data/meta.ts`:

```ts
import type { Db } from './db/db'

export function getMeta(db: Db, key: string): string | undefined {
  return db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key])?.value
}

export function setMeta(db: Db, key: string, value: string): void {
  db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/data/__tests__/migrations.test.ts src/data/__tests__/dates.test.ts`
Expected: PASS (8 tests). Also run `npx tsc --noEmit` — clean.

- [ ] **Step 5: Commit**

```bash
git add src/data jest.config.js
git commit -m "feat: db core — Db interface, migrations v1, dates util, meta helpers"
```

---

### Task 3: Change emitter

**Files:**
- Create: `src/data/emitter.ts`, `src/data/__tests__/emitter.test.ts`

**Interfaces:**
- Produces: `subscribe(table: string, listener: () => void): () => void` (returns unsubscribe), `notify(...tables: string[]): void`. Table names used across the app: `'daily_metrics'`, `'workouts'`, `'entries'`, `'meta'`.

- [ ] **Step 1: Write failing test**

`src/data/__tests__/emitter.test.ts`:

```ts
import { notify, subscribe } from '../emitter'

test('notify fires only listeners for the named tables', () => {
  const hits: string[] = []
  subscribe('entries', () => hits.push('entries'))
  subscribe('workouts', () => hits.push('workouts'))
  notify('entries')
  expect(hits).toEqual(['entries'])
  notify('entries', 'workouts')
  expect(hits).toEqual(['entries', 'entries', 'workouts'])
})

test('unsubscribe stops notifications', () => {
  let count = 0
  const unsub = subscribe('meta', () => count++)
  notify('meta')
  unsub()
  notify('meta')
  expect(count).toBe(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/__tests__/emitter.test.ts`
Expected: FAIL — module `../emitter` not found.

- [ ] **Step 3: Implement**

`src/data/emitter.ts`:

```ts
type Listener = () => void

const listeners = new Map<string, Set<Listener>>()

/** Subscribe to changes on a table. Returns an unsubscribe function. */
export function subscribe(table: string, listener: Listener): () => void {
  let set = listeners.get(table)
  if (!set) {
    set = new Set()
    listeners.set(table, set)
  }
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}

/** Called by the data layer after writes so hooks re-query. */
export function notify(...tables: string[]): void {
  for (const table of tables) {
    listeners.get(table)?.forEach((l) => l())
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/data/__tests__/emitter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/emitter.ts src/data/__tests__/emitter.test.ts
git commit -m "feat: table-keyed change emitter"
```

---

### Task 4: Ids and photo store

**Files:**
- Create: `src/data/ids.ts`, `src/data/photos.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `newId(): string` — UUID via expo-crypto. Tests in later tasks mock this module.
  - `importPhotos(entryId: string, sourceUris: string[]): Promise<string[]>` — copies each source file into `<documents>/photos/<entryId>/<index>-<basename>`, returns stored URIs in input order. A failed copy is skipped (entry still saves; spec § error handling) — the returned array simply omits it.
  - `deletePhotosForEntry(entryId: string): void` — removes the entry's photo directory if present.

No unit tests: both files are thin wrappers over native modules (expo-crypto, expo-file-system) and are exercised on-device; consumers mock them. This task still gets its own commit because later tasks' tests depend on these exact signatures.

- [ ] **Step 1: Implement**

`src/data/ids.ts`:

```ts
import * as Crypto from 'expo-crypto'

export function newId(): string {
  return Crypto.randomUUID()
}
```

`src/data/photos.ts`:

```ts
import { Directory, File, Paths } from 'expo-file-system'

function entryDir(entryId: string): Directory {
  return new Directory(Paths.document, 'photos', entryId)
}

/**
 * Copies picked photos into the app's own storage so the journal keeps its
 * memories even if the originals are deleted from the photo library.
 * Returns the stored URIs. A photo that fails to copy is skipped.
 */
export async function importPhotos(entryId: string, sourceUris: string[]): Promise<string[]> {
  const dir = entryDir(entryId)
  if (!dir.exists) dir.create({ intermediates: true })
  const stored: string[] = []
  sourceUris.forEach((uri, index) => {
    try {
      const src = new File(uri)
      const dest = new File(dir, `${index}-${src.name}`)
      src.copy(dest)
      stored.push(dest.uri)
    } catch (e) {
      console.warn(`photo copy failed, skipping: ${uri}`, e)
    }
  })
  return stored
}

/** Deletes all photo files belonging to an entry. */
export function deletePhotosForEntry(entryId: string): void {
  const dir = entryDir(entryId)
  if (dir.exists) dir.delete()
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean. (If the expo-file-system class API differs on the installed version — e.g. `Directory` constructor arity — fix inside `photos.ts` only, keeping the exported signatures.)

- [ ] **Step 3: Commit**

```bash
git add src/data/ids.ts src/data/photos.ts
git commit -m "feat: id generation and photo store (copy-in, delete-per-entry)"
```

---

### Task 5: Entries CRUD

**Files:**
- Create: `src/data/entries.ts`, `src/data/__tests__/entries.test.ts`

**Interfaces:**
- Consumes: `getDb`/`setDbForTesting`/`migrate` (Task 2), `todayKey` (Task 2), `notify` (Task 3), `newId` (Task 4), `importPhotos`/`deletePhotosForEntry` (Task 4).
- Produces:
  - `interface EntryPhoto { id: string; uri: string; position: number }`
  - `interface Entry { id: string; date: string; text: string; createdAt: string; updatedAt: string; photos: EntryPhoto[] }`
  - `addEntry(input: { date?: string; text: string; photoUris?: string[] }): Promise<Entry>` — date defaults to today; copies photos via the photo store.
  - `updateEntry(id: string, patch: { date?: string; text?: string }): void` — bumps `updatedAt`; no-op if entry missing.
  - `deleteEntry(id: string): void` — deletes row (photos rows cascade) and photo files.
  - `getEntry(id: string): Entry | undefined`
  - `listEntries(range?: { start?: string; end?: string }): Entry[]` — newest first (by date desc, then createdAt desc); range bounds inclusive on `date`.
  - All writes `notify('entries')`.

- [ ] **Step 1: Write failing tests**

`src/data/__tests__/entries.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/data/__tests__/entries.test.ts`
Expected: FAIL — module `../entries` not found.

- [ ] **Step 3: Implement**

`src/data/entries.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/data/__tests__/entries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/entries.ts src/data/__tests__/entries.test.ts
git commit -m "feat: entry CRUD with photo import and cleanup"
```

---

### Task 6: Metrics store and seed generator

**Files:**
- Create: `src/data/metrics.ts`, `src/data/seed.ts`, `src/data/__tests__/metrics.test.ts`, `src/data/__tests__/seed.test.ts`

**Interfaces:**
- Consumes: Db core (Task 2), emitter (Task 3).
- Produces:
  - `interface DailyMetric { date: string; steps: number; distanceMeters: number }`
  - `interface WorkoutRow { id: string; date: string; start: string; end: string; type: string; distanceMeters: number | null; durationS: number }`
  - `upsertDailyMetrics(rows: DailyMetric[], syncedAt: string): void` — insert-or-replace by date; notifies `'daily_metrics'`.
  - `getDailyMetrics(range: { start: string; end: string }): DailyMetric[]` — **gap-filled**: one row per calendar day in the range (ascending), zeros where no data.
  - `upsertWorkouts(rows: WorkoutRow[]): void` — insert-or-replace by id; notifies `'workouts'`.
  - `getWorkouts(range: { start: string; end: string }): WorkoutRow[]` — newest first by `start`.
  - `seedFakeData(days?: number): void` (default 365) — plausible step data ending today; marks `meta.seeded = '1'`; notifies via the upsert functions.

- [ ] **Step 1: Write failing tests**

`src/data/__tests__/metrics.test.ts`:

```ts
import { setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { getDailyMetrics, getWorkouts, upsertDailyMetrics, upsertWorkouts } from '../metrics'
import { createTestDb } from './helpers/testDb'

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

test('upsert replaces by date; getDailyMetrics gap-fills the range ascending', () => {
  upsertDailyMetrics([{ date: '2026-08-11', steps: 100, distanceMeters: 80 }], 't1')
  upsertDailyMetrics([{ date: '2026-08-11', steps: 250, distanceMeters: 200 }], 't2')
  const rows = getDailyMetrics({ start: '2026-08-10', end: '2026-08-12' })
  expect(rows).toEqual([
    { date: '2026-08-10', steps: 0, distanceMeters: 0 },
    { date: '2026-08-11', steps: 250, distanceMeters: 200 },
    { date: '2026-08-12', steps: 0, distanceMeters: 0 },
  ])
})

test('workouts upsert by id and read newest first', () => {
  const w = (id: string, start: string) => ({ id, date: start.slice(0, 10), start, end: start, type: 'walking', distanceMeters: 1000, durationS: 600 })
  upsertWorkouts([w('a', '2026-08-01T10:00:00.000Z'), w('b', '2026-08-02T10:00:00.000Z')])
  upsertWorkouts([w('a', '2026-08-01T10:00:00.000Z')])
  const rows = getWorkouts({ start: '2026-08-01', end: '2026-08-02' })
  expect(rows.map((r) => r.id)).toEqual(['b', 'a'])
})
```

`src/data/__tests__/seed.test.ts`:

```ts
import { getDb, setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import { getMeta } from '../meta'
import { seedFakeData } from '../seed'
import { createTestDb } from './helpers/testDb'

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

test('seeds one plausible row per day and marks meta', () => {
  seedFakeData(30)
  const rows = getDb().all<{ steps: number }>('SELECT steps FROM daily_metrics')
  expect(rows).toHaveLength(30)
  for (const r of rows) {
    expect(r.steps).toBeGreaterThanOrEqual(0)
    expect(r.steps).toBeLessThan(40000)
  }
  expect(getMeta(getDb(), 'seeded')).toBe('1')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/data/__tests__/metrics.test.ts src/data/__tests__/seed.test.ts`
Expected: FAIL — modules `../metrics`, `../seed` not found.

- [ ] **Step 3: Implement**

`src/data/metrics.ts`:

```ts
import { getDb } from './db/db'
import { addDays, dateKey } from './dates'
import { notify } from './emitter'

export interface DailyMetric {
  date: string
  steps: number
  distanceMeters: number
}

export interface WorkoutRow {
  id: string
  date: string
  start: string
  end: string
  type: string
  distanceMeters: number | null
  durationS: number
}

export function upsertDailyMetrics(rows: DailyMetric[], syncedAt: string): void {
  const db = getDb()
  for (const r of rows) {
    db.run(
      `INSERT INTO daily_metrics (date, steps, distance_meters, synced_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET steps = excluded.steps, distance_meters = excluded.distance_meters, synced_at = excluded.synced_at`,
      [r.date, r.steps, r.distanceMeters, syncedAt],
    )
  }
  if (rows.length) notify('daily_metrics')
}

/** One row per calendar day in [start, end], ascending; zeros where nothing is stored. */
export function getDailyMetrics(range: { start: string; end: string }): DailyMetric[] {
  const stored = new Map(
    getDb()
      .all<{ date: string; steps: number; distance_meters: number }>(
        'SELECT date, steps, distance_meters FROM daily_metrics WHERE date >= ? AND date <= ?',
        [range.start, range.end],
      )
      .map((r) => [r.date, r]),
  )
  const out: DailyMetric[] = []
  // Date keys are local dates; parse at noon to dodge DST edges.
  let cursor = new Date(`${range.start}T12:00:00`)
  const last = range.end
  while (dateKey(cursor) <= last) {
    const key = dateKey(cursor)
    const row = stored.get(key)
    out.push({ date: key, steps: row?.steps ?? 0, distanceMeters: row?.distance_meters ?? 0 })
    cursor = addDays(cursor, 1)
  }
  return out
}

export function upsertWorkouts(rows: WorkoutRow[]): void {
  const db = getDb()
  for (const w of rows) {
    db.run(
      `INSERT INTO workouts (id, date, start, end, type, distance_meters, duration_s) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET date = excluded.date, start = excluded.start, end = excluded.end, type = excluded.type, distance_meters = excluded.distance_meters, duration_s = excluded.duration_s`,
      [w.id, w.date, w.start, w.end, w.type, w.distanceMeters, w.durationS],
    )
  }
  if (rows.length) notify('workouts')
}

export function getWorkouts(range: { start: string; end: string }): WorkoutRow[] {
  return getDb()
    .all<{ id: string; date: string; start: string; end: string; type: string; distance_meters: number | null; duration_s: number }>(
      'SELECT * FROM workouts WHERE date >= ? AND date <= ? ORDER BY start DESC',
      [range.start, range.end],
    )
    .map((r) => ({ id: r.id, date: r.date, start: r.start, end: r.end, type: r.type, distanceMeters: r.distance_meters, durationS: r.duration_s }))
}
```

`src/data/seed.ts`:

```ts
import { getDb } from './db/db'
import { addDays, dateKey } from './dates'
import { setMeta } from './meta'
import { upsertDailyMetrics, type DailyMetric } from './metrics'

/**
 * Dev-only: fills daily_metrics with a plausible year of fake steps so the
 * simulator is useful without a phone. Weekends trend higher; there's a slow
 * seasonal wave and daily noise. Safe to run repeatedly (upserts by date).
 */
export function seedFakeData(days = 365): void {
  const today = new Date()
  const rows: DailyMetric[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const seasonal = Math.sin((i / 365) * Math.PI * 2) * 2000
    const noise = Math.random() * 5000
    const steps = Math.max(0, Math.round(6000 + seasonal + noise + (weekend ? 3000 : 0)))
    rows.push({ date: dateKey(d), steps, distanceMeters: Math.round(steps * 0.75) })
  }
  upsertDailyMetrics(rows, new Date().toISOString())
  setMeta(getDb(), 'seeded', '1')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/data/__tests__/metrics.test.ts src/data/__tests__/seed.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/metrics.ts src/data/seed.ts src/data/__tests__/metrics.test.ts src/data/__tests__/seed.test.ts
git commit -m "feat: daily metrics + workouts store, dev seed generator"
```

---

### Task 7: Health source interface, HealthKit adapter, sync engine

**Files:**
- Create: `src/data/health/types.ts`, `src/data/health/healthkit.ts`, `src/data/sync.ts`, `src/data/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: Db core + meta + dates (Task 2), emitter (Task 3), metrics store (Task 6).
- Produces:
  - `interface HealthDailyTotal { date: string; steps: number; distanceMeters: number }`
  - `interface HealthWorkout { id: string; date: string; start: string; end: string; type: 'walking' | 'hiking'; distanceMeters: number | null; durationS: number }`
  - `interface HealthSource { isAvailable(): Promise<boolean>; permissionStatus(): Promise<'shouldRequest' | 'requested'>; requestPermissions(): Promise<void>; getDailyTotals(start: Date, end: Date): Promise<HealthDailyTotal[]>; getWorkouts(start: Date, end: Date): Promise<HealthWorkout[]> }`
  - `healthKitSource: HealthSource` (the real adapter; **only** file importing the healthkit package)
  - `type SyncStatus = 'ok' | 'unavailable' | 'permission-needed' | 'error'`
  - `syncHealth(options?: { requestPermissionIfNeeded?: boolean; source?: HealthSource }): Promise<{ status: SyncStatus }>`
  - Meta keys written by sync: `first_sync_done` (`'1'`), `last_synced_at` (ISO string), `permission_state` (`'shouldRequest' | 'requested'`). Sync notifies `'meta'` (stores notify their own tables).

- [ ] **Step 1: Write failing tests**

`src/data/__tests__/sync.test.ts`:

```ts
import { getDb, setDbForTesting } from '../db/db'
import { migrate } from '../db/migrations'
import type { HealthSource } from '../health/types'
import { getMeta } from '../meta'
import { getDailyMetrics } from '../metrics'
import { syncHealth } from '../sync'
import { createTestDb } from './helpers/testDb'

function fakeSource(overrides: Partial<HealthSource> = {}): HealthSource & { calls: { start: Date; end: Date }[] } {
  const calls: { start: Date; end: Date }[] = []
  return {
    calls,
    isAvailable: async () => true,
    permissionStatus: async () => 'requested' as const,
    requestPermissions: async () => {},
    getDailyTotals: async (start: Date, end: Date) => {
      calls.push({ start, end })
      return [{ date: '2026-08-13', steps: 1234, distanceMeters: 900 }]
    },
    getWorkouts: async () => [
      { id: 'w1', date: '2026-08-13', start: '2026-08-13T09:00:00.000Z', end: '2026-08-13T10:00:00.000Z', type: 'walking' as const, distanceMeters: 4000, durationS: 3600 },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  const db = createTestDb()
  migrate(db)
  setDbForTesting(db)
})
afterEach(() => setDbForTesting(null))

const daySpan = (c: { start: Date; end: Date }) => Math.round((c.end.getTime() - c.start.getTime()) / 86400000)

test('first sync backfills ~365 days, later syncs ~90, and data lands', async () => {
  const source = fakeSource()
  expect((await syncHealth({ source })).status).toBe('ok')
  expect(daySpan(source.calls[0])).toBeGreaterThanOrEqual(364)
  expect((await syncHealth({ source })).status).toBe('ok')
  expect(daySpan(source.calls[1])).toBeLessThanOrEqual(91)
  const today = getDailyMetrics({ start: '2026-08-13', end: '2026-08-13' })[0]
  expect(today.steps).toBe(1234)
  expect(getMeta(getDb(), 'first_sync_done')).toBe('1')
  expect(getMeta(getDb(), 'last_synced_at')).toBeTruthy()
})

test('re-sync is idempotent (no duplicate rows)', async () => {
  const source = fakeSource()
  await syncHealth({ source })
  await syncHealth({ source })
  const all = getDb().all('SELECT * FROM daily_metrics')
  expect(all).toHaveLength(1)
  expect(getDb().all('SELECT * FROM workouts')).toHaveLength(1)
})

test('permission-needed: does not query, records state, unless asked to request', async () => {
  let asked = false
  const source = fakeSource({
    permissionStatus: async () => (asked ? ('requested' as const) : ('shouldRequest' as const)),
    requestPermissions: async () => {
      asked = true
    },
  })
  expect((await syncHealth({ source })).status).toBe('permission-needed')
  expect(source.calls).toHaveLength(0)
  expect(getMeta(getDb(), 'permission_state')).toBe('shouldRequest')
  expect((await syncHealth({ source, requestPermissionIfNeeded: true })).status).toBe('ok')
  expect(getMeta(getDb(), 'permission_state')).toBe('requested')
})

test('unavailable and error statuses', async () => {
  expect((await syncHealth({ source: fakeSource({ isAvailable: async () => false }) })).status).toBe('unavailable')
  const failing = fakeSource({
    getDailyTotals: async () => {
      throw new Error('boom')
    },
  })
  expect((await syncHealth({ source: failing })).status).toBe('error')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/data/__tests__/sync.test.ts`
Expected: FAIL — modules `../health/types`, `../sync` not found.

- [ ] **Step 3: Implement**

`src/data/health/types.ts`:

```ts
export interface HealthDailyTotal {
  date: string
  steps: number
  distanceMeters: number
}

export interface HealthWorkout {
  id: string
  date: string
  start: string
  end: string
  type: 'walking' | 'hiking'
  distanceMeters: number | null
  durationS: number
}

/** Narrow seam over Apple Health. The app only ever talks to this interface. */
export interface HealthSource {
  isAvailable(): Promise<boolean>
  /** HealthKit never reveals read denial — only whether asking would show the sheet. */
  permissionStatus(): Promise<'shouldRequest' | 'requested'>
  requestPermissions(): Promise<void>
  getDailyTotals(start: Date, end: Date): Promise<HealthDailyTotal[]>
  getWorkouts(start: Date, end: Date): Promise<HealthWorkout[]>
}
```

`src/data/health/healthkit.ts`:

```ts
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
    { filter: { date: { startDate: start, endDate: end } }, unit },
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
```

`src/data/sync.ts`:

```ts
import { getDb } from './db/db'
import { addDays, startOfDay } from './dates'
import { notify } from './emitter'
import { healthKitSource } from './health/healthkit'
import type { HealthSource } from './health/types'
import { getMeta, setMeta } from './meta'
import { upsertDailyMetrics, upsertWorkouts } from './metrics'

export type SyncStatus = 'ok' | 'unavailable' | 'permission-needed' | 'error'

const BACKFILL_DAYS = 365
const WINDOW_DAYS = 90

/**
 * Pulls daily totals + walking/hiking workouts from Apple Health into SQLite.
 * Idempotent: upserts by date/id, so re-running is always safe.
 */
export async function syncHealth(options?: { requestPermissionIfNeeded?: boolean; source?: HealthSource }): Promise<{ status: SyncStatus }> {
  const source = options?.source ?? healthKitSource
  const db = getDb()
  try {
    if (!(await source.isAvailable())) return { status: 'unavailable' }

    let permission = await source.permissionStatus()
    if (permission === 'shouldRequest' && options?.requestPermissionIfNeeded) {
      await source.requestPermissions()
      permission = await source.permissionStatus()
    }
    setMeta(db, 'permission_state', permission)
    if (permission === 'shouldRequest') {
      notify('meta')
      return { status: 'permission-needed' }
    }

    const days = getMeta(db, 'first_sync_done') === '1' ? WINDOW_DAYS : BACKFILL_DAYS
    const end = new Date()
    const start = startOfDay(addDays(end, -(days - 1)))

    const totals = await source.getDailyTotals(start, end)
    upsertDailyMetrics(totals, new Date().toISOString())
    upsertWorkouts(await source.getWorkouts(start, end))

    setMeta(db, 'first_sync_done', '1')
    setMeta(db, 'last_synced_at', new Date().toISOString())
    notify('meta')
    return { status: 'ok' }
  } catch (e) {
    console.warn('health sync failed; keeping last-known data', e)
    return { status: 'error' }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/data/__tests__/sync.test.ts`
Expected: PASS (4 tests). Note the fake-source tests never import the healthkit package… except transitively via `sync.ts` → `healthkit.ts`. If jest chokes on that import chain (nitro modules in node env), add to `jest.config.js`: `moduleNameMapper: { '^@kingstinct/react-native-healthkit$': '<rootDir>/src/data/__tests__/helpers/healthkitStub.ts' }` and create that stub exporting the named functions as `jest.fn()` plus both enums (`AuthorizationRequestStatus = { unknown: 0, shouldRequest: 1, unnecessary: 2 }`, `WorkoutActivityType = { walking: 52, hiking: 24 }`).

Also run `npx tsc --noEmit` — the adapter must compile against the installed library types. If a name drifted from the "Verified third-party API facts" section, fix it inside `healthkit.ts` only.

- [ ] **Step 5: Commit**

```bash
git add src/data/health src/data/sync.ts src/data/__tests__ jest.config.js
git commit -m "feat: HealthKit adapter behind HealthSource seam, idempotent sync engine"
```

---

### Task 8: Hooks and the public API index

**Files:**
- Create: `src/data/hooks.ts`, `src/data/index.ts`, `src/data/__tests__/hooks.test.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces (each hook re-renders on writes to its tables, via the emitter):
  - `useDailySteps(range: { start: string; end: string }): DailyMetric[]`
  - `useToday(): DailyMetric`
  - `useEntries(range?: { start?: string; end?: string }): Entry[]`
  - `useEntry(id: string): Entry | undefined`
  - `useWorkouts(range: { start: string; end: string }): WorkoutRow[]`
  - `useSyncStatus(): { lastSyncedAt: string | null; permissionState: 'unknown' | 'shouldRequest' | 'requested' }`
  - `src/data/index.ts` re-exports the entire public surface: all hooks, `addEntry`, `updateEntry`, `deleteEntry`, `getEntry`, `listEntries`, `syncHealth`, `seedFakeData`, `getDb`, `getMeta`, `setMeta`, `todayKey`, `dateKey`, `addDays`, `lastNDateKeys`, and the types `Entry`, `EntryPhoto`, `DailyMetric`, `WorkoutRow`, `SyncStatus`.

- [ ] **Step 1: Write failing test**

`src/data/__tests__/hooks.test.tsx`:

```tsx
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
  const { result } = renderHook(() => useEntries())
  expect(result.current).toHaveLength(0)
  await act(async () => {
    await addEntry({ text: 'hello' })
  })
  expect(result.current).toHaveLength(1)
  expect(result.current[0].text).toBe('hello')
})

test('useToday reflects synced metrics and defaults to zeros', () => {
  const { result } = renderHook(() => useToday())
  expect(result.current.steps).toBe(0)
  act(() => {
    upsertDailyMetrics([{ date: todayKey(), steps: 777, distanceMeters: 500 }], 't')
  })
  expect(result.current.steps).toBe(777)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/data/__tests__/hooks.test.tsx`
Expected: FAIL — module `../hooks` not found.

- [ ] **Step 3: Implement**

`src/data/hooks.ts` (every hook gets a doc comment with a usage example — these comments are the owner's API documentation; write them all, as shown for the first two):

```tsx
import { useEffect, useState } from 'react'
import { getDb } from './db/db'
import { todayKey } from './dates'
import { subscribe } from './emitter'
import { getEntry, listEntries, type Entry } from './entries'
import { getMeta } from './meta'
import { getDailyMetrics, getWorkouts, type DailyMetric, type WorkoutRow } from './metrics'

/** Core plumbing: run a query now, re-run it whenever any of `tables` changes. */
function useLiveQuery<T>(tables: string[], query: () => T, deps: unknown[]): T {
  const [value, setValue] = useState(query)
  useEffect(() => {
    setValue(query())
    const unsubs = tables.map((t) => subscribe(t, () => setValue(query())))
    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

/**
 * Daily step + distance rows for a date range, one row per day (zeros for
 * days with no data), oldest first.
 *
 * ```tsx
 * const week = useDailySteps({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
 * ```
 */
export function useDailySteps(range: { start: string; end: string }): DailyMetric[] {
  return useLiveQuery(['daily_metrics'], () => getDailyMetrics(range), [range.start, range.end])
}

/**
 * Today's steps and distance. Updates automatically after every Health sync.
 *
 * ```tsx
 * const today = useToday()
 * <Text>{today.steps} steps</Text>
 * ```
 */
export function useToday(): DailyMetric {
  return useLiveQuery(['daily_metrics'], () => getDailyMetrics({ start: todayKey(), end: todayKey() })[0], [])
}

export function useEntries(range?: { start?: string; end?: string }): Entry[] {
  return useLiveQuery(['entries'], () => listEntries(range), [range?.start, range?.end])
}

export function useEntry(id: string): Entry | undefined {
  return useLiveQuery(['entries'], () => getEntry(id), [id])
}

export function useWorkouts(range: { start: string; end: string }): WorkoutRow[] {
  return useLiveQuery(['workouts'], () => getWorkouts(range), [range.start, range.end])
}

export function useSyncStatus(): { lastSyncedAt: string | null; permissionState: 'unknown' | 'shouldRequest' | 'requested' } {
  return useLiveQuery(
    ['meta'],
    () => {
      const db = getDb()
      const permission = getMeta(db, 'permission_state')
      return {
        lastSyncedAt: getMeta(db, 'last_synced_at') ?? null,
        permissionState: permission === 'shouldRequest' || permission === 'requested' ? permission : ('unknown' as const),
      }
    },
    [],
  )
}
```

`src/data/index.ts`:

```ts
/**
 * The app's data foundation — the only module screens should import from.
 * Everything here is tested and safe to build on. See CLAUDE.md for a tour.
 */
export { addDays, dateKey, lastNDateKeys, todayKey } from './dates'
export { addEntry, deleteEntry, getEntry, listEntries, updateEntry, type Entry, type EntryPhoto } from './entries'
export { useDailySteps, useEntries, useEntry, useSyncStatus, useToday, useWorkouts } from './hooks'
export { getDb } from './db/db'
export { getMeta, setMeta } from './meta'
export { type DailyMetric, type WorkoutRow } from './metrics'
export { seedFakeData } from './seed'
export { syncHealth, type SyncStatus } from './sync'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest`
Expected: full suite PASS. `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/data/hooks.ts src/data/index.ts src/data/__tests__/hooks.test.tsx
git commit -m "feat: live-query hooks and public data API"
```

---

### Task 9: App shell — root layout, welcome flow, tab scaffold, sync triggers

**Files:**
- Create/replace: `app/_layout.tsx`, `app/index.tsx`, `app/welcome.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/today.tsx` (placeholder), `app/(tabs)/journal.tsx` (placeholder), `app/(tabs)/days.tsx` (placeholder)

**Interfaces:**
- Consumes: `getDb`, `getMeta`, `setMeta`, `syncHealth`, `useSyncStatus` from `src/data` (public index only).
- Produces: navigable app; meta key `welcome_done = '1'` gates the welcome screen; sync runs on launch and on every return to foreground.

- [ ] **Step 1: Implement the root layout**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { getDb, syncHealth } from '../src/data'

export default function RootLayout() {
  useEffect(() => {
    getDb() // opens + migrates on first touch
    syncHealth()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncHealth()
    })
    return () => sub.remove()
  }, [])

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="entry/new" options={{ presentation: 'modal', title: 'New entry' }} />
      <Stack.Screen name="entry/[id]" options={{ title: 'Entry' }} />
      <Stack.Screen name="day/[date]" options={{ title: 'Day' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  )
}
```

- [ ] **Step 2: Implement the gate and welcome screen**

`app/index.tsx`:

```tsx
import { Redirect } from 'expo-router'
import { getDb, getMeta } from '../src/data'

export default function Index() {
  const welcomed = getMeta(getDb(), 'welcome_done') === '1'
  return <Redirect href={welcomed ? '/(tabs)/today' : '/welcome'} />
}
```

`app/welcome.tsx`:

```tsx
import { router } from 'expo-router'
import { useState } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'
import { getDb, setMeta, syncHealth } from '../src/data'

export default function Welcome() {
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    setBusy(true)
    await syncHealth({ requestPermissionIfNeeded: true })
    finish()
  }

  const finish = () => {
    setMeta(getDb(), 'welcome_done', '1')
    router.replace('/(tabs)/today')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Steps</Text>
      <Text style={styles.body}>
        A journal for your walks. Connect Apple Health to see your steps — the data stays on this phone.
      </Text>
      <Button title={busy ? 'Connecting…' : 'Connect Apple Health'} onPress={connect} disabled={busy} />
      <Button title="Not now" onPress={finish} disabled={busy} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 34, fontWeight: 'bold' },
  body: { fontSize: 16 },
})
```

- [ ] **Step 3: Implement the tab bar and placeholder screens**

`app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="days" options={{ title: 'Days' }} />
    </Tabs>
  )
}
```

Each of `today.tsx`, `journal.tsx`, `days.tsx` for now:

```tsx
import { Text, View } from 'react-native'

export default function Today() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Today</Text>
    </View>
  )
}
```

(Adjust the component name/text per file. `entry/new.tsx`, `entry/[id].tsx`, `day/[date]`.tsx, `settings.tsx` don't exist yet — the Stack tolerates that; they arrive in Tasks 11–12.)

- [ ] **Step 4: Verify in the simulator**

```bash
npx tsc --noEmit && npx jest
npx expo run:ios
```

Expected: first launch shows the welcome screen; "Not now" lands on tabs; relaunching (`r` in the Metro terminal) skips welcome. HealthKit permission sheet appears if "Connect Apple Health" is tapped (simulator has a Health store). No red screens.

- [ ] **Step 5: Commit**

```bash
git add app
git commit -m "feat: app shell — welcome gate, tab scaffold, sync on launch/foreground"
```

---

### Task 10: Today tab and the SVG bar-chart template

**Files:**
- Create: `src/components/BarChart.tsx`
- Replace: `app/(tabs)/today.tsx`

**Interfaces:**
- Consumes: `useToday`, `useDailySteps`, `useSyncStatus`, `syncHealth`, `dateKey`, `addDays`, `todayKey` from `src/data`.
- Produces: `<BarChart data={{ label: string; value: number }[]} height?: number />` — the commented example chart the owner will remix.

- [ ] **Step 1: Implement the chart template**

`src/components/BarChart.tsx` — this file doubles as a tutorial; keep the comments:

```tsx
import { Text, View } from 'react-native'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'

/**
 * A deliberately simple bar chart, drawn with SVG rectangles.
 *
 * This is a TEMPLATE — copy it, rename it, restyle it, break it. The idea:
 *   1. Find the biggest value, so every bar can be scaled relative to it.
 *   2. Divide the width into one slot per data point.
 *   3. Draw a <Rect> per point whose height is value / max of the drawing area.
 *
 * Ideas to try: rounded corners (rx), a color per weekday, a horizontal
 * goal line (<Line>), animating heights with react-native-reanimated,
 * or rebuilding it in @shopify/react-native-skia for gradients and glow.
 */
export function BarChart({ data, height = 160 }: { data: { label: string; value: number }[]; height?: number }) {
  const width = 340
  const labelSpace = 18
  const chartHeight = height - labelSpace
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = width / Math.max(1, data.length)
  const barWidth = slot * 0.6 // 60% bar, 40% gap

  return (
    <View>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * chartHeight
          return (
            <Rect
              key={d.label}
              x={i * slot + (slot - barWidth) / 2}
              y={chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              fill="#4a90d9"
            />
          )
        })}
        {data.map((d, i) => (
          <SvgText key={d.label} x={i * slot + slot / 2} y={height - 4} fontSize={10} fill="#666" textAnchor="middle">
            {d.label}
          </SvgText>
        ))}
      </Svg>
      {data.length === 0 && <Text>No data yet</Text>}
    </View>
  )
}
```

- [ ] **Step 2: Implement the Today screen**

`app/(tabs)/today.tsx`:

```tsx
import { Link } from 'expo-router'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { BarChart } from '../../src/components/BarChart'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps, useSyncStatus, useToday } from '../../src/data'

export default function Today() {
  const today = useToday()
  const week = useDailySteps({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
  const { lastSyncedAt, permissionState } = useSyncStatus()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    await syncHealth()
    setRefreshing(false)
  }

  const km = (today.distanceMeters / 1000).toFixed(1)
  const chartData = week.map((d) => ({ label: d.date.slice(8), value: d.steps }))

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.steps}>{today.steps.toLocaleString()}</Text>
      <Text style={styles.caption}>steps today · {km} km</Text>
      <View style={styles.chart}>
        <Text style={styles.caption}>last 7 days</Text>
        <BarChart data={chartData} />
      </View>
      {permissionState === 'shouldRequest' && (
        <Link href="/settings" style={styles.link}>
          Connect Apple Health to see your steps →
        </Link>
      )}
      <Link href="/settings" style={styles.link}>
        {lastSyncedAt ? `last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'not synced yet'}
      </Link>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, alignItems: 'center' },
  steps: { fontSize: 64, fontWeight: 'bold', marginTop: 24 },
  caption: { fontSize: 14, color: '#666' },
  chart: { marginTop: 24, gap: 8 },
  link: { marginTop: 16, color: '#4a90d9' },
})
```

- [ ] **Step 3: Verify in the simulator**

Run: `npx tsc --noEmit`, then in the running app: Today shows `0` steps and an empty chart (no seed yet — that arrives with Settings in Task 12; to eyeball the chart now, temporarily call `seedFakeData(7)` from the layout effect and remove it before committing). Pull-to-refresh completes without errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/today.tsx src/components/BarChart.tsx
git commit -m "feat: Today tab with big number and commented SVG bar-chart template"
```

---

### Task 11: Journal — list, add-entry modal, entry detail

**Files:**
- Replace: `app/(tabs)/journal.tsx`
- Create: `app/entry/new.tsx`, `app/entry/[id].tsx`

**Interfaces:**
- Consumes: `useEntries`, `useEntry`, `addEntry`, `updateEntry`, `deleteEntry`, `todayKey` from `src/data`; `expo-image-picker`; `@react-native-community/datetimepicker`; `expo-image`'s `Image`.
- Produces: the journal loop working end-to-end once: list → add (date, text, photos) → view → edit text → delete.

- [ ] **Step 1: Implement the journal list**

`app/(tabs)/journal.tsx`:

```tsx
import { Link } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useEntries } from '../../src/data'

export default function Journal() {
  const entries = useEntries()

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        ListEmptyComponent={<Text style={styles.empty}>No entries yet. Walk somewhere, then write about it.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/entry/[id]', params: { id: item.id } }} style={styles.row}>
            <View style={styles.rowInner}>
              <Text style={styles.date}>{item.date}</Text>
              <Text numberOfLines={2}>{item.text}</Text>
              {item.photos.length > 0 && (
                <View style={styles.thumbs}>
                  {item.photos.map((p) => (
                    <Image key={p.id} source={p.uri} style={styles.thumb} />
                  ))}
                </View>
              )}
            </View>
          </Link>
        )}
      />
      <Link href="/entry/new" style={styles.add}>
        ＋ New entry
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 24, color: '#666' },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  rowInner: { gap: 4 },
  date: { fontWeight: 'bold' },
  thumbs: { flexDirection: 'row', gap: 4, marginTop: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  add: { padding: 16, textAlign: 'center', fontSize: 18, color: '#4a90d9' },
})
```

- [ ] **Step 2: Implement the add-entry modal**

`app/entry/new.tsx`:

```tsx
import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { addEntry, dateKey } from '../../src/data'

export default function NewEntry() {
  // Day detail can pre-fill the date: /entry/new?date=2026-08-10
  const params = useLocalSearchParams<{ date?: string }>()
  const [date, setDate] = useState(params.date ? new Date(`${params.date}T12:00:00`) : new Date())
  const [text, setText] = useState('')
  const [photoUris, setPhotoUris] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) setPhotoUris(result.assets.map((a) => a.uri))
  }

  const save = async () => {
    setSaving(true)
    await addEntry({ date: dateKey(date), text, photoUris })
    router.back()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DateTimePicker value={date} mode="date" display="compact" maximumDate={new Date()} onChange={(_, d) => d && setDate(d)} />
      <TextInput
        style={styles.input}
        placeholder="What happened today?"
        multiline
        value={text}
        onChangeText={setText}
        autoFocus
      />
      <Button title={photoUris.length ? `${photoUris.length} photo(s) picked` : 'Add photos'} onPress={pickPhotos} />
      <View style={styles.thumbs}>
        {photoUris.map((uri) => (
          <Image key={uri} source={uri} style={styles.thumb} />
        ))}
      </View>
      <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving || (!text && photoUris.length === 0)} />
      {saving && <Text style={styles.note}>If a photo fails to copy, the entry still saves without it.</Text>}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  input: { minHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  thumb: { width: 72, height: 72, borderRadius: 4 },
  note: { color: '#666', fontSize: 12 },
})
```

- [ ] **Step 3: Implement entry detail (view, edit text, delete)**

`app/entry/[id].tsx`:

```tsx
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { deleteEntry, updateEntry, useEntry } from '../../src/data'

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = useEntry(id)
  const [draft, setDraft] = useState<string | null>(null)

  if (!entry) return <Text style={styles.missing}>Entry not found.</Text>

  const editing = draft !== null

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>{entry.date}</Text>
      {editing ? (
        <TextInput style={styles.input} multiline value={draft} onChangeText={setDraft} autoFocus />
      ) : (
        <Text style={styles.body}>{entry.text}</Text>
      )}
      {entry.photos.map((p) => (
        <Image key={p.id} source={p.uri} style={styles.photo} contentFit="cover" />
      ))}
      {editing ? (
        <Button
          title="Done"
          onPress={() => {
            updateEntry(entry.id, { text: draft ?? '' })
            setDraft(null)
          }}
        />
      ) : (
        <Button title="Edit" onPress={() => setDraft(entry.text)} />
      )}
      <Button
        title="Delete entry"
        color="#c0392b"
        onPress={() => {
          deleteEntry(entry.id)
          router.back()
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  missing: { padding: 24, color: '#666' },
  date: { fontWeight: 'bold', fontSize: 16 },
  body: { fontSize: 16 },
  input: { minHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 8 },
})
```

- [ ] **Step 4: Verify in the simulator**

`npx tsc --noEmit`, then in the app: add an entry with text and two photos (simulator photo library has stock images); it appears in the list with thumbnails; open it, edit the text, delete it; it disappears. Kill and relaunch the app — remaining entries persist.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/journal.tsx app/entry
git commit -m "feat: journal — list, add entry with date+photos, detail with edit/delete"
```

---

### Task 12: Days tab, day detail, settings surface

**Files:**
- Replace: `app/(tabs)/days.tsx`
- Create: `app/day/[date].tsx`, `app/settings.tsx`

**Interfaces:**
- Consumes: `useDailySteps`, `useEntries`, `useWorkouts`, `useSyncStatus`, `syncHealth`, `seedFakeData`, `dateKey`, `addDays`, `todayKey` from `src/data`.
- Produces: the remaining navigation loop; the dev-only seed button; the connect-health path for the permission-denied state.

- [ ] **Step 1: Implement the Days list**

`app/(tabs)/days.tsx`:

```tsx
import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps } from '../../src/data'

export default function Days() {
  const days = useDailySteps({ start: dateKey(addDays(new Date(), -89)), end: todayKey() })
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    await syncHealth()
    setRefreshing(false)
  }

  return (
    <FlatList
      data={[...days].reverse()} // newest first
      keyExtractor={(d) => d.date}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/day/[date]', params: { date: item.date } }} style={styles.row}>
          <View style={styles.rowInner}>
            <Text style={styles.date}>{item.date}</Text>
            <Text>{item.steps.toLocaleString()} steps</Text>
          </View>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  rowInner: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  date: { fontWeight: '600' },
})
```

- [ ] **Step 2: Implement day detail**

`app/day/[date].tsx` — this is the seam screen where the owner's journal-model decision will live; say so in a comment:

```tsx
import { Link, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useDailySteps, useEntries, useWorkouts } from '../../src/data'

// One day: its numbers, its workouts, its memories. If the journal ever
// becomes day-centric (one entry per day) or walk-centric, this screen is
// where that idea takes shape.
export default function DayDetail() {
  const { date } = useLocalSearchParams<{ date: string }>()
  const [metrics] = useDailySteps({ start: date, end: date })
  const entries = useEntries({ start: date, end: date })
  const workouts = useWorkouts({ start: date, end: date })

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.big}>{metrics?.steps.toLocaleString() ?? 0} steps</Text>
      <Text style={styles.caption}>{((metrics?.distanceMeters ?? 0) / 1000).toFixed(1)} km · {date}</Text>
      {workouts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.heading}>Walks</Text>
          {workouts.map((w) => (
            <Text key={w.id}>
              {w.type} · {Math.round(w.durationS / 60)} min{w.distanceMeters ? ` · ${(w.distanceMeters / 1000).toFixed(1)} km` : ''}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.heading}>Journal</Text>
        {entries.length === 0 && <Text style={styles.caption}>Nothing written for this day yet.</Text>}
        {entries.map((e) => (
          <Link key={e.id} href={{ pathname: '/entry/[id]', params: { id: e.id } }} style={styles.entry}>
            <View>
              <Text numberOfLines={3}>{e.text}</Text>
              {e.photos.length > 0 && (
                <View style={styles.thumbs}>
                  {e.photos.map((p) => (
                    <Image key={p.id} source={p.uri} style={styles.thumb} />
                  ))}
                </View>
              )}
            </View>
          </Link>
        ))}
        <Link href={{ pathname: '/entry/new', params: { date } }} style={styles.add}>
          ＋ Write about this day
        </Link>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  big: { fontSize: 40, fontWeight: 'bold' },
  caption: { color: '#666' },
  section: { marginTop: 16, gap: 8 },
  heading: { fontWeight: 'bold', fontSize: 16 },
  entry: { paddingVertical: 8 },
  thumbs: { flexDirection: 'row', gap: 4, marginTop: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  add: { color: '#4a90d9', paddingVertical: 8 },
})
```

- [ ] **Step 3: Implement settings**

`app/settings.tsx`:

```tsx
import { useState } from 'react'
import { Button, Linking, StyleSheet, Text, View } from 'react-native'
import { seedFakeData, syncHealth, useSyncStatus } from '../src/data'

export default function Settings() {
  const { lastSyncedAt, permissionState } = useSyncStatus()
  const [message, setMessage] = useState('')

  const connect = async () => {
    const { status } = await syncHealth({ requestPermissionIfNeeded: true })
    // HealthKit never reports read denial. If steps stay at 0 after connecting,
    // the fix lives in Settings → Privacy & Security → Health.
    setMessage(status === 'ok' ? 'Connected.' : `Sync says: ${status}`)
  }

  return (
    <View style={styles.container}>
      <Text>Health permission: {permissionState}</Text>
      <Text>Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'never'}</Text>
      {permissionState !== 'requested' && <Button title="Connect Apple Health" onPress={connect} />}
      <Button title="Sync now" onPress={() => syncHealth().then((r) => setMessage(`Sync: ${r.status}`))} />
      <Button title="Open Health privacy settings" onPress={() => Linking.openURL('app-settings:')} />
      {__DEV__ && (
        <Button
          title="DEV: fill with a year of fake steps"
          onPress={() => {
            seedFakeData()
            setMessage('Seeded 365 days.')
          }}
        />
      )}
      {message !== '' && <Text style={styles.note}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  note: { color: '#666' },
})
```

- [ ] **Step 4: Verify in the simulator**

`npx tsc --noEmit`, then: Settings → seed button fills Days and the Today chart instantly (live queries); Days → tap a day → detail shows steps and a "write about this day" link that pre-fills the date; the full tab loop navigates without errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(tabs\)/days.tsx app/day app/settings.tsx
git commit -m "feat: Days tab, day detail seam screen, settings with dev seed"
```

---

### Task 13: The owner's CLAUDE.md, README, and final verification

**Files:**
- Create: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: the finished app.
- Produces: the handoff documents; a verified green final state.

- [ ] **Step 1: Write CLAUDE.md — for the owner, not for engineers**

Write `CLAUDE.md` with exactly these sections, in plain, warm, non-jargon language (this file is the context every one of her vibe-coding sessions loads — it matters more than any other doc):

1. **What this app is** — her step journal; she owns everything visual.
2. **How to run it** — `npx expo start`, press `i` for simulator, or open the app on her phone with Metro running; if the phone won't connect, same Wi-Fi + restart Metro.
3. **The shape of the code** — `app/` is screens (hers), `src/components/` is shared pieces (hers), `src/data/` is the engine room (works, tested, no need to touch; nothing she does in `app/` can corrupt it).
4. **Getting data onto the screen** — the hooks, each with a 3-line copy-pasteable example (`useToday`, `useDailySteps`, `useEntries`, `useWorkouts`, `addEntry`, `useSyncStatus`), plus "fake data" instructions (Settings → DEV seed button).
5. **Ideas to try first** — rename the app (app.json `name` + this file), change the chart's color, make bars rounded, add a monthly view, decide what a journal entry *is* (one per day? many?), try a Skia visualization.
6. **If something breaks** — shake the phone → Reload; `git checkout .` undoes uncommitted changes; commits are save points, make them often.
7. **House rules for AI sessions** — screens import from `../src/data` only; don't add native dependencies (they need a special rebuild — ask David); keep tests green (`npm test`).

- [ ] **Step 2: Write README.md**

Short: what the app is, one paragraph on the architecture (link to `docs/specs/`), how to run, how to test, pointer to `CLAUDE.md` for the vibe-coding guide.

- [ ] **Step 3: Full verification sweep**

```bash
npx tsc --noEmit
npx jest
npx expo-doctor
```

Expected: all green. Then a full manual smoke pass in the simulator: welcome → connect (sheet appears) → tabs → seed → Today chart populated → add entry with photos → day detail shows it → edit → delete → relaunch → state persists.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: owner's guide (CLAUDE.md) and README"
```

---

### Task 14 (manual, David + device): Dev client on her iPhone

Not agent-executable — recorded here so the plan ends at the real goal:

- [ ] Plug in her iPhone, `npx expo run:ios --device`, choosing the studio development team in the generated Xcode project if prompted (`ios/` is generated via CNG; it stays gitignored).
- [ ] On the phone: trust the developer profile (Settings → General → VPN & Device Management) if asked.
- [ ] First launch: welcome → Connect Apple Health → grant Steps + Distance + Workouts → real data appears on Today.
- [ ] Confirm hot reload: change a string in `app/(tabs)/today.tsx` on the Mac with Metro running; the phone updates.

## Self-review notes

- Spec coverage: architecture/boundary (Tasks 2–8 vs 9–12), all four tables + cascade (Task 2), photo copy-in/cleanup (Tasks 4–5), 90/365 sync windows + idempotency + meta (Task 7), all seven spec'd hooks (Task 8; `useSyncStatus` carries permission state), three plain tabs + welcome + settings + seed (Tasks 9–12), her CLAUDE.md + README (Task 13), device install + hot reload (Task 14). Error handling: permission-denied empty state (Today link + Settings connect), sync failure → `'error'` + stale timestamp, photo-copy failure → skip + note.
- Known intentional gaps per spec: no tests for screens; `photos.ts`/`ids.ts`/`healthkit.ts` untested natively-backed thin wrappers behind mockable seams.
- Type consistency checked: `DailyMetric`/`WorkoutRow`/`Entry`/`EntryPhoto`/`HealthSource`/`SyncStatus` names and shapes match across Tasks 2–12.
