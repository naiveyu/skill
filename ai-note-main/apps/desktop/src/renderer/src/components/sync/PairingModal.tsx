import { useEffect, useState } from 'react'
import { useSyncStore } from '../../stores/sync-store'
import { useI18n } from '../../i18n'
import Modal from '../common/Modal'

interface PairingModalProps {
  onClose: () => void
}

function PairingModal({ onClose }: PairingModalProps) {
  const { pairingInfo, generatePairing, clearPairing } = useSyncStore()
  const { t } = useI18n()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!pairingInfo) {
      generatePairing()
    }
  }, [])

  useEffect(() => {
    if (pairingInfo?.qrPayload) {
      // Dynamically import qrcode to generate QR as data URL
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(pairingInfo.qrPayload, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        }).then((url: string) => {
          setQrDataUrl(url)
        })
      }).catch(() => {
        // QRCode generation failed, show PIN only
      })
    }
  }, [pairingInfo?.qrPayload])

  const handleClose = () => {
    clearPairing()
    onClose()
  }

  const pin = pairingInfo?.pin || '------'

  // Calculate remaining time
  const [remaining, setRemaining] = useState(300)
  useEffect(() => {
    if (!pairingInfo) return
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((pairingInfo.expiresAt - Date.now()) / 1000))
      setRemaining(secs)
      if (secs === 0) {
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [pairingInfo])

  return (
    <Modal onClose={handleClose} title={t('sync.pairDevice')}>
      <div className="flex flex-col items-center gap-4 p-4">
        {/* QR Code */}
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code"
            className="rounded-lg border border-[var(--color-border)] shadow-sm"
            width={200}
            height={200}
          />
        ) : (
          <div className="flex h-[200px] w-[200px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
            <span className="text-sm text-[var(--color-text-muted)]">
              {t('sync.generatingQR')}
            </span>
          </div>
        )}

        {/* PIN */}
        <div className="text-center">
          <div className="text-xs text-[var(--color-text-muted)] mb-1">
            {t('sync.orEnterPIN')}
          </div>
          <div className="text-3xl font-mono font-bold tracking-[0.3em] text-[var(--color-text-primary)]">
            {pin}
          </div>
        </div>

        {/* Timer */}
        <div className="text-xs text-[var(--color-text-muted)]">
          {remaining > 0
            ? `${t('sync.expiresIn')} ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
            : t('sync.expired')}
        </div>

        {/* Refresh button */}
        {remaining === 0 && (
          <button
            onClick={() => generatePairing()}
            className="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white
                       hover:bg-[var(--color-accent-hover)] shadow-sm transition-all duration-150"
          >
            {t('sync.refreshPIN')}
          </button>
        )}
      </div>
    </Modal>
  )
}

export default PairingModal
