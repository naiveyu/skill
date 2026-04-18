import { useEffect, useCallback, useState } from 'react'
import { View, FlatList, StyleSheet, Alert } from 'react-native'
import {
  Text,
  List,
  FAB,
  Divider,
  Portal,
  Dialog,
  TextInput,
  Button,
  RadioButton,
} from 'react-native-paper'
import { router } from 'expo-router'
import { useFileStore } from '@/stores/file-store'
import type { FileNode } from '@ai-note/shared-types'

export default function ExplorerScreen() {
  const {
    tree,
    selectedFileId,
    expandedFolders,
    loadFileTree,
    selectFile,
    toggleFolder,
    createFile,
    createFolder,
    deleteFile,
  } = useFileStore()

  const [dialogVisible, setDialogVisible] = useState(false)
  const [createType, setCreateType] = useState<'file' | 'folder'>('file')
  const [inputName, setInputName] = useState('')
  const [createInFolder, setCreateInFolder] = useState('')

  useEffect(() => {
    loadFileTree()
  }, [])

  // Flatten tree for FlatList rendering
  const flattenTree = useCallback(
    (nodes: FileNode[], depth = 0): Array<FileNode & { depth: number }> => {
      const result: Array<FileNode & { depth: number }> = []
      for (const node of nodes) {
        result.push({ ...node, depth })
        if (node.type === 'folder' && expandedFolders.has(node.id) && node.children) {
          result.push(...flattenTree(node.children, depth + 1))
        }
      }
      return result
    },
    [expandedFolders]
  )

  const flatTree = flattenTree(tree)

  const handlePress = (node: FileNode) => {
    if (node.type === 'folder') {
      toggleFolder(node.id)
    } else {
      selectFile(node.id)
      router.push({
        pathname: '/editor/[path]',
        params: { path: node.path },
      })
    }
  }

  const handleLongPress = (node: FileNode) => {
    const actions: Array<{ text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }> = []

    if (node.type === 'folder') {
      actions.push({
        text: '在此文件夹新建',
        onPress: () => {
          setCreateInFolder(node.path)
          setCreateType('file')
          setInputName('')
          setDialogVisible(true)
        },
      })
    }

    actions.push({
      text: '删除',
      style: 'destructive',
      onPress: () => {
        Alert.alert('确认删除', `确定删除「${node.name}」？`, [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: () => deleteFile(node.path),
          },
        ])
      },
    })

    actions.push({ text: '取消', style: 'cancel' })
    Alert.alert(node.name, undefined, actions)
  }

  const handleCreate = async () => {
    const name = inputName.trim()
    if (!name) return

    try {
      if (createType === 'file') {
        const path = await createFile(createInFolder, name)
        setDialogVisible(false)
        setInputName('')
        setCreateInFolder('')
        // Open the new file in editor
        router.push({
          pathname: '/editor/[path]',
          params: { path },
        })
      } else {
        await createFolder(createInFolder, name)
        setDialogVisible(false)
        setInputName('')
        setCreateInFolder('')
      }
    } catch (e: any) {
      Alert.alert('创建失败', e.message)
    }
  }

  const renderItem = ({ item }: { item: FileNode & { depth: number } }) => {
    const isFolder = item.type === 'folder'
    const isExpanded = expandedFolders.has(item.id)
    const isSelected = selectedFileId === item.id

    return (
      <List.Item
        title={item.name}
        style={[styles.item, { paddingLeft: 16 + item.depth * 20 }, isSelected && styles.selected]}
        left={(props) => (
          <List.Icon
            {...props}
            icon={isFolder ? (isExpanded ? 'folder-open' : 'folder') : 'file-document-outline'}
          />
        )}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={flatTree}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge">暂无文件</Text>
            <Text variant="bodySmall" style={styles.emptyHint}>
              点击右下角 + 创建笔记
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          setCreateInFolder('')
          setCreateType('file')
          setInputName('')
          setDialogVisible(true)
        }}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{createInFolder ? `在 ${createInFolder} 中新建` : '新建'}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              value={createType}
              onValueChange={(v) => setCreateType(v as 'file' | 'folder')}
            >
              <View style={styles.radioRow}>
                <RadioButton.Item label="笔记" value="file" />
                <RadioButton.Item label="文件夹" value="folder" />
              </View>
            </RadioButton.Group>
            <TextInput
              label={createType === 'file' ? '笔记名称' : '文件夹名称'}
              value={inputName}
              onChangeText={setInputName}
              autoFocus
              onSubmitEditing={handleCreate}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>取消</Button>
            <Button onPress={handleCreate} disabled={!inputName.trim()}>
              创建
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    paddingVertical: 4,
  },
  selected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyHint: {
    marginTop: 8,
    opacity: 0.5,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  radioRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
})
