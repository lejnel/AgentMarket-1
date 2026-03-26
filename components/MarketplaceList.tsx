import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { useRouter } from 'expo-router'
import AgentCard from './AgentCard'
import { getListings, Listing } from '../services/listings'
import { useAgentIdentity } from '../context/AgentIdentityContext'
import { searchLocationSuggestions } from '../services/locationSearch'
import {
  calculateListingDistanceKm,
  readStoredMarketplaceLocation,
  storeMarketplaceLocation,
  type MarketplaceLocation,
} from '../utils/location'

export default function MarketplaceList({ showRaw }: { showRaw?: boolean }) {
  const router = useRouter()
  const { identity } = useAgentIdentity()
  const [distanceFilterKm, setDistanceFilterKm] = useState(25)
  const [location, setLocation] = useState<MarketplaceLocation>(() => {
    const storedLocation = readStoredMarketplaceLocation()
    if (storedLocation) {
      return storedLocation
    }

    return {
      label: 'Aarhus, Denmark',
      lat: Number.NaN,
      lon: Number.NaN,
    }
  })
  const [locationFocused, setLocationFocused] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    try {
      const data = await getListings()
      setAllListings(data)
      setError(null)
    } catch (err) {
      setError('Failed to load listings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchListings()
  }, [fetchListings])

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return
    }

    const handleListingsChanged = () => {
      fetchListings()
    }

    window.addEventListener('agentmarket:listings-updated', handleListingsChanged)
    return () => window.removeEventListener('agentmarket:listings-updated', handleListingsChanged)
  }, [fetchListings])

  useEffect(() => {
    if (!locationFocused) {
      setLocationLoading(false)
      return
    }

    const query = location.label.trim()
    if (query.length < 2) {
      setLocationLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setLocationLoading(true)

      try {
        const suggestions = await searchLocationSuggestions(query, controller.signal)
        if (controller.signal.aborted) {
          return
        }

        const resolved = suggestions[0]
        if (resolved) {
          const nextLocation: MarketplaceLocation = {
            label: resolved.label,
            lat: resolved.lat,
            lon: resolved.lon,
            placeId: resolved.id,
            countryCode: resolved.countryCode,
          }
          setLocation(nextLocation)
          storeMarketplaceLocation(nextLocation)
        }
      } catch {
        // Ignore lookup failures and keep the last known location.
      } finally {
        if (!controller.signal.aborted) {
          setLocationLoading(false)
        }
      }
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [location.label, locationFocused])

  useEffect(() => {
    if (locationFocused) {
      return
    }

    if (location.label.trim()) {
      storeMarketplaceLocation(location)
    }
  }, [location, locationFocused])

  const visibleListings = useMemo(() => {
    return allListings
      .map((listing) => {
        const computedDistanceKm = calculateListingDistanceKm(listing, location)
        return {
          ...listing,
          computedDistanceKm,
        }
      })
      .filter((listing) => listing.computedDistanceKm <= distanceFilterKm)
      .sort((left, right) => left.computedDistanceKm - right.computedDistanceKm)
  }, [allListings, distanceFilterKm, location])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchListings()
    setRefreshing(false)
  }, [fetchListings])

  const formatListingForCard = (listing: Listing) => ({
    id: listing.id,
    title: listing.title,
    price: listing.price,
    distanceKm: (listing as Listing & { computedDistanceKm?: number }).computedDistanceKm ?? listing.distance_km,
    distanceOrigin: listing.distance_origin,
    images: listing.image_urls || [],
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      id: `urn:agent:${listing.id}`,
      name: listing.title,
      price: listing.price,
      location: { km: (listing as Listing & { computedDistanceKm?: number }).computedDistanceKm ?? listing.distance_km },
      ai: {
        specifications: listing.specifications || {},
        condition_rating: listing.condition_rating,
        negotiation_logic: listing.negotiation_logic,
      },
    },
  })

  const isWebGrid = Platform.OS === 'web' && !showRaw

  function handleOpenListing(listingId: string) {
    router.push(`/listing/${listingId}`)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#abc7ff" />
        <Text style={styles.loadingText}>Scanning marketplace...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => fetchListings()}>
          <Text style={styles.retryBtnText}>RETRY</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Agent Identity */}
      <View style={styles.identityBar}>
        <View style={styles.statusDot} />
        <Text style={styles.identityText}>
          {identity.agentId} — {identity.verified ? 'VERIFIED' : 'UNVERIFIED'}
        </Text>
        <View style={styles.locationPill}>
          <Text style={styles.locationLabel}>FROM</Text>
          <TextInput
            style={styles.locationInput}
            value={location.label}
            onChangeText={(text) => {
              setLocation({ label: text, lat: Number.NaN, lon: Number.NaN })
              setLocationFocused(true)
            }}
            onFocus={() => setLocationFocused(true)}
            onBlur={() => {
              setTimeout(() => setLocationFocused(false), 120)
            }}
            placeholder="Search location"
            placeholderTextColor="#8f9095"
          />
          {locationLoading && <Text style={styles.locationStatus}>Searching...</Text>}
        </View>
      </View>

      {/* Distance Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>DISTANCE</Text>
        <View style={styles.sliderWrap}>
          <Slider
            style={styles.distanceSlider}
            minimumValue={1}
            maximumValue={100}
            step={1}
            minimumTrackTintColor="#abc7ff"
            maximumTrackTintColor="#222a3d"
            thumbTintColor="#abc7ff"
            value={distanceFilterKm}
            onValueChange={(value) => setDistanceFilterKm(Math.round(value))}
          />
          <Text style={styles.sliderValue}>{distanceFilterKm} km</Text>
        </View>
      </View>

      {/* Listing Count */}
      <Text style={styles.countText}>{visibleListings.length} listings found</Text>

      {/* Listings */}
      <FlatList
        key={isWebGrid ? 'market-grid' : 'market-list'}
        data={visibleListings.map(formatListingForCard)}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <AgentCard item={item} onPress={() => handleOpenListing(item.id)} showRaw={showRaw} compact={isWebGrid} />
        )}
        numColumns={isWebGrid ? 2 : 1}
        columnWrapperStyle={isWebGrid ? styles.gridRow : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#abc7ff"
            colors={['#abc7ff']}
          />
        }
        contentContainerStyle={styles.listContent}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#abc7ff',
    marginTop: 12,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#ffb4ab',
    marginBottom: 16,
    fontSize: 14,
  },
  retryBtn: {
    backgroundColor: '#abc7ff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
  },
  retryBtnText: {
    color: '#002f65',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  identityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e1ab',
    marginRight: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 0 8px #00e1ab',
      },
      default: {
        shadowColor: '#00e1ab',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
    }),
  },
  identityText: {
    color: '#8f9095',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderBottomWidth: 2,
    borderBottomColor: '#222a3d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  locationLabel: {
    color: '#8f9095',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  locationInput: {
    minWidth: 160,
    color: '#dae2fd',
    fontSize: 12,
    paddingVertical: 0,
  },
  locationStatus: {
    color: '#8f9095',
    fontSize: 10,
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  filterLabel: {
    color: '#8f9095',
    fontSize: 10,
    letterSpacing: 2,
    marginRight: 12,
  },
  sliderWrap: {
    flex: 1,
  },
  distanceSlider: {
    width: '100%',
    height: 32,
  },
  sliderValue: {
    color: '#8f9095',
    fontSize: 12,
    textAlign: 'right',
  },
  countText: {
    color: '#8f9095',
    fontSize: 12,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  gridRow: {
    gap: 12,
  },
  logContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#131b2e',
    borderTopWidth: 2,
    borderTopColor: '#222a3d',
    maxHeight: 160,
  },
  logTitle: {
    color: '#00e1ab',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptyLog: {
    color: '#8f9095',
    fontSize: 12,
    fontStyle: 'italic',
  },
  logRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logActor: {
    color: '#abc7ff',
    fontSize: 12,
    fontWeight: '600',
    width: 80,
  },
  logMsg: {
    color: '#dae2fd',
    fontSize: 12,
    flex: 1,
  },
})
