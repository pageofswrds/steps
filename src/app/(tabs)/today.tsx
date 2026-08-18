import { Link, Tabs, router } from 'expo-router'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Image } from 'expo-image'
import { Picker, Text as SwiftText } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { SymbolView } from 'expo-symbols'
import { BarChart } from '../../components/BarChart'
import { MonthCalendar } from '../../components/MonthCalendar'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps, useEntries, useHourlySteps, useSyncStatus, useToday } from '../../data'
import { usePalette } from '../../theme'

type Range = 'day' | 'week'

/** '12a' / '6a' / '12p' / '6p' — only multiples of 6 get a label. */
function hourLabel(hour: number): string {
  if (hour % 6 !== 0) return ''
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}${hour < 12 ? 'a' : 'p'}`
}

export default function Today() {
  const c = usePalette()
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<Range>('week')
  const [showCalendar, setShowCalendar] = useState(false)
  const today = useToday()
  const weekStart = dateKey(addDays(new Date(), -6))
  const week = useDailySteps({ start: weekStart, end: todayKey() })
  const hours = useHourlySteps(todayKey())
  // The journal follows the picker, like the chart does: Day shows today's
  // entries, Week shows the last 7 days'.
  const entries = useEntries(range === 'day' ? { start: todayKey(), end: todayKey() } : { start: weekStart, end: todayKey() })
  const { lastSyncedAt, permissionState } = useSyncStatus()

  const refresh = async () => {
    setRefreshing(true)
    await syncHealth()
    setRefreshing(false)
  }

  // '2026-08-17' → 'Sun, Aug 17' (noon dodges timezone edge cases)
  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

  const km = (today.distanceMeters / 1000).toFixed(1)
  const chartData =
    range === 'day'
      ? hours.map((h) => ({ label: hourLabel(h.hour), value: h.steps }))
      : week.map((d) => ({ label: d.date.slice(8), value: d.steps }))

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />}
    >
      {/* the calendar button lives in the screen's own header, top right */}
      <Tabs.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setShowCalendar((v) => !v)} hitSlop={12}>
              <SymbolView name={showCalendar ? 'chart.bar.fill' : 'calendar'} size={22} tintColor={c.accent} />
            </Pressable>
          ),
        }}
      />
      <Text style={[styles.steps, { color: c.text }]}>{today.steps.toLocaleString()}</Text>
      <Text style={[styles.caption, { color: c.muted }]}>steps today · {km} km</Text>
      <Picker
        selection={range}
        onSelectionChange={(selection) => {
          setRange(selection as Range)
          setShowCalendar(false) // picking a range always leaves the calendar
        }}
        modifiers={[pickerStyle('segmented')]}
      >
        <SwiftText modifiers={[tag('day')]}>Day</SwiftText>
        <SwiftText modifiers={[tag('week')]}>Week</SwiftText>
      </Picker>
      {showCalendar ? (
        <MonthCalendar onSelectDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })} />
      ) : (
        <View style={styles.chart}>
          <Text style={[styles.caption, { color: c.muted }]}>{range === 'day' ? 'today by hour' : 'last 7 days'}</Text>
          {/* Hours need different settings from days: no goal lines (nothing
              reaches 5,000 in an hour, and the lines would flatten every bar),
              colour spread across the busiest hour rather than in 5,000-step
              rungs, fatter bars because there are 24 of them, and a label every
              sixth hour. */}
          {range === 'day' ? (
            <BarChart data={chartData} goals={[]} shading="by-biggest" barFill={0.82} labelEvery={6} />
          ) : (
            <BarChart data={chartData} />
          )}
        </View>
      )}
      {permissionState === 'shouldRequest' && (
        <Link href="/settings" style={[styles.link, { color: c.accent }]}>
          Connect Apple Health to see your steps →
        </Link>
      )}
      <Link href="/settings" style={[styles.link, { color: c.accent }]}>
        {lastSyncedAt ? `last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'not synced yet'}
      </Link>
      {/* The journal, in full, each entry on its own card. Follows the picker:
          today's entries in Day view, the last 7 days' in Week. Not tappable yet. */}
      {entries.map((e) => (
        <View key={e.id} style={[styles.journalCard, { backgroundColor: c.card }]}>
          <Text style={[styles.journalDate, { color: c.muted }]}>{formatDate(e.date)}</Text>
          <Text style={[styles.journalText, { color: c.text }]}>{e.text}</Text>
          {e.photos.length > 0 && (
            <View style={styles.thumbs}>
              {e.photos.map((p) => (
                <Image key={p.id} source={p.uri} style={styles.thumb} />
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, alignItems: 'center' },
  steps: { fontSize: 64, fontWeight: 'bold', marginTop: 24 },
  caption: { fontSize: 14 },
  chart: { marginTop: 24, gap: 8, alignSelf: 'stretch' }, // or the centering container shrink-wraps it
  journalCard: { alignSelf: 'stretch', borderRadius: 12, padding: 12, marginTop: 12, gap: 6 },
  journalDate: { fontSize: 12, fontWeight: 'bold' },
  journalText: { fontSize: 15, lineHeight: 21 },
  thumbs: { flexDirection: 'row', gap: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  link: { marginTop: 16 },
})
