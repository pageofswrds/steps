import { Stack, ThemeProvider } from 'expo-router'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { getDb, syncHealth } from '../data'
import { useNavigationTheme } from '../theme'

export default function RootLayout() {
  const theme = useNavigationTheme()

  useEffect(() => {
    getDb() // opens + migrates on first touch
    syncHealth()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncHealth()
    })
    return () => sub.remove()
  }, [])

  return (
    // ThemeProvider is what makes the headers, the tab bar and the background
    // behind a sliding screen follow light/dark. Those are drawn by the
    // navigation library, not by our screens, so they have to be told.
    <ThemeProvider value={theme}>
      {/* "auto" = dark text on a light background, light text on a dark one. */}
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="entry/new" options={{ presentation: 'modal', title: 'New entry' }} />
        <Stack.Screen name="entry/[id]" options={{ title: 'Entry' }} />
        <Stack.Screen name="day/[date]" options={{ title: 'Day' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </ThemeProvider>
  )
}
