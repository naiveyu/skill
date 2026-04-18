import { useState } from 'react'
import { useI18n } from '../../i18n'
import Modal from '../common/Modal'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

interface AuthScreenProps {
  isOpen: boolean
  onClose: () => void
}

function AuthScreen({ isOpen, onClose }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { t } = useI18n()

  const title = mode === 'login' ? t('auth.signIn') : t('auth.signUp')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      {mode === 'login' ? (
        <LoginForm onSwitchToRegister={() => setMode('register')} />
      ) : (
        <RegisterForm onSwitchToLogin={() => setMode('login')} />
      )}
    </Modal>
  )
}

export default AuthScreen
