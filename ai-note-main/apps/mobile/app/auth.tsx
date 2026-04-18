import { useState } from 'react'
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { Text, TextInput, Button, HelperText, SegmentedButtons, IconButton } from 'react-native-paper'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/auth-store'

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { login, register, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const displayError = localError || error

  const handleLogin = async () => {
    clearError()
    const success = await login(email, password)
    if (success) router.back()
  }

  const handleRegister = async () => {
    clearError()
    setLocalError('')
    if (password !== confirmPassword) {
      setLocalError('两次密码不一致')
      return
    }
    const success = await register(email, username, password)
    if (success) router.back()
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => router.back()} />
          <Text variant="headlineSmall" style={styles.title}>
            {mode === 'login' ? '登录' : '注册'}
          </Text>
        </View>

        <SegmentedButtons
          value={mode}
          onValueChange={(v) => { setMode(v as 'login' | 'register'); clearError(); setLocalError('') }}
          buttons={[
            { value: 'login', label: '登录' },
            { value: 'register', label: '注册' },
          ]}
          style={styles.segmented}
        />

        {displayError && (
          <HelperText type="error" visible style={styles.error}>
            {displayError}
          </HelperText>
        )}

        <TextInput
          label="邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          mode="outlined"
        />

        {mode === 'register' && (
          <TextInput
            label="用户名"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            mode="outlined"
          />
        )}

        <TextInput
          label="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          mode="outlined"
        />

        {mode === 'register' && (
          <TextInput
            label="确认密码"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            mode="outlined"
          />
        )}

        <Button
          mode="contained"
          onPress={mode === 'login' ? handleLogin : handleRegister}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {mode === 'login' ? '登录' : '注册'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  title: { fontWeight: 'bold', marginLeft: 8 },
  segmented: { marginBottom: 24 },
  error: { marginBottom: 8 },
  input: { marginBottom: 16 },
  button: { marginTop: 8 },
  buttonContent: { paddingVertical: 8 },
})
