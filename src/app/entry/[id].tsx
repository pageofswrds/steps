import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native'
import { deleteEntry, updateEntry, useEntry } from '../../data'
import { usePalette } from '../../theme'

export default function EntryDetail() {
  const c = usePalette()
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = useEntry(id)
  const [draft, setDraft] = useState<string | null>(null)

  if (!entry) return <Text style={[styles.missing, { color: c.muted }]}>Entry not found.</Text>

  const editing = draft !== null

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.date, { color: c.text }]}>{entry.date}</Text>
      {editing ? (
        <TextInput
          style={[styles.input, { borderColor: c.hairline, color: c.text }]}
          multiline
          value={draft}
          onChangeText={setDraft}
          autoFocus
        />
      ) : (
        <Text style={[styles.body, { color: c.text }]}>{entry.text}</Text>
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
        color={c.danger}
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
  missing: { padding: 24 },
  date: { fontWeight: 'bold', fontSize: 16 },
  body: { fontSize: 16 },
  input: { minHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, padding: 12, fontSize: 16 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 8 },
})
