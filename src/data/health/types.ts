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

export interface HealthHourlyTotal {
  /** 0–23, local time. */
  hour: number
  steps: number
}

/** Narrow seam over Apple Health. The app only ever talks to this interface. */
export interface HealthSource {
  isAvailable(): Promise<boolean>
  /** HealthKit never reveals read denial — only whether asking would show the sheet. */
  permissionStatus(): Promise<'shouldRequest' | 'requested'>
  requestPermissions(): Promise<void>
  getDailyTotals(start: Date, end: Date): Promise<HealthDailyTotal[]>
  getWorkouts(start: Date, end: Date): Promise<HealthWorkout[]>
  /**
   * One day's steps broken down by hour: exactly 24 entries, hours 0–23 in
   * local time, zeros where Health recorded nothing. Queried on demand, never
   * stored — only the day on screen is ever asked for.
   */
  getHourlySteps(day: Date): Promise<HealthHourlyTotal[]>
}
