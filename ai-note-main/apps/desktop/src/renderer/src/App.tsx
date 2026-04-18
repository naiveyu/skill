import { useEffect, useState } from 'react'
import { useWorkspaceStore } from './stores/workspace-store'
import { useFileStore } from './stores/file-store'
import { useTagStore } from './stores/tag-store'
import { useSettingsStore } from './stores/settings-store'
import { useSyncStore } from './stores/sync-store'
import { useAuthStore } from './stores/auth-store'
import { initUpdateListener, scheduleDelayedCheck } from './stores/update-store'
import { useI18n } from './i18n'
import { useEditorStore } from './stores/editor-store'
import { AppLogoIcon, FolderOpenIcon } from './components/common/Icons'
import MainLayout from './components/layout/MainLayout'
import UpdateModal, { UpdateToast } from './components/update/UpdateModal'
import LoginForm from './components/auth/LoginForm'
import RegisterForm from './components/auth/RegisterForm'

function App() {
  const { currentPath, isLoading, openWorkspace, loadCurrent, loadRecent } =
    useWorkspaceStore()
  const { loadFileTree } = useFileStore()
  const { loadTags } = useTagStore()
  const { loadConfig, detectTheme } = useSettingsStore()
  const { t } = useI18n()

  const { loadAuthState, isAuthenticated } = useAuthStore()
  const [authReady, setAuthReady] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  // Initialize app on mount
  useEffect(() => {
    const init = async () => {
      await loadConfig()
      detectTheme()
      await loadAuthState()
      setAuthReady(true)
      // Schedule delayed update check (2 min after startup)
      scheduleDelayedCheck()
      await loadCurrent()
      await loadRecent()
    }
    init()

    // Subscribe to auto-update status events
    const unsubUpdate = initUpdateListener()
    return () => unsubUpdate()
  }, [])

  // Load file tree and tags when workspace changes, then restore session
  useEffect(() => {
    if (currentPath) {
      const init = async () => {
        await loadFileTree()
        await loadTags()
        await useEditorStore.getState().restoreSession()
      }
      init()
    }
  }, [currentPath])

  // Subscribe to file changes and reload tree
  useEffect(() => {
    if (!currentPath) return

    const unsubscribe = window.electronAPI.file.onFileChange(() => {
      loadFileTree()
    })

    return () => {
      unsubscribe()
    }
  }, [currentPath])

  // Subscribe to sync events when workspace is loaded
  useEffect(() => {
    if (!currentPath) return

    const {
      loadSyncState, setStatus, addDevice, removeDevice, setProgress, setConflicts
    } = useSyncStore.getState()
    loadSyncState()

    const unsub1 = window.electronAPI.sync.onStatusChanged(setStatus)
    const unsub2 = window.electronAPI.sync.onDeviceConnected(addDevice)
    const unsub3 = window.electronAPI.sync.onDeviceDisconnected((id) => removeDevice(id))
    const unsub4 = window.electronAPI.sync.onProgress(setProgress)
    const unsub5 = window.electronAPI.sync.onConflict(setConflicts)

    return () => {
      unsub1(); unsub2(); unsub3(); unsub4(); unsub5()
    }
  }, [currentPath])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => detectTheme()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Loading state while checking auth
  if (!authReady) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-primary)]">
        <div className="h-9 flex-shrink-0 titlebar-drag absolute top-0 left-0 right-0" />
        <div className="flex flex-col items-center gap-4">
          <AppLogoIcon size={56} />
          <p className="text-sm text-[var(--color-text-muted)]">{t('app.opening')}</p>
        </div>
      </div>
    )
  }

  // Auth gate: must login/register before using the app
  if (!isAuthenticated) {
    return (
      <div className="flex h-full w-full flex-col bg-[var(--color-bg-primary)]">
        <div className="h-9 flex-shrink-0 titlebar-drag" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex flex-col items-center gap-3">
              <AppLogoIcon size={56} />
              <div className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                {t('app.name')}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t('app.description')}
              </p>
            </div>
            {authMode === 'login' ? (
              <LoginForm onSwitchToRegister={() => setAuthMode('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setAuthMode('login')} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // Welcome screen when no workspace is loaded
  if (!currentPath) {
    return (
      <>
        <div className="flex h-full w-full flex-col bg-[var(--color-bg-primary)]">
          <div className="h-9 flex-shrink-0 titlebar-drag" />
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div>
              <AppLogoIcon size={72} />
            </div>
            <div className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              {t('app.name')}
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t('app.description')}
            </p>
            <button
              onClick={openWorkspace}
              disabled={isLoading}
              className="rounded-xl bg-[var(--color-accent)] px-8 py-3.5 text-white font-medium
                         hover:bg-[var(--color-accent-hover)] shadow-md hover:shadow-lg
                         transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? t('app.opening') : t('workspace.open')}
            </button>

            {/* Recent workspaces */}
            <RecentWorkspaces />
          </div>
        </div>
        <UpdateToast />
        <UpdateModal />
      </>
    )
  }

  return (
    <>
      <MainLayout />
      <UpdateToast />
      <UpdateModal />
    </>
  )
}

// Sub-component: recent workspaces list
function RecentWorkspaces() {
  const { recentWorkspaces } = useWorkspaceStore()
  const { t } = useI18n()

  if (recentWorkspaces.length === 0) return null

  return (
    <div className="mt-4 w-full max-w-md">
      <h3 className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
        {t('workspace.recent')}
      </h3>
      <div className="flex flex-col gap-1.5">
        {recentWorkspaces.map((ws) => (
          <button
            key={ws.path}
            onClick={async () => {
              await window.electronAPI.workspace.open(ws.path)
              useWorkspaceStore.getState().loadCurrent()
            }}
            className="flex items-center gap-2.5 rounded-lg border border-[var(--color-border)]
                       px-3 py-2.5 text-left text-sm text-[var(--color-text-primary)]
                       hover:bg-[var(--color-bg-tertiary)] hover:border-[var(--color-text-muted)]
                       transition-all duration-150"
          >
            <span className="flex-shrink-0" style={{ color: '#5a9bcf' }}>
              <FolderOpenIcon size={16} />
            </span>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate font-medium">{ws.name}</span>
              <span className="truncate text-xs text-[var(--color-text-muted)]">
                {ws.path}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default App
