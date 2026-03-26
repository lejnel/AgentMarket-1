import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { getListingsAPI, createListingAPI, deleteListingAPI, processAgentCommand } from '../services/api'
import { formatPrice, formatDistance } from '../utils/helpers'

interface Listing {
  id: string
  title: string
  price: number
  distance_km: number
  condition_rating: number
  specifications: any
}

export default function AgentApiScreen() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [jsonView, setJsonView] = useState(true)
  const [commandInput, setCommandInput] = useState('')
  const [lastResponse, setLastResponse] = useState<any>(null)

  useEffect(() => {
    fetchListings()
  }, [])

  async function fetchListings() {
    setLoading(true)
    const response = await getListingsAPI({ limit: 20 })
    if (response.success && response.data) {
      setListings(response.data)
    }
    setLoading(false)
  }

  async function handleCommandSubmit() {
    if (!commandInput.trim()) return

    const result = await processAgentCommand(commandInput)
    setLastResponse(result)

    if (result.success && result.data) {
      const { action, query, target } = result.data as any
      if (action === 'search') {
        router.push('/search')
      } else if (action === 'open' && target) {
        // Find listing by partial ID or title
        const found = listings.find(l =>
          l.id.includes(target) || l.title.toLowerCase().includes(target.toLowerCase())
        )
        if (found) {
          router.push(`/listing/${found.id}`)
        } else {
          Alert.alert('Not found', `No listing matching "${target}"`)
        }
      }
    } else if (!result.success) {
      Alert.alert('Command failed', result.error || 'Unknown error')
    }

    setCommandInput('')
  }

  async function handleQuickCreate() {
    Alert.prompt(
      'Quick Create Listing',
      'Enter listing title:',
      async (title) => {
        if (!title || title.length < 5) {
          Alert.alert('Error', 'Title must be at least 5 characters')
          return
        }

        const result = await createListingAPI({
          title,
          price: 100,
          distance_km: 10,
          condition_rating: 0.8,
        })

        if (result.success && result.data) {
          Alert.alert('Success', `Created: ${result.data.title} (${result.data.id.slice(0, 8)})`)
          fetchListings()
        } else {
          Alert.alert('Error', result.error || 'Failed to create listing')
        }
      }
    )
  }

  async function handleDeleteListing(listingId: string, title: string) {
    Alert.alert(
      'Delete Listing',
      `Delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteListingAPI(listingId)
            if (result.success) {
              Alert.alert('Deleted', `Listing ${listingId.slice(0, 8)} removed`)
              fetchListings()
            } else {
              Alert.alert('Error', result.error || 'Failed to delete')
            }
          },
        },
      ]
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AGENT API</Text>
        <Pressable onPress={() => setJsonView(!jsonView)}>
          <Text style={styles.toggleBtn}>
            {jsonView ? '📋 JSON' : '📊 CARDS'}
          </Text>
        </Pressable>
      </View>

      {/* Agent Status */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>CLAW-RASMUS-001</Text>
        </View>
        <Text style={styles.statusBadge}>VERIFIED</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable style={styles.actionBtn} onPress={fetchListings}>
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionLabel}>REFRESH</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/messaging')}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>MESSAGE</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/create-listing')}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionLabel}>CREATE</Text>
        </Pressable>
      </View>

      {/* Command Input */}
      <View style={styles.commandSection}>
        <Text style={styles.sectionTitle}>COMMAND</Text>
        <View style={styles.commandRow}>
          <TextInput
            style={styles.commandInput}
            value={commandInput}
            onChangeText={setCommandInput}
            placeholder="find gpu, open sock, message..."
            placeholderTextColor="#8f9095"
            onSubmitEditing={handleCommandSubmit}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.commandBtn} onPress={handleCommandSubmit}>
            <Text style={styles.commandBtnText}>→</Text>
          </Pressable>
        </View>
        {lastResponse && (
          <View style={styles.responseBox}>
            <Text style={styles.responseText}>
              {JSON.stringify(lastResponse, null, 2)}
            </Text>
          </View>
        )}
      </View>

      {/* Listings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          LISTINGS ({listings.length})
        </Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : jsonView ? (
          <View style={styles.jsonContainer}>
            <Text style={styles.jsonText}>
              {JSON.stringify(listings, null, 2)}
            </Text>
          </View>
        ) : (
          listings.map((listing) => (
            <Pressable
              key={listing.id}
              style={styles.listingCard}
              onPress={() => router.push(`/listing/${listing.id}`)}
            >
              <View style={styles.listingHeader}>
                <Text style={styles.listingId}>{listing.id.slice(0, 8)}</Text>
                <Text style={styles.listingPrice}>
                  {formatPrice(listing.price)}
                </Text>
              </View>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              <View style={styles.listingMeta}>
                <Text style={styles.metaText}>
                  📍 {formatDistance(listing.distance_km)}
                </Text>
                <Text style={styles.metaText}>
                  ⚡ {Math.round(listing.condition_rating * 100)}%
                </Text>
              </View>
              <Pressable
                style={styles.negotiateBtn}
                onPress={() => router.push(`/listing/${listing.id}`)}
              >
                <Text style={styles.negotiateBtnText}>NEGOTIATE →</Text>
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDeleteListing(listing.id, listing.title)}
              >
                <Text style={styles.deleteBtnText}>🗑️</Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </View>

      {/* API Endpoints */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API ENDPOINTS</Text>
        <View style={styles.endpointList}>
          <View style={styles.endpoint}>
            <Text style={styles.endpointMethod}>GET</Text>
            <Text style={styles.endpointPath}>getListingsAPI()</Text>
          </View>
          <View style={styles.endpoint}>
            <Text style={styles.endpointMethod}>POST</Text>
            <Text style={styles.endpointPath}>createListingAPI()</Text>
          </View>
          <View style={styles.endpoint}>
            <Text style={styles.endpointMethod}>POST</Text>
            <Text style={styles.endpointPath}>sendMessageAPI()</Text>
          </View>
          <View style={styles.endpoint}>
            <Text style={styles.endpointMethod}>CMD</Text>
            <Text style={styles.endpointPath}>processAgentCommand()</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  content: {
    padding: 16,
    paddingTop: 48,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00e1ab',
    letterSpacing: 2,
  },
  toggleBtn: {
    fontSize: 12,
    color: '#abc7ff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 12,
    marginBottom: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e1ab',
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#8f9095',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  statusBadge: {
    fontSize: 10,
    color: '#00e1ab',
    fontWeight: '600',
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#131b2e',
    padding: 12,
    alignItems: 'center',
    borderRadius: 4,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 10,
    color: '#abc7ff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  commandSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 8,
  },
  commandRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commandInput: {
    flex: 1,
    backgroundColor: '#131b2e',
    padding: 12,
    color: '#dae2fd',
    fontSize: 14,
    fontFamily: 'monospace',
    borderRadius: 4,
  },
  commandBtn: {
    backgroundColor: '#00e1ab',
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  commandBtnText: {
    fontSize: 20,
    color: '#002f65',
    fontWeight: '700',
  },
  responseBox: {
    marginTop: 8,
    backgroundColor: '#131b2e',
    padding: 12,
    borderRadius: 4,
  },
  responseText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#8f9095',
  },
  loadingText: {
    color: '#8f9095',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
  },
  jsonContainer: {
    backgroundColor: '#131b2e',
    padding: 12,
    borderRadius: 4,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#8f9095',
    lineHeight: 16,
  },
  listingCard: {
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#00e1ab',
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listingId: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#8f9095',
    letterSpacing: 1,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#abc7ff',
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dae2fd',
    marginBottom: 8,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#8f9095',
  },
  negotiateBtn: {
    flex: 1,
    backgroundColor: '#abc7ff',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  negotiateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#002f65',
    letterSpacing: 1,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  deleteBtn: {
    backgroundColor: '#ff6b6b',
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  deleteBtnText: {
    fontSize: 16,
  },
  endpointList: {
    backgroundColor: '#131b2e',
    padding: 12,
  },
  endpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222a3d',
  },
  endpointMethod: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#00e1ab',
    width: 50,
    fontWeight: '700',
  },
  endpointPath: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#8f9095',
  },
})
