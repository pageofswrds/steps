import { Link } from 'expo-router'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Picker, Text as SwiftText } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { BarChart } from '../../components/BarChart'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps, useHourlySteps, useSyncStatus, useToday } from '../../data'

type Range = 'day' | 'week'

/** '12a' / '6a' / '12p' / '6p' — only multiples of 6 get a label. */
function hourLabel(hour: number): string {
  if (hour % 6 !== 0) return ''
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${hour < 12 ? 'a' : 'p'}`
}

export default function Today() {
  const today = useToday()
  const week = useDailySteps({ start: dateKey(addDays(new Date(), -6)), end: todayKey() })
  const hours = useHourlySteps(todayKey())
  const { lastSyncedAt, permissionState } = useSyncStatus()
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<Range>('week')

  const refresh = async () => {
    setRefreshing(true)
    await syncHealth()
    setRefreshing(false)
  }

  const km = (today.distanceMeters / 1000).toFixed(1)
  const chartData =
    range === 'day'
      ? hours.map((h) => ({ label: hourLabel(h.hour), value: h.steps }))
      : week.map((d) => ({ label: d.date.slice(8), value: d.steps }))

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Text style={styles.steps}>{today.steps.toLocaleString()}</Text>
      <Text style={styles.caption}>steps today · {km} km</Text>
      <Picker
        selection={range}
        onSelectionChange={(selection) => setRange(selection as Range)}
        modifiers={[pickerStyle('segmented')]}
      >
        <SwiftText modifiers={[tag('day')]}>Day</SwiftText>
        <SwiftText modifiers={[tag('week')]}>Week</SwiftText>
      </Picker>
      <View style={styles.chart}>
        <Text style={styles.caption}>{range === 'day' ? 'today by hour' : 'last 7 days'}</Text>
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
