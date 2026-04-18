import { useEffect, useState } from 'react'
import { useSyncStore } from '../../stores/sync-store'
import { useI18n } from '../../i18n'
import { SmartphoneIcon, RefreshCwIcon } from '../common/Icons'
import PairingModal from './PairingModal'

function SyncPanel() {
  const {
    status,
    devices,
    pairedDevices,
    config,
    lastSyncTime,
    conflicts,
    loadSyncState,
    startSync,
    stopSync,
    triggerSync,
    generatePairing,
    revokeDevice,
    updateConfig
  } = useSyncStore()
  const { t } = useI18n()
  const [showPairing, setShowPairing] = useState(false)

  useEffect(() => {
    loadSyncState()
  }, [])

  const isEnabled = config?.enabled ?? false
  const connectedDevices = devices.filter((d) => d.isConnected)

  const handleToggleSync = async () => {
    if (isEnabled) {
      await stopSync()
      await updateConfig('enabled', false)
    } else {
      await updateConfig('enabled', true)
      await startSync()
    }
  }

  const handlePair = async () => {
    await generatePairing()
    setShowPairing(true)
  }

  const formatTime = (ts: number | null) => {
    if (!ts) return t('sync.never')
    const d = new Date(ts)
    return d.toLocaleTimeString()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          {t('sync.title')}
        </span>
        <button
          onClick={handleToggleSync}
          className={`rounded-md px-2.5 py-0.5 text-xs font-medium transition-all duration-150 ${
            isEnabled
              ? 'bg-[var(--color-accent)] text-white shadow-sm hover:shadow-md'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
          }`}
        >
          {isEnabled ? t('sync.on') : t('sync.off')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 thin-scrollbar">
        {/* Status */}
        <div className="mb-4">
          <div className="mb-1 text-xs text-[var(--color-text-muted)]">
            {t('sync.statusLabel')}
          </div>
          <div className="text-sm text-[var(--color-text-primary)]">
            {t('sync.status.' + status)}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            {t('sync.lastSync')}: {formatTime(lastSyncTime)}
          </div>
        </div>

        {/* Connected Devices */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-[var(--color-text-muted)] uppercase">
            {t('sync.connectedDevices')} ({connectedDevices.length})
          </div>
          {connectedDevices.length === 0 ? (
            <div className="text-xs text-[var(--color-text-muted)] italic">
              {t('sync.noDevices')}
            </div>
          ) : (
            <div className="space-y-1">
              {connectedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-md border border-[var(--color-border)]
                             bg-[var(--color-bg-primary)] px-2.5 py-1.5"
                >
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                    <SmartphoneIcon size={12} className="text-[var(--color-text-muted)]" />
                    {device.name}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-success)]">
                    {t('sync.connected')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Paired Devices */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-[var(--color-text-muted)] uppercase">
            {t('sync.pairedDevices')} ({pairedDevices.length})
          </div>
          {pairedDevices.map((device) => (
            <div
              key={device.deviceId}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)]
                         bg-[var(--color-bg-primary)] px-2.5 py-1.5 mb-1"
            >
              <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-primary)]">
                <SmartphoneIcon size={12} className="text-[var(--color-text-muted)]" />
                {device.deviceName}
              </span>
              <button
                onClick={() => revokeDevice(device.deviceId)}
                className="text-xs text-[var(--color-danger)] hover:underline transition-colors"
              >
                {t('sync.revoke')}
              </button>
            </div>
          ))}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-[var(--color-danger)] uppercase">
              {t('sync.conflicts')} ({conflicts.length})
            </div>
            {conflicts.map((c) => (
              <div
                key={c.path}
                className="rounded-md border border-[var(--color-danger)] bg-[var(--color-bg-tertiary)] px-2.5 py-1.5 mb-1"
              >
                <div className="text-xs text-[var(--color-text-primary)]">{c.path}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={handlePair}
            disabled={!isEnabled}
            className="w-full rounded-md bg-[var(--color-accent)] px-3 py-2 text-xs font-medium text-white
                       disabled:opacity-50 hover:bg-[var(--color-accent-hover)] shadow-sm hover:shadow-md
                       transition-all duration-150"
          >
            {t('sync.pairDevice')}
          </button>
          <button
            onClick={() => triggerSync()}
            disabled={!isEnabled || connectedDevices.length === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)]
                       px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] disabled:opacity-50
                       hover:bg-[var(--color-bg-tertiary)] transition-all duration-150"
          >
            <RefreshCwIcon size={12} />
            {t('sync.syncNow')}
          </button>
        </div>
      </div>

      {/* Pairing Modal */}
      {showPairing && (
        <PairingModal onClose={() => setShowPairing(false)} />
      )}
    </div>
  )
}

export default SyncPanel
