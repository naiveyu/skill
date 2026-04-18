import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper'

// Indigo/Violet palette matching desktop app
const customColors = {
  primary: '#6366f1',
  primaryContainer: '#e0e7ff',
  secondary: '#8b5cf6',
  secondaryContainer: '#ede9fe',
  tertiary: '#a855f7',
  error: '#ef4444',
  background: '#ffffff',
  surface: '#ffffff',
  surfaceVariant: '#f1f5f9',
  onPrimary: '#ffffff',
  onBackground: '#0f172a',
  onSurface: '#0f172a',
  outline: '#cbd5e1',
}

const customDarkColors = {
  primary: '#818cf8',
  primaryContainer: '#312e81',
  secondary: '#a78bfa',
  secondaryContainer: '#4c1d95',
  tertiary: '#c084fc',
  error: '#f87171',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceVariant: '#334155',
  onPrimary: '#ffffff',
  onBackground: '#f1f5f9',
  onSurface: '#f1f5f9',
  outline: '#475569',
}

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...customColors,
  },
}

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...customDarkColors,
  },
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const typography = {
  monoFamily: 'monospace',
}
