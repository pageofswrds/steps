import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { deleteEntry, updateEntry, useEntry } from '../../data'

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = useEntry(id)
  const [draft, setDraft] = useState<string | null>(null)

  if (!entry) return <Text style={styles.missing}>Entry not found.</Text>

  const editing = draft !== null

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.date}>{entry.date}</Text>
      {editing ? (
        <TextInput style={styles.input} multiline value={draft} onChangeText={setDraft} autoFocus />
      ) : (
        <Text style={styles.body}>{entry.text}</Text>
      )}
      {entry.photos.map((p) => (
        <Image key={p.id} source={p.uri} style={styles.photo} contentFit="cover" />
      ))}
      {editing ? (
        <Button
          title="Done"
          onPress={() => {
            updateEntry(entry.id, { text: draft ?? '' })
            setDraft(null)
          }}
        />
      ) : (
        <Button title="Edit" onPress={() => setDraft(entry.text)} />
      )}
      <Button
        title="Delete entry"
        color="#c0392b"
        onPress={() => {
          deleteEntry(entry.id)
          router.back()
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  missing: { padding: 24, color: '#666' },
  date: { fontWeight: 'bold', fontSize: 16 },
  body: { fontSize: 16 },
  input: { minHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 8 },
})
