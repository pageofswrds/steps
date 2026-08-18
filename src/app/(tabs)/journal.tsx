import { Link } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useEntries } from '../../data'
import { usePalette } from '../../theme'

export default function Journal() {
  const c = usePalette()
  const entries = useEntries()

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>No entries yet. Walk somewhere, then write about it.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/entry/[id]', params: { id: item.id } }} style={[styles.row, { borderColor: c.hairline }]}>
            <View style={styles.rowInner}>
              <Text style={[styles.date, { color: c.text }]}>{item.date}</Text>
              <Text numberOfLines={2} style={{ color: c.text }}>{item.text}</Text>
              {item.photos.length > 0 && (
                <View style={styles.thumbs}>
                  {item.photos.map((p) => (
                    <Image key={p.id} source={p.uri} style={styles.thumb} />
                  ))}
                </View>
              )}
            </View>
          </Link>
        )}
      />
      <Link href="/entry/new" style={[styles.add, { color: c.accent }]}>
        ＋ New entry
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 24 },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowInner: { gap: 4 },
  date: { fontWeight: 'bold' },
  thumbs: { flexDirection: 'row', gap: 4, marginTop: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  add: { padding: 16, textAlign: 'center', fontSize: 18 },
})
