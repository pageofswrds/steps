import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { addEntry, dateKey } from '../../data'

export default function NewEntry() {
  // Day detail can pre-fill the date: /entry/new?date=2026-08-10
  const params = useLocalSearchParams<{ date?: string }>()
  const [date, setDate] = useState(params.date ? new Date(`${params.date}T12:00:00`) : new Date())
  const [text, setText] = useState('')
  const [photoUris, setPhotoUris] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) setPhotoUris(result.assets.map((a) => a.uri))
  }

  const save = async () => {
    setSaving(true)
    await addEntry({ date: dateKey(date), text, photoUris })
    router.back()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DateTimePicker value={date} mode="date" display="compact" maximumDate={new Date()} onChange={(_, d) => d && setDate(d)} />
      <TextInput
        style={styles.input}
        placeholder="What happened today?"
        multiline
        value={text}
        onChangeText={setText}
        autoFocus
      />
      <Button title={photoUris.length ? `${photoUris.length} photo(s) picked` : 'Add photos'} onPress={pickPhotos} />
      <View style={styles.thumbs}>
        {photoUris.map((uri) => (
          <Image key={uri} source={uri} style={styles.thumb} />
        ))}
      </View>
      <Button title={saving ? 'Saving…' : 'Save'} onPress={save} disabled={saving || (!text && photoUris.length === 0)} />
      {saving && <Text style={styles.note}>If a photo fails to copy, the entry still saves without it.</Text>}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  input: { minHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  thumb: { width: 72, height: 72, borderRadius: 4 },
  note: { color: '#666', fontSize: 12 },
})
