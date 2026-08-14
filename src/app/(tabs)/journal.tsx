import { Link } from 'expo-router'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useEntries } from '../../data'

export default function Journal() {
  const entries = useEntries()

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        ListEmptyComponent={<Text style={styles.empty}>No entries yet. Walk somewhere, then write about it.</Text>}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/entry/[id]', params: { id: item.id } }} style={styles.row}>
            <View style={styles.rowInner}>
              <Text style={styles.date}>{item.date}</Text>
              <Text numberOfLines={2}>{item.text}</Text>
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
      <Link href="/entry/new" style={styles.add}>
        ＋ New entry
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 24, color: '#666' },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  rowInner: { gap: 4 },
  date: { fontWeight: 'bold' },
  thumbs: { flexDirection: 'row', gap: 4, marginTop: 4 },
  thumb: { width: 48, height: 48, borderRadius: 4 },
  add: { padding: 16, textAlign: 'center', fontSize: 18, color: '#4a90d9' },
})
