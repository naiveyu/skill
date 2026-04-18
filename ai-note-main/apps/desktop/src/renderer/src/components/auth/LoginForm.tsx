import { useState, FormEvent } from 'react'
import { useAuthStore } from '../../stores/auth-store'
import { useI18n } from '../../i18n'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuthStore()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    await login(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-500">
          {error}
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

      <button
        type="submit"
        disabled={isLoading}
        className="mt-1 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white
                   hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {isLoading ? t('auth.signingIn') : t('auth.signIn')}
      </button>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        {t('auth.noAccount')}{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[var(--color-accent)] hover:underline"
        >
          {t('auth.signUp')}
        </button>
      </p>
    </form>
  )
}

export default LoginForm
