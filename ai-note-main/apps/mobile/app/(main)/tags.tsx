import { useEffect } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Text, Chip, List, Divider, Button } from 'react-native-paper'
import { router } from 'expo-router'
import { useTagStore } from '@/stores/tag-store'
import type { Tag } from '@ai-note/shared-types'

export default function TagsScreen() {
  const { tags, selectedTag, filteredNotes, loadTags, selectTag, clearFilter } = useTagStore()

  useEffect(() => {
    loadTags()
  }, [])

  const handleTagPress = (tag: Tag) => {
    if (selectedTag === tag.name) {
      clearFilter()
    } else {
      selectTag(tag.name)
    }
  }

  const handleNotePress = (notePath: string) => {
    router.push({
      pathname: '/editor/[path]',
      params: { path: notePath },
    })
  }

  return (
    <View style={styles.container}>
      {/* Tag chips */}
      <View style={styles.tagSection}>
        <View style={styles.tagHeader}>
          <Text variant="titleMedium">所有标签</Text>
          {selectedTag && (
            <Button mode="text" compact onPress={clearFilter}>
              清除筛选
            </Button>
          )}
        </View>
        <View style={styles.tagList}>
          {tags.map((tag) => (
            <Chip
              key={tag.id}
              selected={selectedTag === tag.name}
              onPress={() => handleTagPress(tag)}
              style={styles.tag}
            >
              {tag.name} ({tag.count})
            </Chip>
          ))}
          {tags.length === 0 && (
            <Text variant="bodyMedium" style={styles.emptyText}>
              暂无标签
            </Text>
          )}
        </View>
      </View>

      {/* Filtered notes */}
      {selectedTag && (
        <View style={styles.notesSection}>
          <Text variant="titleMedium" style={styles.notesTitle}>
            「{selectedTag}」下的笔记
          </Text>
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <List.Item
                title={item.split('/').pop()?.replace('.md', '') || item}
                description={item}
                left={(props) => <List.Icon {...props} icon="file-document-outline" />}
                onPress={() => handleNotePress(item)}
              />
            )}
            ItemSeparatorComponent={Divider}
            ListEmptyComponent={
              <Text variant="bodyMedium" style={styles.emptyText}>
                该标签下暂无笔记
              </Text>
            }
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tagSection: {
    padding: 16,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    marginBottom: 4,
  },
  notesSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notesTitle: {
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.5,
    textAlign: 'center',
    paddingTop: 20,
  },
})
