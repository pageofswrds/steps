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
