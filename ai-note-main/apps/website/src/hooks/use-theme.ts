'use client'

import { useContext } from 'react'
import { ThemeContext } from '@/providers/theme-provider'

export function useTheme() {
  return useContext(ThemeContext)
}
