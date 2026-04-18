import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button, Surface, List } from 'react-native-paper'
import { router } from 'expo-router'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useAuthStore } from '@/stores/auth-store'

export default function WelcomeScreen() {
  const { currentPath, recentWorkspaces, isLoading, openWorkspace, loadRecent } =
    useWorkspaceStore()
  const { isAuthenticated, user } = useAuthStore()

  useEffect(() => {
    loadRecent()
  }, [])

  useEffect(() => {
    if (currentPath) {
      router.replace('/(main)/explorer')
    }
  }, [currentPath])

  const handleOpenWorkspace = async () => {
    await openWorkspace()
  }

  const handleOpenRecent = async (path: string) => {
    await openWorkspace(path)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>
          AI-Note
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          本地优先的 Markdown 笔记应用
        </Text>
      </View>

      <Button
        mode="contained"
        onPress={handleOpenWorkspace}
        loading={isLoading}
        style={styles.openButton}
        contentStyle={styles.openButtonContent}
      >
        打开工作区
      </Button>

      {!isAuthenticated ? (
        <Button
          mode="text"
          onPress={() => router.push('/auth')}
          icon="account"
          style={styles.authButton}
        >
          登录
        </Button>
      ) : (
        <Text variant="bodyMedium" style={styles.authText}>
          {user?.username}
        </Text>
      )}

      {recentWorkspaces.length > 0 && (
        <Surface style={styles.recentSection} elevation={1}>
          <Text variant="titleMedium" style={styles.recentTitle}>
            最近打开
          </Text>
          {recentWorkspaces.map((ws) => (
            <List.Item
              key={ws.path}
              title={ws.name}
              description={ws.path}
              left={(props) => <List.Icon {...props} icon="folder" />}
              onPress={() => handleOpenRecent(ws.path)}
            />
          ))}
        </Surface>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  openButton: {
    marginBottom: 16,
  },
  authButton: {
    marginBottom: 32,
  },
  authText: {
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 32,
  },
  openButtonContent: {
    paddingVertical: 8,
  },
  recentSection: {
    borderRadius: 12,
    padding: 16,
  },
  recentTitle: {
    marginBottom: 8,
  },
})
