import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { searchListings as searchListingsService } from '../services/listings'
import { truncate, formatPrice, formatDistance } from '../utils/helpers'
import { calculateListingDistanceKm, readStoredMarketplaceLocation } from '../utils/location'

interface SearchResult {
  id: string
  title: string
  price: number
  distance_km: number
  condition_rating: number
}

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'GPU',
    'industrial',
    'controller',
  ])

  const runSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const viewerLocation = readStoredMarketplaceLocation()
      const data = await searchListingsService(searchQuery)
      setResults(data.map((listing) => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        distance_km: calculateListingDistanceKm(listing, viewerLocation),
        condition_rating: listing.condition_rating,
      })))
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, runSearch])

  function handleRecentSearch(recent: string) {
    setQuery(recent)
  }

  function handleResultPress(item: SearchResult) {
    router.push(`/listing/${item.id}`)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SEARCH</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search listings..."
          placeholderTextColor="#8f9095"
          autoFocus
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#abc7ff" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : query.length === 0 ? (
        // Recent Searches
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>RECENT SEARCHES</Text>
          {recentSearches.map((recent, idx) => (
            <Pressable
              key={idx}
              style={styles.recentItem}
              onPress={() => handleRecentSearch(recent)}
            >
              <Text style={styles.recentIcon}>🕐</Text>
              <Text style={styles.recentText}>{recent}</Text>
            </Pressable>
          ))}
        </View>
      ) : results.length === 0 ? (
        // No Results
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try a different search term
          </Text>
        </View>
      ) : (
        // Results
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultItem}
              onPress={() => handleResultPress(item)}
            >
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle}>{truncate(item.title, 40)}</Text>
                <View style={styles.resultMeta}>
                  <Text style={styles.resultPrice}>{formatPrice(item.price)}</Text>
                  <Text style={styles.resultDot}>•</Text>
                  <Text style={styles.resultDistance}>{formatDistance(item.distance_km)}</Text>
                </View>
              </View>
              <Text style={styles.resultArrow}>→</Text>
            </Pressable>
          )}
          contentContainerStyle={styles.resultsList}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#abc7ff',
  },
  headerTitle: {
    fontSize: 12,
    color: '#8f9095',
    letterSpacing: 2,
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#dae2fd',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnText: {
    fontSize: 16,
    color: '#8f9095',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#abc7ff',
    marginTop: 12,
    fontSize: 12,
  },
  recentContainer: {
    padding: 20,
  },
  recentTitle: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222a3d',
  },
  recentIcon: {
    fontSize: 16,
    marginRight: 12,
    opacity: 0.5,
  },
  recentText: {
    fontSize: 14,
    color: '#dae2fd',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dae2fd',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8f9095',
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dae2fd',
    marginBottom: 6,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultPrice: {
    fontSize: 12,
    color: '#abc7ff',
  },
  resultDot: {
    color: '#8f9095',
    marginHorizontal: 8,
  },
  resultDistance: {
    fontSize: 12,
    color: '#8f9095',
  },
  resultArrow: {
    fontSize: 18,
    color: '#abc7ff',
  },
})
