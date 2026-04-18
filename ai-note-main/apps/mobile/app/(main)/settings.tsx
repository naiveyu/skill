import { View, ScrollView, StyleSheet } from 'react-native'
import { Text, List, Switch, Divider, Surface, Button } from 'react-native-paper'
import { router } from 'expo-router'
import { useSettingsStore } from '@/stores/settings-store'
import { useAuthStore } from '@/stores/auth-store'
import { APP_NAME } from '@ai-note/shared-types'

export default function SettingsScreen() {
  const { config, theme, updateConfig } = useSettingsStore()
  const { isAuthenticated, user, logout } = useAuthStore()

  const handleThemeToggle = () => {
    const newTheme = config?.appearance.theme === 'dark' ? 'light' : 'dark'
    updateConfig('appearance.theme', newTheme)
  }

  const handleAutoCommitToggle = () => {
    updateConfig('git.autoCommit', !config?.git.autoCommit)
  }

  return (
    <ScrollView style={styles.container}>
      {/* Account */}
      <List.Section>
        <List.Subheader>账号</List.Subheader>
        {isAuthenticated ? (
          <>
            <List.Item
              title={user?.username}
              description={user?.email}
              left={(props) => <List.Icon {...props} icon="account" />}
            />
            <Button mode="outlined" onPress={logout} style={{ marginHorizontal: 16, marginBottom: 8 }}>
              退出登录
            </Button>
          </>
        ) : (
          <Button
            mode="contained"
            onPress={() => router.push('/auth')}
            icon="login"
            style={{ marginHorizontal: 16, marginBottom: 8 }}
          >
            登录 / 注册
          </Button>
        )}
      </List.Section>
      <Divider />

      {/* Appearance */}
      <List.Section>
        <List.Subheader>外观</List.Subheader>
        <List.Item
          title="深色模式"
          right={() => <Switch value={theme === 'dark'} onValueChange={handleThemeToggle} />}
        />
      </List.Section>
      <Divider />

      {/* Editor */}
      <List.Section>
        <List.Subheader>编辑器</List.Subheader>
        <List.Item
          title="默认编辑模式"
          description={config?.editor.defaultMode === 'wysiwyg' ? '所见即所得' : '源码模式'}
          onPress={() => {
            const newMode = config?.editor.defaultMode === 'wysiwyg' ? 'source' : 'wysiwyg'
            updateConfig('editor.defaultMode', newMode)
          }}
        />
        <List.Item title="字体大小" description={`${config?.editor.fontSize || 16}px`} />
      </List.Section>
      <Divider />

      {/* Git */}
      <List.Section>
        <List.Subheader>版本控制</List.Subheader>
        <List.Item
          title="自动提交"
          right={() => (
            <Switch
              value={config?.git.autoCommit ?? true}
              onValueChange={handleAutoCommitToggle}
            />
          )}
        />
        <List.Item
          title="提交策略"
          description={
            config?.git.autoCommitStrategy === 'immediate'
              ? '即时'
              : config?.git.autoCommitStrategy === 'interval'
                ? '定时'
                : '手动'
          }
        />
      </List.Section>
      <Divider />

      {/* About */}
      <List.Section>
        <List.Subheader>关于</List.Subheader>
        <List.Item title={APP_NAME} description="v0.1.0" />
      </List.Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
