import { Stack } from 'expo-router'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { getDb, syncHealth } from '../data'

export default function RootLayout() {
  useEffect(() => {
    getDb() // opens + migrates on first touch
    syncHealth()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncHealth()
    })
    return () => sub.remove()
  }, [])

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="entry/new" options={{ presentation: 'modal', title: 'New entry' }} />
      <Stack.Screen name="entry/[id]" options={{ title: 'Entry' }} />
      <Stack.Screen name="day/[date]" options={{ title: 'Day' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  )
}
