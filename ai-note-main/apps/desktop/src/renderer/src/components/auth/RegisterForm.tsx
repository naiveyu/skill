import { useState, FormEvent } from 'react'
import { useAuthStore } from '../../stores/auth-store'
import { useI18n } from '../../i18n'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuthStore()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError(t('auth.passwordMismatch'))
      return
    }

    await register(email, username, password)
  }

  const displayError = localError || error

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {displayError && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {displayError}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
          {t('auth.email')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                     px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none
                     focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
          {t('auth.username')}
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          maxLength={50}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                     px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none
                     focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
          {t('auth.password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                     px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none
                     focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
          {t('auth.confirmPassword')}
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]
                     px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none
                     focus:border-[var(--color-accent)]"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-1 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white
                   hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isLoading ? t('auth.signingUp') : t('auth.signUp')}
      </button>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        {t('auth.hasAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[var(--color-accent)] hover:underline"
        >
          {t('auth.signIn')}
        </button>
      </p>
    </form>
  )
}

export default RegisterForm
