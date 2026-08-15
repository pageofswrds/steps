import { router } from 'expo-router'
import { useState } from 'react'
import { Button, StyleSheet, Text, View } from 'react-native'
import { getDb, setMeta, syncHealth } from '../data'

export default function Welcome() {
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    setBusy(true)
    await syncHealth({ requestPermissionIfNeeded: true })
    finish()
  }

  const finish = () => {
    setMeta(getDb(), 'welcome_done', '1')
    router.replace('/(tabs)/today')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Steps</Text>
      <Text style={styles.body}>
        A journal for your walks. Connect Apple Health to see your steps — the data stays on this phone.
      </Text>
      <Button title={busy ? 'Connecting…' : 'Connect Apple Health'} onPress={connect} disabled={busy} />
      <Button title="Not now" onPress={finish} disabled={busy} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 34, fontWeight: 'bold' },
  body: { fontSize: 16 },
})
