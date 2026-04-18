'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import zh, { type TranslationKey } from '@/i18n/locales/zh'
import en from '@/i18n/locales/en'

export type Locale = 'zh' | 'en'

const locales: Record<Locale, Record<string, string>> = { zh, en }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'zh'
    const saved = localStorage.getItem('ai-note-locale')
    if (saved === 'zh' || saved === 'en') return saved
    return navigator.language.startsWith('zh') ? 'zh' : 'en'
  })

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('ai-note-locale', newLocale)
    document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en'
  }, [])

  const t = useCallback(
    (key: TranslationKey) => {
      return locales[locale]?.[key] ?? locales.zh[key] ?? key
    },
    [locale]
  )

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
