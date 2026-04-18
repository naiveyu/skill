import { create } from 'zustand'
import en, { TranslationKey } from './locales/en'
import zh from './locales/zh'

export type Locale = 'en' | 'zh'

const locales: Record<Locale, Record<string, string>> = { en, zh }

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

function detectLocale(): Locale {
  const saved = localStorage.getItem('inote-locale')
  if (saved === 'en' || saved === 'zh') return saved
  const lang = navigator.language
  return lang.startsWith('zh') ? 'zh' : 'en'
}

export const useI18n = create<I18nState>((set, get) => ({
  locale: detectLocale(),

  setLocale: (locale: Locale) => {
    localStorage.setItem('inote-locale', locale)
    set({ locale })
  },

  t: (key: TranslationKey, params?: Record<string, string | number>) => {
    const { locale } = get()
    let text = locales[locale]?.[key] ?? locales.en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  }
}))
