'use client'

import { type ReactNode } from 'react'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  description: string
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 transition-all hover:border-[var(--color-accent)] hover:shadow-lg hover:shadow-[var(--color-accent)]/5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)]">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{description}</p>
    </div>
  )
}
