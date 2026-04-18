import { useSyncStore } from '../../stores/sync-store'
import { useI18n } from '../../i18n'
import { WifiIcon, RefreshCwIcon } from '../common/Icons'

function SyncStatusIndicator() {
  const { status, devices } = useSyncStore()
  const { t } = useI18n()

  const connectedCount = devices.filter((d) => d.isConnected).length

  const getStatusColor = () => {
    switch (status) {
      case 'syncing': return 'var(--color-accent)'
      case 'discovering':
      case 'connecting': return 'var(--color-warning)'
      case 'error': return 'var(--color-danger)'
      default: return 'var(--color-text-muted)'
    }
  }

  const isSyncing = status === 'syncing'
  const label = connectedCount > 0
    ? `${t('sync.status.' + status)} (${connectedCount})`
    : t('sync.status.' + status)

  return (
    <span
      className="flex items-center gap-1.5 text-xs"
      title={label}
    >
      <span style={{ color: getStatusColor() }} className={isSyncing ? 'animate-pulse-dot' : ''}>
        {connectedCount > 0 ? <WifiIcon size={12} /> : <RefreshCwIcon size={11} />}
      </span>
      <span className="text-[var(--color-text-muted)]">
        {t('sync.title')}
      </span>
    </span>
  )
}

export default SyncStatusIndicator
