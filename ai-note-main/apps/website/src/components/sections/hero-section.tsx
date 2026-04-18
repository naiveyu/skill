'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import { GITHUB_URL } from '@/lib/constants'
import { ArrowDownIcon, ExternalLinkIcon } from '@/components/icons'
import { LogoMark } from '@/components/icons/logo'

export default function HeroSection() {
  const { t } = useI18n()

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[var(--color-gradient-start)] opacity-[0.07] blur-[100px]" />
        <div className="absolute -right-40 bottom-20 h-[400px] w-[400px] rounded-full bg-[var(--color-gradient-end)] opacity-[0.07] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {/* Logo */}
          <div className="mb-8">
            <LogoMark size={64} />
          </div>

          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-1.5 text-sm text-[var(--color-text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Open Source & Free
          </div>

          {/* Title */}
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-[var(--color-text-primary)]">{t('hero.title')}</span>
            <br />
            <span className="gradient-text">{t('hero.titleHighlight')}</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)] sm:text-xl">
            {t('hero.subtitle')}
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#download"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--color-accent)]/25 transition-all hover:shadow-xl hover:shadow-[var(--color-accent)]/30 hover:brightness-110"
            >
              {t('hero.cta')}
              <ArrowDownIcon />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-8 py-3.5 text-sm font-semibold text-[var(--color-text-primary)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-tertiary)]"
            >
              {t('hero.ctaSecondary')}
              <ExternalLinkIcon />
            </a>
          </div>
        </motion.div>

        {/* App screenshot placeholder */}
        <motion.div
          className="mx-auto mt-16 max-w-4xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        >
          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl">
            {/* Title bar mockup */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <div className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-xs text-[var(--color-text-muted)]">AI-Note</span>
            </div>
            {/* Content area mockup */}
            <div className="flex h-[300px] sm:h-[400px]">
              {/* Sidebar mockup */}
              <div className="hidden w-48 border-r border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 sm:block">
                <div className="mb-3 h-3 w-20 rounded bg-[var(--color-text-muted)] opacity-20" />
                <div className="space-y-2">
                  {[60, 48, 72, 36, 56].map((w, i) => (
                    <div
                      key={i}
                      className={`h-2.5 rounded ${i === 1 ? 'bg-[var(--color-accent)] opacity-40' : 'bg-[var(--color-text-muted)] opacity-15'}`}
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              </div>
              {/* Editor mockup */}
              <div className="flex-1 p-6">
                <div className="mb-4 h-5 w-40 rounded bg-[var(--color-text-primary)] opacity-15" />
                <div className="space-y-2.5">
                  {[95, 88, 72, 60, 85, 45, 92, 68].map((w, i) => (
                    <div
                      key={i}
                      className="h-2 rounded bg-[var(--color-text-muted)] opacity-10"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
                <div className="mt-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3">
                  <div className="space-y-2">
                    {[80, 65, 70].map((w, i) => (
                      <div
                        key={i}
                        className="h-2 rounded bg-[var(--color-accent)] opacity-15"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
