import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import { View, StyleSheet, Alert, ScrollView } from 'react-native'
import { Text, Button, TextInput, ActivityIndicator, Divider } from 'react-native-paper'
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet'
import { useVersionStore } from '@/stores/version-store'
import { useEditorStore } from '@/stores/editor-store'
import type { GitCommit } from '@ai-note/shared-types'

interface HistorySheetProps {
  filePath: string
  visible: boolean
  onDismiss: () => void
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp * 1000
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (weeks < 4) return `${weeks} 周前`
  return `${months} 个月前`
}

export default function HistorySheet({ filePath, visible, onDismiss }: HistorySheetProps) {
  const {
    versions,
    selectedSha,
    versionContent,
    isLoadingContent,
    isSaving,
    loadVersions,
    selectVersion,
    clearSelection,
    saveVersion,
    restoreVersion,
  } = useVersionStore()
  const { saveFile, reloadFile } = useEditorStore()

  const [description, setDescription] = useState('')
  const bottomSheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['60%', '90%'], [])

  useEffect(() => {
    if (visible) {
      loadVersions(filePath)
      bottomSheetRef.current?.expand()
    } else {
      bottomSheetRef.current?.close()
    }
  }, [visible, filePath])

  const handleSaveVersion = useCallback(async () => {
    if (!description.trim()) return
    try {
      await saveFile()
      await saveVersion(filePath, description.trim())
      await reloadFile(filePath)
      setDescription('')
    } catch (e: any) {
      Alert.alert('保存失败', e.message)
    }
  }, [filePath, description, saveFile, saveVersion, reloadFile])

  const handleVersionPress = useCallback(
    (sha: string) => {
      if (selectedSha === sha) {
        clearSelection()
      } else {
        selectVersion(sha, filePath)
      }
    },
    [filePath, selectedSha, selectVersion, clearSelection]
  )

  const handleRestore = useCallback(async () => {
    if (!selectedSha) return
    Alert.alert('恢复版本', '确定恢复到此版本？当前未保存的修改将丢失。', [
      { text: '取消', style: 'cancel' },
      {
        text: '恢复',
        style: 'destructive',
        onPress: async () => {
          try {
            await restoreVersion(filePath, selectedSha)
            clearSelection()
            await reloadFile(filePath)
            loadVersions(filePath)
          } catch (e: any) {
            Alert.alert('恢复失败', e.message)
          }
        },
      },
    ])
  }, [filePath, selectedSha, restoreVersion, clearSelection, reloadFile, loadVersions])

  const renderVersionItem = useCallback(
    ({ item }: { item: GitCommit }) => {
      const isSelected = selectedSha === item.sha
      return (
        <View
          style={[styles.versionItem, isSelected && styles.versionItemSelected]}
        >
          <Button
            mode="text"
            compact
            contentStyle={styles.versionButton}
            onPress={() => handleVersionPress(item.sha)}
          >
            <View style={styles.versionContent}>
              <Text variant="bodyMedium" numberOfLines={1} style={styles.versionMessage}>
                {item.message}
              </Text>
              <Text variant="labelSmall" style={styles.versionTime}>
                {formatRelativeTime(item.author.timestamp)}
              </Text>
            </View>
          </Button>
        </View>
      )
    },
    [selectedSha, handleVersionPress]
  )

  if (!visible) return null

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onDismiss}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="titleMedium">版本历史</Text>
      </View>

      {/* Save version input */}
      <View style={styles.saveRow}>
        <TextInput
          mode="outlined"
          dense
          placeholder="版本描述"
          value={description}
          onChangeText={setDescription}
          onSubmitEditing={handleSaveVersion}
          style={styles.saveInput}
        />
        <Button
          mode="contained"
          compact
          onPress={handleSaveVersion}
          disabled={!description.trim() || isSaving}
          loading={isSaving}
          style={styles.saveButton}
        >
          保存
        </Button>
      </View>

      <Divider />

      {/* Version preview (when selected) */}
      {selectedSha && (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text variant="labelLarge">版本预览</Text>
            <Button mode="contained-tonal" compact onPress={handleRestore}>
              恢复此版本
            </Button>
          </View>
          <ScrollView style={styles.previewScroll}>
            {isLoadingContent ? (
              <ActivityIndicator style={styles.loading} />
            ) : (
              <Text variant="bodySmall" style={styles.previewText}>
                {versionContent}
              </Text>
            )}
          </ScrollView>
          <Divider />
        </View>
      )}

      {/* Version list */}
      <BottomSheetFlatList
        data={versions}
        keyExtractor={(item) => item.sha}
        renderItem={renderVersionItem}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              暂无版本记录
            </Text>
            <Text variant="bodySmall" style={styles.emptyHint}>
              输入描述并保存以创建第一个版本
            </Text>
          </View>
        }
      />
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  saveInput: {
    flex: 1,
    height: 40,
  },
  saveButton: {
    marginTop: 6,
  },
  versionItem: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  versionItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  versionButton: {
    justifyContent: 'flex-start',
  },
  versionContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  versionMessage: {
    fontWeight: '500',
  },
  versionTime: {
    opacity: 0.5,
    marginTop: 2,
  },
  previewContainer: {
    maxHeight: 200,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  previewScroll: {
    paddingHorizontal: 16,
    maxHeight: 140,
  },
  previewText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  loading: {
    paddingVertical: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    opacity: 0.6,
  },
  emptyHint: {
    opacity: 0.4,
    marginTop: 4,
  },
})
