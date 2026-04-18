'use client'

import { useI18n } from '@/i18n'
import { GITHUB_URL } from '@/lib/constants'
import { LogoMark } from '@/components/icons/logo'

export default function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
              <LogoMark size={24} />
              AI-Note
            </div>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('footer.description')}</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{t('footer.slogan')}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              {t('footer.product')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
                  {t('nav.features')}
                </a>
              </li>
              <li>
                <a href="#download" className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
                  {t('nav.download')}
                </a>
              </li>
              <li>
                <a href="#comparison" className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
                  {t('nav.comparison')}
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
              {t('footer.resources')}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
                  {t('footer.docs')}
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
                  {t('footer.changelog')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-center text-xs text-[var(--color-text-muted)]">
          &copy; {year} AI-Note. {t('footer.copyright')}.
        </div>
      </div>
    </footer>
  )
}
