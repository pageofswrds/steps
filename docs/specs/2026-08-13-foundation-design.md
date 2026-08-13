# Step tracker visualizer journal — foundation design

**Date:** 2026-08-13
**Status:** Approved
**Working name:** `steps` (placeholder — renaming the app is her first vibe-coding task)

## What this is

A step tracker + memory journal iOS app, built as a creative playground for a first-time vibe coder. Apple Health supplies step data; she visualizes it, journals about good walking days, and attaches photos as memories. The purpose of this design is the **technical foundation**: a data layer solid enough that everything above it stays soft, moldable, and safe to rewrite.

Two roles shape every decision here:

- **The foundation (built by David):** Health sync, storage, photo handling, typed hooks. Boring, tested, hands-off.
- **The playground (hers):** every screen, chart, and pixel. She can delete and rewrite all of it and the app still works.

She works on David's Mac, so local dev builds and Metro are available; she has no programming experience, so the guiding constraint is: **she must never need a native rebuild, never touch Xcode, and never talk to HealthKit directly.** All iteration is JS/TS with hot reload.

## Architecture

```
HealthKit ──sync──▶ SQLite ◀── journal writes
                      │
                 typed hooks   ← the boundary: everything above is hers
                      │
                  screens & visualizations
```

Local-first with a sync layer. HealthKit is an external source the app syncs *from*, never queries live from UI code. Everything she will ever visualize is plain rows in a local SQLite database, read through a handful of typed hooks.

- `src/data/` — the foundation: schema, sync, photo storage, hooks. Documented as "you don't need to touch this."
- `src/app/` — expo-router routes; `src/components/` — shared UI. The playground.

The contract between layers is the hooks API (§ Hooks). Nothing in the playground imports from `src/data/` internals — only from its public index.

## Repo & stack

Standalone git repo at `~/armillary/repos/steps`. **No studio dependencies** (no daoUI, no commons wiring) — the whole repo can be pushed to her own GitHub when she's ready to own it.

- Expo SDK 57, TypeScript, expo-router (matching zhouyi/kairos-expo conventions, but self-contained).
- iOS only for now (HealthKit is iOS-only); nothing forecloses Android later.

**All native dependencies are baked in at scaffold time** so she never hits a rebuild wall:

| Dep | Why it's in the foundation |
|---|---|
| `@kingstinct/react-native-healthkit` + `react-native-nitro-modules` | HealthKit reads (typed, promise-based, Expo config plugin) |
| `expo-sqlite` | Source of truth |
| `expo-image-picker`, `expo-image`, `expo-file-system` | Photo attach, display, and owned copies |
| `@shopify/react-native-skia` | Creative/artful visualizations |
| `react-native-svg` | Chart-style visualizations (and the starter chart) |
| `react-native-reanimated`, `react-native-gesture-handler` | Motion and touch, pre-wired |
| `expo-haptics` | Cheap delight |

## Data model

Four tables, deliberately journal-model-agnostic: the day-centric vs. freeform vs. walk-centric decision is explicitly deferred to her, so the schema supports all three.

- **`daily_metrics`** — `date TEXT PRIMARY KEY` (`YYYY-MM-DD`, local time), `steps INTEGER`, `distance_meters REAL`, `synced_at TEXT`
- **`workouts`** — `id TEXT PRIMARY KEY` (HealthKit UUID), `date TEXT`, `start TEXT`, `end TEXT`, `type TEXT`, `distance_meters REAL`, `duration_s REAL`
- **`entries`** — `id TEXT PRIMARY KEY`, `date TEXT`, `text TEXT`, `created_at TEXT`, `updated_at TEXT`. No uniqueness on `date`: supports one-per-day or many-per-day.
- **`entry_photos`** — `id TEXT PRIMARY KEY`, `entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE`, `uri TEXT`, `position INTEGER`

Photos picked from her library are **copied** into the app's documents directory (`photos/<entry_id>/…`); `uri` points at the copy. The journal owns its memories even if she later deletes the originals from Photos. Deleting an entry deletes its photo files.

Schema lives behind a tiny versioned-migration runner (a `user_version` pragma and an ordered list of migration functions), so the foundation can evolve without wiping her data.

## Health sync

`syncHealth()` in `src/data/sync.ts`:

1. On first run, request HealthKit read permission for steps, walking/running distance, and workouts.
2. Query daily statistics (step total, distance total) for the trailing 90 days; upsert into `daily_metrics` keyed by date.
3. Query walking + hiking workouts for the same window; upsert into `workouts` keyed by HealthKit UUID.
4. First-ever sync backfills 365 days instead, so she has a year of history to visualize on day one (tracked via a `meta` key in SQLite).

Triggers: app launch, app foreground, and manual (pull-to-refresh). Idempotent by construction — re-syncing is always safe; no anchored queries or incremental bookkeeping. Today's row is simply overwritten each sync, which is how the "today" number stays fresh.

## Hooks — her API surface

Exported from `src/data/index.ts`, each with a doc comment containing a usage example (those comments are the context her vibe-coding sessions will read):

- `useDailySteps(range)` → `{ date, steps, distanceMeters }[]`
- `useToday()` → today's steps + distance, refreshed by the foreground sync
- `useEntries(range?)` → entries with photos, newest first
- `useEntry(id)` → one entry with photos
- `addEntry({ date, text, photos })` / `updateEntry(id, patch)` / `deleteEntry(id)` — photo params are picker assets; the foundation handles copying
- `useWorkouts(range)` → walking/hiking workouts
- `useSyncStatus()` → `{ lastSyncedAt, permissionState }`

Hooks re-render on relevant DB changes (a lightweight emitter keyed by table — no state-management library).

## Starter UI — working but plain

Every core loop works end-to-end exactly once, deliberately unstyled (system fonts, default colors) so everything visual is hers to make:

- **Today tab** — big step number, distance, and a plain 7-day bar chart in SVG, heavily commented as a template for her own charts.
- **Journal tab** — flat list of entries (date, text preview, photo thumbnails); `+` opens add-entry: date picker (defaults to today), text field, photo picker (multi-select).
- **Days tab** — scrollable list of days with step counts; tapping a day shows detail + that day's entries. This screen is the seam where her journal-model decision will eventually live.
- **First launch** — a one-time welcome screen that requests Health permission and explains what the app can see.

## Handoff affordances

- **In-repo `CLAUDE.md` written for her**: the app's shape in plain language, the hooks with copy-pasteable examples, how to run it, the "you can't really break `src/data/`" guarantee, and a few starter prompt ideas (rename the app, change the chart, make the journal day-centric…).
- **Seed script** (`npm run seed`): fills SQLite with a year of plausible fake step data so the simulator works without her phone.
- **Git from day one**: the foundation lands as clean commits, so "what changed?" is always answerable and anything is undoable.

## Error handling

Quiet-by-default; nothing strands her mid-session:

- **Permission denied** → Today tab shows a friendly empty state with a "connect Apple Health" button (deep-links to Settings). The journal side works fully regardless.
- **Sync failure** → keep last-known data; the only surface is a stale `lastSyncedAt`.
- **Photo copy failure** → entry saves without the photo and says so inline.

## Testing

Jest (jest-expo) on the data layer only: migrations, entry CRUD (including photo-file cleanup on delete), and sync upsert idempotency with HealthKit mocked. The playground layer gets **no tests by design** — she shouldn't inherit a failing suite when she rips out the UI.

## Dev workflow

One-time (David): `npx expo run:ios --device` with the studio Apple developer certificate to put the dev client on her iPhone. From then on (her): open the project on the Mac, `npx expo start`, phone connects over Wi-Fi, hot reload. Real step data appears the moment permission is granted. Simulator + `npm run seed` is the phone-free fallback.

## Out of scope (deliberately)

- Android / Health Connect
- Any backend, accounts, or cloud sync — single-user, on-device
- Step *writing* to HealthKit (read-only)
- Widgets, notifications, background sync — all fine later, none foundational
- The journal model decision (day-centric vs. freeform vs. walk-centric) — hers
