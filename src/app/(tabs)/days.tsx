import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps } from '../../data'
import { usePalette } from '../../theme'

export default function Days() {
  const c = usePalette()
  const days = useDailySteps({ start: dateKey(addDays(new Date(), -89)), end: todayKey() })
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    await syncHealth()
    setRefreshing(false)
  }

  return (
    <FlatList
      data={[...days].reverse()} // newest first
      keyExtractor={(d) => d.date}
      style={{ backgroundColor: c.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.muted} />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/day/[date]', params: { date: item.date } }} style={[styles.row, { borderColor: c.hairline }]}>
          <View style={styles.rowInner}>
            <Text style={[styles.date, { color: c.text }]}>{item.date}</Text>
            <Text style={{ color: c.muted }}>{item.steps.toLocaleString()} steps</Text>
          </View>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowInner: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  date: { fontWeight: '600' },
})
