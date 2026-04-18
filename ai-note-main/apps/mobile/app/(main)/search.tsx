import { useCallback, useRef } from 'react'
import { View, FlatList, StyleSheet } from 'react-native'
import { Searchbar, Text, List, Divider } from 'react-native-paper'
import { router } from 'expo-router'
import { useSearchStore } from '@/stores/search-store'
import { useFileStore } from '@/stores/file-store'
import type { SearchResult } from '@ai-note/shared-types'

export default function SearchScreen() {
  const { query, results, isSearching, setQuery, search, clearSearch } = useSearchStore()
  const selectFile = useFileStore((s) => s.selectFile)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleQueryChange = useCallback(
    (text: string) => {
      setQuery(text)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (text.trim()) {
        debounceRef.current = setTimeout(() => search(text), 300)
      } else {
        clearSearch()
      }
    },
    [setQuery, search, clearSearch]
  )

  const handleResultPress = (result: SearchResult) => {
    router.push({
      pathname: '/editor/[path]',
      params: { path: result.filePath },
    })
  }

  const renderResult = ({ item }: { item: SearchResult }) => (
    <List.Item
      title={item.fileName}
      description={
        item.matches.length > 0
          ? item.matches
              .slice(0, 3)
              .map((m) => m.lineContent.trim())
              .join('\n')
          : undefined
      }
      descriptionNumberOfLines={3}
      left={(props) => <List.Icon {...props} icon="file-document-outline" />}
      onPress={() => handleResultPress(item)}
    />
  )

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="搜索笔记..."
        value={query}
        onChangeText={handleQueryChange}
        loading={isSearching}
        style={styles.searchbar}
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.filePath}
        renderItem={renderResult}
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={
          query.trim() ? (
            <View style={styles.empty}>
              <Text variant="bodyLarge">{isSearching ? '搜索中...' : '无匹配结果'}</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchbar: {
    margin: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
})
