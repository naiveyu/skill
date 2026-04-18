'use client'

import { type ReactNode } from 'react'

interface PlatformButtonProps {
  icon: ReactNode
  platform: string
  format: string
  href: string
}

export default function PlatformButton({ icon, platform, format, href }: PlatformButtonProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-4 transition-all hover:border-[var(--color-accent)] hover:shadow-lg hover:shadow-[var(--color-accent)]/5"
    >
      <div className="text-[var(--color-text-primary)]">{icon}</div>
      <div>
        <div className="font-semibold text-[var(--color-text-primary)]">{platform}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{format}</div>
      </div>
    </a>
  )
}
