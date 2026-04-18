import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme)
  const loadConfig = useSettingsStore((s) => s.loadConfig)
  const loadAuthState = useAuthStore((s) => s.loadAuthState)

  useEffect(() => {
    loadConfig()
    loadAuthState()
  }, [])

  const paperTheme = theme === 'dark' ? MD3DarkTheme : MD3LightTheme

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(main)" />
          <Stack.Screen
            name="editor/[path]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="auth"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}
