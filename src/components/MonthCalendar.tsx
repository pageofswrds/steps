import { useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { addDays, addMonths, dateKey, startOfMonth, todayKey, useDailySteps } from '../data'
import { usePalette } from '../theme'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] // Sunday-first
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** 842 → '842' · 8412 → '8.4k' · 12000 → '12k' — small cells need short numbers. */
function compact(steps: number): string {
  if (steps >= 10000) return `${Math.round(steps / 1000)}k`
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`
  return String(steps)
}

/**
 * A swipeable month calendar. Swipe sideways to page between months; tap a
 * day to open it. Days after today are dimmed and don't respond — there is
 * nothing to see there yet.
 *
 * The pager keeps three pages alive (last month, this month, next month) and
 * quietly re-centers after every swipe, so it can be swiped forever in either
 * direction. One data query spans all three pages, so swiping never pops.
 */
export function MonthCalendar({ onSelectDay }: { onSelectDay: (date: string) => void }) {
  const c = usePalette()
  const { width: screenWidth } = useWindowDimensions()
  const pageWidth = screenWidth - 48 // matches the Today screen's 24px padding
  const pager = useRef<ScrollView>(null)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const months = [addMonths(month, -1), month, addMonths(month, 1)]
  const rows = useDailySteps({
    start: dateKey(months[0]),
    end: dateKey(addDays(addMonths(month, 2), -1)),
  })
  const stepsByDate = new Map(rows.map((r) => [r.date, r.steps]))

  const onPage = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth)
    if (page === 1) return
    setMonth(addMonths(month, page - 1))
    // re-center on the middle page without animating, so the next swipe works
    requestAnimationFrame(() => pager.current?.scrollTo({ x: pageWidth, animated: false }))
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.monthName, { color: c.text }]}>
        {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
      </Text>
      <View style={[styles.weekdayRow, { width: pageWidth }]}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[styles.weekday, { color: c.muted }]}>
            {d}
          </Text>
        ))}
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onPage}
        contentOffset={{ x: pageWidth, y: 0 }}
      >
        {months.map((m) => (
          <MonthGrid key={dateKey(m)} month={m} stepsByDate={stepsByDate} width={pageWidth} onSelectDay={onSelectDay} />
        ))}
      </ScrollView>
    </View>
  )
}

function MonthGrid({
  month,
  stepsByDate,
  width,
  onSelectDay,
}: {
  month: Date // any moment inside the month; only year+month are read
  stepsByDate: Map<string, number>
  width: number
  onSelectDay: (date: string) => void
}) {
  const today = todayKey()
  const first = startOfMonth(month)
  const daysInMonth = addDays(addMonths(month, 1), -1).getDate()
  const cells: (string | null)[] = Array(first.getDay()).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(dateKey(new Date(first.getFullYear(), first.getMonth(), day)))
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const cell = (width - 6 * 4) / 7 // 7 cells, 6 gaps of 4

  return (
    <View style={[styles.grid, { width }]}>
      {cells.map((date, i) =>
        date === null ? (
          <View key={`blank-${i}`} style={{ width: cell, height: cell }} />
        ) : (
          <DayCell key={date} date={date} steps={stepsByDate.get(date) ?? 0} isToday={date === today} isFuture={date > today} size={cell} onSelectDay={onSelectDay} />
        ),
      )}
    </View>
  )
}

function DayCell({
  date,
  steps,
  isToday,
  isFuture,
  size,
  onSelectDay,
}: {
  date: string
  steps: number
  isToday: boolean
  isFuture: boolean
  size: number
  onSelectDay: (date: string) => void
}) {
  const c = usePalette()
  return (
    <Pressable style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} disabled={isFuture} onPress={() => onSelectDay(date)}>
      <Text style={[styles.dayNumber, { color: c.text }, isToday && { color: c.accent, fontWeight: 'bold' }, isFuture && { color: c.hairline }]}>{Number(date.slice(8))}</Text>
      <Text style={[styles.daySteps, { color: c.muted }, isFuture && { color: c.hairline }]}>{steps > 0 ? compact(steps) : '·'}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 16, alignItems: 'center', gap: 8 },
  monthName: { fontSize: 18, fontWeight: '600' },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekday: { width: 32, textAlign: 'center', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayNumber: { fontSize: 15 },
  daySteps: { fontSize: 10, marginTop: 2 },
})
