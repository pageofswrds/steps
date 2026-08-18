/**
 * The app's data foundation — the only module screens should import from.
 * Everything here is tested and safe to build on. See AGENTS.md for a tour.
 */
export { addDays, addMonths, dateKey, lastNDateKeys, startOfMonth, todayKey } from './dates'
export { addEntry, deleteEntry, getEntry, listEntries, updateEntry, type Entry, type EntryPhoto } from './entries'
export { useDailySteps, useEntries, useEntry, useHourlySteps, useSyncStatus, useToday, useWorkouts } from './hooks'
export { getHourlySteps, type HourlySteps } from './hourly'
export { getDb } from './db/db'
export { getMeta, setMeta } from './meta'
export { type DailyMetric, type WorkoutRow } from './metrics'
export { seedFakeData } from './seed'
export { syncHealth, type SyncStatus } from './sync'
