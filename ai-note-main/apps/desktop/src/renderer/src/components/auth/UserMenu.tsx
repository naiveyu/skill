import { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../../stores/auth-store'
import { useI18n } from '../../i18n'
import { UserIcon } from '../common/Icons'

interface UserMenuProps {
  onSignInClick: () => void
}

function UserMenu({ onSignInClick }: UserMenuProps) {
  const { isAuthenticated, user, logout } = useAuthStore()
  const { t } = useI18n()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isAuthenticated) {
    return (
      <button
        onClick={onSignInClick}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-xs
                   text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]
                   hover:bg-[var(--color-bg-tertiary)] transition-colors"
      >
        <UserIcon size={12} />
        <span>{t('auth.signIn')}</span>
      </button>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 rounded px-2 py-0.5 text-xs
                   text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
                   hover:bg-[var(--color-bg-tertiary)] transition-colors"
      >
        <UserIcon size={12} />
        <span>{user?.username}</span>
      </button>

      {showMenu && (
        <div
          className="absolute bottom-full right-0 mb-1 w-40 rounded-md border border-[var(--color-border)]
                     bg-[var(--color-bg-primary)] py-1"
          style={{ boxShadow: 'var(--shadow-float)' }}
        >
          <div className="px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
            {user?.email}
          </div>
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            onClick={() => { logout(); setShowMenu(false) }}
            className="w-full px-3 py-1.5 text-left text-xs text-[var(--color-text-secondary)]
                       hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
