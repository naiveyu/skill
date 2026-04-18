import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { View, TextInput, ScrollView, StyleSheet, Pressable } from 'react-native'
import { Appbar, SegmentedButtons, Text } from 'react-native-paper'
import Markdown from 'react-native-markdown-display'
import { useLocalSearchParams, router } from 'expo-router'
import { useEditorStore } from '@/stores/editor-store'
import HistorySheet from '@/components/git/HistorySheet'

// Extract body content from markdown (strip front matter)
function extractBody(content: string): string {
  if (!content.startsWith('---')) return content
  const endIndex = content.indexOf('---', 3)
  if (endIndex === -1) return content
  return content.slice(endIndex + 3).trim()
}

export default function EditorScreen() {
  const { path } = useLocalSearchParams<{ path: string }>()
  const { currentNote, openFile, updateContent, saveFile } = useEditorStore()
  const [mode, setMode] = useState<'wysiwyg' | 'source'>('wysiwyg')
  const [historyVisible, setHistoryVisible] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (path) {
      openFile(path)
    }
  }, [path])

  const handleContentChange = useCallback(
    (text: string) => {
      updateContent(text)
      // Auto-save with 1s debounce
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveFile()
      }, 1000)
    },
    [updateContent, saveFile]
  )

  const handleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveFile()
  }, [saveFile])

  const title = currentNote?.title || path?.split('/').pop()?.replace('.md', '') || '编辑'
  const bodyContent = useMemo(
    () => extractBody(currentNote?.content ?? ''),
    [currentNote?.content]
  )

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={title} />
        <Appbar.Action icon="content-save" onPress={handleSave} />
        <Appbar.Action
          icon="history"
          onPress={() => setHistoryVisible(true)}
        />
      </Appbar.Header>

      {/* Mode toggle */}
      <View style={styles.toolbar}>
        <SegmentedButtons
          value={mode}
          onValueChange={(v) => setMode(v as 'wysiwyg' | 'source')}
          buttons={[
            { value: 'wysiwyg', label: '所见即所得' },
            { value: 'source', label: '源码' },
          ]}
          density="small"
        />
      </View>

      {/* Editor area */}
      {mode === 'source' ? (
        <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled">
          <TextInput
            value={currentNote?.content ?? ''}
            onChangeText={handleContentChange}
            multiline
            style={styles.sourceEditor}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </ScrollView>
      ) : (
        <ScrollView style={styles.editorScroll}>
          {bodyContent ? (
            <Pressable
              style={styles.markdownContainer}
              onLongPress={() => setMode('source')}
            >
              <Markdown style={markdownStyles}>{bodyContent}</Markdown>
              <Text variant="labelSmall" style={styles.editHint}>
                长按切换到源码编辑
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.emptyContent}
              onPress={() => setMode('source')}
            >
              <Text variant="bodyLarge" style={styles.emptyText}>
                点击开始编辑
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {path && (
        <HistorySheet
          filePath={path}
          visible={historyVisible}
          onDismiss={() => setHistoryVisible(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editorScroll: {
    flex: 1,
  },
  sourceEditor: {
    flex: 1,
    padding: 16,
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    minHeight: 500,
  },
  markdownContainer: {
    padding: 16,
    minHeight: 300,
  },
  editHint: {
    marginTop: 24,
    textAlign: 'center',
    opacity: 0.4,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    opacity: 0.5,
  },
})

const markdownStyles = StyleSheet.create({
  heading1: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 16,
  },
  heading2: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 14,
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 10,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 26,
  },
  code_inline: {
    fontFamily: 'monospace',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  fence: {
    fontFamily: 'monospace',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 8,
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.8,
  },
  link: {
    color: '#6366f1',
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
})
