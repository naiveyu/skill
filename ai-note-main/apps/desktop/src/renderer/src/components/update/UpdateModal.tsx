import { useUpdateStore } from '../../stores/update-store'
import { useI18n } from '../../i18n'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatSpeed(bps: number): string {
  return formatBytes(bps) + '/s'
}

// ===== Toast (bottom-right notification) =====
function UpdateToast() {
  const { showToast, version, dismissToast, openModalFromToast } = useUpdateStore()
  const { t } = useI18n()

  if (!showToast) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 bg-white rounded-xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] min-w-[300px] cursor-pointer animate-slide-up"
      onClick={openModalFromToast}
    >
      <div className="w-9 h-9 bg-[#ede9fe] rounded-lg flex items-center justify-center flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-[#1a1a2e]">
          {t('update.newVersionFound')} v{version}
        </div>
        <div className="text-xs text-[#999] mt-0.5">
          {t('update.clickForDetails')}
        </div>
        <div className="flex gap-1.5 mt-2">
          <button
            className="px-3 py-1 rounded bg-[#6366f1] text-white text-xs hover:bg-[#4f46e5]"
            onClick={(e) => { e.stopPropagation(); openModalFromToast() }}
          >
            {t('update.viewDetails')}
          </button>
          <button
            className="px-3 py-1 rounded bg-[#f3f4f6] text-[#666] text-xs hover:bg-[#e5e7eb]"
            onClick={(e) => { e.stopPropagation(); dismissToast() }}
          >
            {t('update.ignore')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Modal =====
function UpdateModal() {
  const {
    showModal,
    status,
    version,
    releaseNotes,
    fileSize,
    percent,
    bytesPerSecond,
    transferred,
    total,
    error,
    startDownload,
    installUpdate,
    dismiss,
    setShowModal,
    manualCheckForUpdate,
  } = useUpdateStore()
  const { t } = useI18n()

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => { if (status !== 'downloading') dismiss() }}
    >
      <div
        className="w-[420px] bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0]">
          <h3 className="text-base font-semibold">{t('update.title')}</h3>
          {status !== 'downloading' && (
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-md bg-[#f3f4f6] flex items-center justify-center text-[#666] hover:bg-[#e5e7eb]"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Checking */}
          {status === 'checking' && (
            <div className="text-center py-8">
              <div className="w-9 h-9 border-[3px] border-[#e5e7eb] border-t-[#6366f1] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[#666]">{t('update.checking')}</p>
            </div>
          )}

          {/* Available */}
          {status === 'available' && (
            <div>
              <span className="inline-block bg-[#ede9fe] text-[#6366f1] px-3 py-1 rounded-full text-[13px] font-semibold mb-3">
                v{version}
              </span>
              <p className="text-sm font-medium mb-1">{t('update.available')}</p>
              <p className="text-xs text-[#999]">{t('update.currentVersion')}: v{__APP_VERSION__}</p>
              {releaseNotes && (
                <div className="bg-[#f9fafb] rounded-lg p-3.5 mt-3 text-[13px] text-[#555] leading-relaxed">
                  <strong className="text-xs text-[#333]">{t('update.releaseNotes')}：</strong>
                  <p className="whitespace-pre-wrap mt-1.5">{releaseNotes}</p>
                </div>
              )}
              {fileSize && (
                <p className="text-xs text-[#999] mt-2">{t('update.fileSize')}: {formatBytes(fileSize)}</p>
              )}
            </div>
          )}

          {/* Downloading */}
          {status === 'downloading' && (
            <div>
              <p className="text-sm font-medium mb-3">{t('update.downloading')} v{version}</p>
              <div className="h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6366f1] to-[#818cf8] rounded-full transition-all duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-[#999]">
                <span>{percent}%</span>
                <span>{bytesPerSecond > 0 ? formatSpeed(bytesPerSecond) : '--'}</span>
              </div>
            </div>
          )}

          {/* Downloaded */}
          {status === 'downloaded' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-[#dcfce7] rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
                ✓
              </div>
              <p className="text-sm font-medium">{t('update.downloadComplete')}</p>
              <p className="text-[13px] text-[#666] mt-1.5">{t('update.restartToApply')}</p>
            </div>
          )}

          {/* Not Available */}
          {status === 'not-available' && (
            <div className="text-center py-5">
              <div className="w-12 h-12 bg-[#f0f9ff] rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
                ✓
              </div>
              <p className="text-sm font-medium">{t('update.upToDate')}</p>
              <p className="text-[13px] text-[#666] mt-1.5">
                {t('update.currentVersion')} v{__APP_VERSION__} {t('update.isLatest')}
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-5">
              <div className="w-12 h-12 bg-[#fef2f2] rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
                !
              </div>
              <p className="text-sm font-medium">{t('update.checkFailed')}</p>
              <p className="text-[13px] text-[#999] mt-1.5">
                {error || t('update.networkError')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#f0f0f0]">
          {status === 'available' && (
            <>
              <button
                onClick={dismiss}
                className="px-5 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[#f3f4f6]"
              >
                {t('update.later')}
              </button>
              <button
                onClick={startDownload}
                className="px-5 py-2 rounded-lg bg-[#6366f1] text-white text-sm font-medium hover:bg-[#4f46e5]"
              >
                {t('update.updateNow')}
              </button>
            </>
          )}

          {status === 'downloading' && (
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[#f3f4f6]"
            >
              {t('update.backgroundDownload')}
            </button>
          )}

          {status === 'downloaded' && (
            <>
              <button
                onClick={dismiss}
                className="px-5 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[#f3f4f6]"
              >
                {t('update.restartLater')}
              </button>
              <button
                onClick={installUpdate}
                className="px-5 py-2 rounded-lg bg-[#6366f1] text-white text-sm font-medium hover:bg-[#4f46e5]"
              >
                {t('update.installNow')}
              </button>
            </>
          )}

          {status === 'not-available' && (
            <button
              onClick={dismiss}
              className="px-5 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[#f3f4f6]"
            >
              {t('update.close')}
            </button>
          )}

          {status === 'error' && (
            <>
              <button
                onClick={dismiss}
                className="px-5 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[#f3f4f6]"
              >
                {t('update.close')}
              </button>
              <button
                onClick={manualCheckForUpdate}
                className="px-5 py-2 rounded-lg bg-[#6366f1] text-white text-sm font-medium hover:bg-[#4f46e5]"
              >
                {t('update.retry')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Declare vite env variable
declare const __APP_VERSION__: string

export { UpdateToast }
export default UpdateModal
