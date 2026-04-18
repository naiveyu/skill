import type { PublishPlatform, PlatformAuthStatus, PublishProgress, PublishResult } from '@ai-note/shared-types'
import { useI18n } from '../../i18n'

interface PlatformCardProps {
  platform: PublishPlatform
  authStatus?: PlatformAuthStatus
  selected: boolean
  onToggle: () => void
  progress?: PublishProgress
  result?: PublishResult
  isPublishing: boolean
}

const PLATFORM_INFO: Record<PublishPlatform, { icon: string; label: string }> = {
  wechat: { icon: '📱', label: 'publish.wechat' },
  xhs: { icon: '📕', label: 'publish.xhs' },
}

function PlatformCard({
  platform,
  authStatus,
  selected,
  onToggle,
  progress,
  result,
  isPublishing
}: PlatformCardProps) {
  const { t } = useI18n()
  const info = PLATFORM_INFO[platform]

  return (
    <div
      className={`rounded-lg border p-3 transition-all duration-150 cursor-pointer
        ${selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
        }
      `}
      onClick={() => {
        if (!isPublishing) onToggle()
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{info.icon}</span>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {t(info.label as any)}
        </span>
        {selected && (
          <span className="ml-auto text-xs text-[var(--color-accent)]">✓</span>
        )}
      </div>

      {/* Auth status hint */}
      {authStatus && (
        <div className="mt-1.5">
          {authStatus.isLoggedIn ? (
            <span className="text-xs text-green-600">
              ● {authStatus.username || t('publish.loggedIn')}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">
              {t('publish.willAutoLogin' as any)}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      {progress && isPublishing && (
        <div className="mt-2">
          <div className="mb-1 text-xs text-[var(--color-text-muted)]">
            {t(`publish.step.${progress.step}` as any) || progress.step}
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--color-bg-tertiary)]">
            <div
              className="h-1.5 rounded-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-2">
          {result.success ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span>✅ {t('publish.success')}</span>
            </div>
          ) : (
            <div className="text-xs text-red-500">
              ❌ {result.error || t('publish.failed')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default PlatformCard
