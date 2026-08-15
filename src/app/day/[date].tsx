import { Link, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useDailySteps, useEntries, useWorkouts } from '../../data'

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
