import { Link, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { BarChart } from '../../components/BarChart'
import { useDailySteps, useEntries, useHourlySteps, useWorkouts } from '../../data'
import { usePalette } from '../../theme'

// One day: its numbers, its workouts, its memories. If the journal ever
// becomes day-centric (one entry per day) or walk-centric, this screen is
// where that idea takes shape.
export default function DayDetail() {
  const c = usePalette()
  const { date } = useLocalSearchParams<{ date: string }>()
  const [metrics] = useDailySteps({ start: date, end: date })
  const entries = useEntries({ start: date, end: date })
  const workouts = useWorkouts({ start: date, end: date })
  const hours = useHourlySteps(date)

  // 0 → '12a', 9 → '9a', 12 → '12p', 18 → '6p'. Every hour gets a label even
  // though only every sixth is drawn — the chart needs them all to tell its
  // bars apart, and picks which ones to show itself.
  const hourly = hours.map((h) => ({ label: hourLabel(h.hour), value: h.steps }))
  const walkedAtAll = hours.some((h) => h.steps > 0)

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.big, { color: c.text }]}>{metrics?.steps.toLocaleString() ?? 0} steps</Text>
      <Text style={[styles.caption, { color: c.muted }]}>{((metrics?.distanceMeters ?? 0) / 1000).toFixed(1)} km · {date}</Text>
      {walkedAtAll && (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: c.text }]}>Through the day</Text>
          <BarChart
            data={hourly}
            goals={[]} // no goal lines: nobody walks 5,000 steps in one hour
            shading="by-biggest" // spread the blues across this day's busiest hour
            barFill={0.82} // 24 bars need to be fatter than 7 do
            labelEvery={6} // four labels across the day, not twenty-four
          />
        </View>
      )}
      {workouts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: c.text }]}>Walks</Text>
          {workouts.map((w) => (
            <Text key={w.id} style={{ color: c.text }}>
              {w.type} · {Math.round(w.durationS / 60)} min{w.distanceMeters ? ` · ${(w.distanceMeters / 1000).toFixed(1)} km` : ''}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Text style={[styles.heading, { color: c.text }]}>Journal</Text>
        {entries.length === 0 && <Text style={[styles.caption, { color: c.muted }]}>Nothing written for this day yet.</Text>}
        {entries.map((e) => (
          <Link key={e.id} href={{ pathname: '/entry/[id]', params: { id: e.id } }} style={styles.entry}>
            <View>
              <Text numberOfLines={3} style={{ color: c.text }}>{e.text}</Text>
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
        <Link href={{ pathname: '/entry/new', params: { date } }} style={[styles.add, { color: c.accent }]}>
          ＋ Write about this day
        </Link>
      </View>
    </ScrollView>
  )
}

/**
 * The hour as a bare number, in whichever clock the phone is set to.
 *
 * Rather than deciding 12- or 24-hour ourselves, we ask the phone to format the
 * time and then keep only the digits. On a 24-hour phone that gives 0, 6, 12,
 * 18; on a 12-hour one, 12, 6, 12, 6. Same code either way, and it follows the
 * device's own time settings instead of a guess.
 */
function hourLabel(hour: number) {
  const formatted = new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' })
  return formatted.match(/\d+/)?.[0] ?? String(hour)
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  big: { fontSize: 40, fontWeight: 'bold' },
  caption: {},
  section: { marginTop: 16, gap: 8 },
  heading: { fontWeight: 'bold', fontSize: 16 },
  entry: { paddingVertical: 8 },
  thumbs: { flexDirection: 'row', gap: 4, marginTop: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  add: { paddingVertical: 8 },
})
