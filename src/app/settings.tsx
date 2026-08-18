import { useState } from 'react'
import { Button, Linking, StyleSheet, Text, View } from 'react-native'
import { seedFakeData, syncHealth, useSyncStatus } from '../data'
import { usePalette } from '../theme'

export default function Settings() {
  const c = usePalette()
  const { lastSyncedAt, permissionState } = useSyncStatus()
  const [message, setMessage] = useState('')

  const connect = async () => {
    const { status } = await syncHealth({ requestPermissionIfNeeded: true })
    // HealthKit never reports read denial. If steps stay at 0 after connecting,
    // the fix lives in Settings → Privacy & Security → Health.
    setMessage(status === 'ok' ? 'Connected.' : `Sync says: ${status}`)
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background, flex: 1 }]}>
      <Text style={{ color: c.text }}>Health permission: {permissionState}</Text>
      <Text style={{ color: c.text }}>Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'never'}</Text>
      {permissionState !== 'requested' && <Button title="Connect Apple Health" onPress={connect} />}
      <Button title="Sync now" onPress={() => syncHealth().then((r) => setMessage(`Sync: ${r.status}`))} />
      <Button title="Open Health privacy settings" onPress={() => Linking.openURL('app-settings:')} />
      {__DEV__ && (
        <Button
          title="DEV: fill with a year of fake steps"
          onPress={() => {
            seedFakeData()
            setMessage('Seeded 365 days.')
          }}
        />
      )}
      {message !== '' && <Text style={[styles.note, { color: c.muted }]}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  note: {},
})
