import { Link, Tabs, router } from 'expo-router'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'
import { Image } from 'expo-image'
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated'
import { Host } from '@expo/ui'
import { Picker, Text as SwiftText } from '@expo/ui/swift-ui'
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers'
import { SymbolView } from 'expo-symbols'
import { BarChart } from '../../components/BarChart'
import { MonthCalendar } from '../../components/MonthCalendar'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps, useEntries, useHourlySteps, useSyncStatus, useToday } from '../../data'
import { hourLabel, hourRange } from '../../format'
import { usePalette } from '../../theme'

/**
 * Three shapes of chart, all swipeable back through time:
 *
 *   day   — one day, hour by hour
 *   7days — a rolling week: the 7 days ending today (or ending wherever
 *           you've swiped back to)
 *   week  — a CALENDAR week, Sunday to Saturday, labelled S M T W T F S.
 *           The days that haven't happened yet hold their place as dots.
 */
type Range = 'day' | '7days' | 'week'

/** Sunday-first, to label the calendar week's columns. */
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Today() {
  const c = usePalette()
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState<Range>('7days')
  // How many pages the chart has been swiped back from "now" — 0 is today /
  // this week. Each swipe right adds one; you can't swipe into the future.
  const [back, setBack] = useState(0)
  // Which way the last swipe went, so the fresh page slides in from that side.
  const [cameFrom, setCameFrom] = useState<1 | -1>(1)
  const [showCalendar, setShowCalendar] = useState(false)
  const today = useToday()

  // The visible window, worked out from the range and how far back we've
  // swiped. `day` pages one day at a time; the other two page seven.
  const dayDate = dateKey(addDays(new Date(), -back))
  const sundayOffset = new Date().getDay() // days since Sunday, 0–6
  const winStart =
    range === 'week' ? dateKey(addDays(new Date(), -sundayOffset - back * 7)) : dateKey(addDays(new Date(), -back * 7 - 6))
  const winEnd = range === 'week' ? dateKey(addDays(new Date(), -sundayOffset - back * 7 + 6)) : dateKey(addDays(new Date(), -back * 7))

  const days = useDailySteps({ start: winStart, end: winEnd })
  const hours = useHourlySteps(range === 'day' ? dayDate : todayKey())
  // The journal follows the chart: whatever window you're looking at, those
  // are the entries below.
  const entries = useEntries(range === 'day' ? { start: dayDate, end: dayDate } : { start: winStart, end: winEnd })
  const { lastSyncedAt, permissionState } = useSyncStatus()

  const refresh = async () => {
    setRefreshing(true)
    await syncHealth()
    setRefreshing(false)
  }

  // '2026-08-17' → 'Sun, Aug 17' (noon dodges timezone edge cases)
  const formatDate = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  // '2026-08-17' → 'Aug 17', for captions that name a whole stretch
  const formatShort = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const km = (today.distanceMeters / 1000).toFixed(1)

  // `detail` is what the callout says when a bar is held; `future` marks the
  // calendar week's still-to-come days.
  const chartData =
    range === 'day'
      ? hours.map((h) => ({ label: hourLabel(h.hour), value: h.steps, detail: hourRange(h.hour) }))
      : days.map((d, i) => ({
          label: range === 'week' ? WEEKDAY_LETTERS[i] : d.date.slice(8),
          value: d.steps,
          detail: formatDate(d.date),
          future: d.date > todayKey(),
        }))

  const caption =
    back === 0
      ? { day: 'today by hour', '7days': 'last 7 days', week: 'this week' }[range]
      : range === 'day'
        ? `${formatDate(dayDate)}, by hour`
        : `${formatShort(winStart)} – ${formatShort(winEnd)}`

  /** The chart's swipe: +1 comes forward in time, -1 goes back. */
  const page = (delta: 1 | -1) => {
    setCameFrom(delta)
    setBack((b) => Math.max(0, b - delta))
  }

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
      {/* Every SwiftUI island needs a Host around it — that's the bridge that
          gives the native view a place to live inside React Native's layout.
          Without it the app refuses to render this screen at all. */}
      <Host matchContents style={{ alignSelf: 'stretch' }}>
        <Picker
          selection={range}
          onSelectionChange={(selection) => {
            setRange(selection as Range)
            setBack(0) // a new shape starts at now, not wherever you'd swiped to
            setShowCalendar(false) // picking a range always leaves the calendar
          }}
          modifiers={[pickerStyle('segmented')]}
        >
          <SwiftText modifiers={[tag('day')]}>Day</SwiftText>
          <SwiftText modifiers={[tag('7days')]}>7 Days</SwiftText>
          <SwiftText modifiers={[tag('week')]}>Week</SwiftText>
        </Picker>
      </Host>
      {showCalendar ? (
        <MonthCalendar onSelectDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })} />
      ) : (
        <View style={styles.chart}>
          <Text style={[styles.caption, { color: c.muted }]}>{caption}</Text>
          {/* The key remounts the chart whenever the page or the picker
              changes — the fresh page slides in from the side you swiped, and
              a selection never lingers from one view into another. Day bars
              (7 Days and Week alike) link through to that day's screen; hours
              have no screen of their own, so Day view is look-only.

              Hours need different settings from days: no goal lines (nothing
              reaches 5,000 in an hour, and the lines would flatten every bar),
              colour spread across the busiest hour rather than in 5,000-step
              rungs, fatter bars because there are 24 of them, and a label every
              sixth hour. */}
          <Animated.View
            key={`${range}-${back}`}
            entering={cameFrom === -1 ? SlideInLeft.duration(180) : SlideInRight.duration(180)}
            style={{ alignSelf: 'stretch' }}
          >
            {range === 'day' ? (
              <BarChart data={chartData} goals={[]} shading="by-biggest" barFill={0.82} labelEvery={6} onPage={page} />
            ) : (
              <BarChart
                data={chartData}
                onPage={page}
                onDetailPress={(i) => router.push({ pathname: '/day/[date]', params: { date: days[i].date } })}
              />
            )}
          </Animated.View>
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
      {/* The journal, in full, each entry on its own card, following the
          chart's window. Not tappable yet. */}
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
  chart: { alignSelf: 'stretch', marginTop: 24, gap: 8, alignItems: 'center' },
  journalCard: { alignSelf: 'stretch', borderRadius: 12, padding: 12, marginTop: 12, gap: 6 },
  journalDate: { fontSize: 12, fontWeight: 'bold' },
  journalText: { fontSize: 15, lineHeight: 21 },
  thumbs: { flexDirection: 'row', gap: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  link: { marginTop: 16 },
})
