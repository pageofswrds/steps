import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { addDays, dateKey, syncHealth, todayKey, useDailySteps } from '../../data'

export default function Days() {
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      renderItem={({ item }) => (
        <Link href={{ pathname: '/day/[date]', params: { date: item.date } }} style={styles.row}>
          <View style={styles.rowInner}>
            <Text style={styles.date}>{item.date}</Text>
            <Text>{item.steps.toLocaleString()} steps</Text>
          </View>
        </Link>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  rowInner: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  date: { fontWeight: '600' },
})
