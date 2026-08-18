import { Link } from 'expo-router'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Image } from 'expo-image'
import { BarChart } from '../../components/BarChart'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps, useEntries, useSyncStatus, useToday } from '../../data'

export default function Today() {
  const today = useToday()
  const week = useDailySteps({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
  const entries = useEntries({ start: todayKey(), end: todayKey() })
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
      {/* This day's journal, in full, right under the number. Not tappable yet — that comes later. */}
      {entries.map((e) => (
        <View key={e.id} style={styles.journalCard}>
          <Text style={styles.journalText}>{e.text}</Text>
          {e.photos.length > 0 && (
            <View style={styles.thumbs}>
              {e.photos.map((p) => (
                <Image key={p.id} source={p.uri} style={styles.thumb} />
              ))}
            </View>
          )}
        </View>
      ))}
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
  journalCard: { alignSelf: 'stretch', backgroundColor: '#f2f2f2', borderRadius: 8, padding: 12, marginTop: 12, gap: 8 },
  journalText: { fontSize: 15, lineHeight: 21 },
  thumbs: { flexDirection: 'row', gap: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  link: { marginTop: 16, color: '#4a90d9' },
})
