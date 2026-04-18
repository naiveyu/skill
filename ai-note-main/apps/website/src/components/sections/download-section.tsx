'use client'

import { useI18n } from '@/i18n'
import SectionWrapper from '@/components/ui/section-wrapper'
import PlatformButton from '@/components/ui/platform-button'
import { AppleIcon, WindowsIcon, LinuxIcon } from '@/components/icons'
import { DOWNLOAD_LINKS, APP_VERSION } from '@/lib/constants'

export default function DownloadSection() {
  const { t } = useI18n()

  return (
    <SectionWrapper id="download" alternate>
      <div className="text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          {t('download.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--color-text-secondary)]">
          {t('download.subtitle')}
        </p>
      </div>

      <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <PlatformButton
          icon={<AppleIcon />}
          platform={t('download.macos')}
          format={DOWNLOAD_LINKS.macos.format}
          href={DOWNLOAD_LINKS.macos.url}
        />
        <PlatformButton
          icon={<WindowsIcon />}
          platform={t('download.windows')}
          format={DOWNLOAD_LINKS.windows.format}
          href={DOWNLOAD_LINKS.windows.url}
        />
        <PlatformButton
          icon={<LinuxIcon />}
          platform={t('download.linux')}
          format={DOWNLOAD_LINKS.linux.format}
          href={DOWNLOAD_LINKS.linux.url}
        />
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        v{APP_VERSION} &middot; {DOWNLOAD_LINKS.macos.requirement} / {DOWNLOAD_LINKS.windows.requirement} / {DOWNLOAD_LINKS.linux.requirement}
      </p>
    </SectionWrapper>
  )
}
