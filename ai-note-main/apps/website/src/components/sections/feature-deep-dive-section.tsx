'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useI18n } from '@/i18n'
import type { TranslationKey } from '@/i18n/locales/zh'

interface DeepDiveItem {
  titleKey: TranslationKey
  descKey: TranslationKey
  color: string
  mockupLines: number[]
}

const items: DeepDiveItem[] = [
  {
    titleKey: 'deepDive.git.title',
    descKey: 'deepDive.git.desc',
    color: '#10b981',
    mockupLines: [85, 70, 60, 90, 55, 75],
  },
  {
    titleKey: 'deepDive.dualEdit.title',
    descKey: 'deepDive.dualEdit.desc',
    color: '#6366f1',
    mockupLines: [80, 65, 92, 48, 70, 85],
  },
  {
    titleKey: 'deepDive.search.title',
    descKey: 'deepDive.search.desc',
    color: '#f59e0b',
    mockupLines: [75, 88, 55, 68, 82, 60],
  },
]

function DeepDiveBlock({ item, index }: { item: DeepDiveItem; index: number }) {
  const { t } = useI18n()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const isReversed = index % 2 === 1

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <motion.div
        className={isReversed ? 'lg:order-2' : ''}
        initial={{ opacity: 0, x: isReversed ? 30 : -30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h3 className="text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          {t(item.titleKey)}
        </h3>
        <p className="mt-4 text-lg leading-relaxed text-[var(--color-text-secondary)]">
          {t(item.descKey)}
        </p>
      </motion.div>

      <motion.div
        className={isReversed ? 'lg:order-1' : ''}
        initial={{ opacity: 0, x: isReversed ? -30 : 30 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
      >
        {/* Feature mockup */}
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="p-5">
            <div
              className="mb-4 h-3 w-32 rounded"
              style={{ backgroundColor: item.color, opacity: 0.3 }}
            />
            <div className="space-y-2.5">
              {item.mockupLines.map((w, i) => (
                <div
                  key={i}
                  className="h-2 rounded bg-[var(--color-text-muted)] opacity-10"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
            <div
              className="mt-5 h-24 rounded-lg border border-[var(--color-border)]"
              style={{ backgroundColor: `${item.color}08` }}
            >
              <div className="p-3 space-y-2">
                {[70, 55, 80].map((w, i) => (
                  <div
                    key={i}
                    className="h-2 rounded"
                    style={{ width: `${w}%`, backgroundColor: item.color, opacity: 0.15 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default function FeatureDeepDiveSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6 sm:space-y-28 lg:px-8">
        {items.map((item, index) => (
          <DeepDiveBlock key={item.titleKey} item={item} index={index} />
        ))}
      </div>
    </section>
  )
}
