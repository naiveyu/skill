import { createContext, useContext } from 'react'
import zh from './locales/zh'
import en from './locales/en'

export type Locale = 'zh' | 'en'
export type Translations = typeof zh

const locales: Record<Locale, Translations> = { zh, en }

let currentLocale: Locale = 'zh'

export function setLocale(locale: Locale) {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

export function t(key: string): string {
  const keys = key.split('.')
  let value: any = locales[currentLocale]
  for (const k of keys) {
    if (value == null) return key
    value = value[k]
  }
  return typeof value === 'string' ? value : key
}

export default { t, setLocale, getLocale }
