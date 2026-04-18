'use client'

import { useI18n } from '@/i18n'
import SectionWrapper from '@/components/ui/section-wrapper'
import { TECH_STACK } from '@/lib/constants'

export default function TechStackSection() {
  const { t } = useI18n()

  return (
    <SectionWrapper>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t('techStack.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
          {t('techStack.subtitle')}
        </p>
      </div>

      <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {TECH_STACK.map((tech) => (
          <div
            key={tech.name}
            className="flex flex-col items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 text-center transition-all hover:border-[var(--color-accent)] hover:shadow-md"
          >
            <div className="mb-2 text-2xl font-bold text-[var(--color-accent)] opacity-60">
              {tech.name.charAt(0)}
            </div>
            <div className="text-sm font-semibold text-[var(--color-text-primary)]">
              {tech.name}
            </div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">{tech.role}</div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  )
}
