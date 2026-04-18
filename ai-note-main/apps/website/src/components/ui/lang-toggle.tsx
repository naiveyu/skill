'use client'

import { useI18n, type Locale } from '@/i18n'

export default function LangToggle() {
  const { locale, setLocale } = useI18n()

  const handleToggle = () => {
    setLocale(locale === 'zh' ? 'en' : 'zh')
  }

  return (
    <button
      onClick={handleToggle}
      className="flex h-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
      aria-label="Switch language"
    >
      {locale === 'zh' ? 'EN' : '中文'}
    </button>
  )
}
