import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getListing } from '../../services/listings'
import { calculateListingDistanceKm, readStoredMarketplaceLocation } from '../../utils/location'

interface Listing {
  id: string
  title: string
  price: number
  distance_km: number
  distance_origin?: string
  image_urls?: string[]
  specifications: any
  condition_rating: number
  negotiation_logic: any
  created_at: string
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchListing()
  }, [id])

  async function fetchListing() {
    setLoading(true)
    try {
      const listingId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : undefined

      if (!listingId) {
        setListing(null)
        setLoading(false)
        return
      }

      const data = await getListing(listingId)
      setListing(data)
    } catch (err) {
      console.error('Error fetching listing:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleMessageSeller() {
    if (!listing) return

    router.push({
      pathname: '/messaging',
      params: {
        listingId: listing.id,
        listingTitle: listing.title,
      },
    })
  }

  function formatSpecificationValue(value: any) {
    if (value && typeof value === 'object') {
      if (typeof value.label === 'string') {
        return value.label
      }

      if (typeof value.lat === 'number' && typeof value.lon === 'number') {
        return `${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}`
      }

      return JSON.stringify(value)
    }

    return String(value)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#abc7ff" />
        <Text style={styles.loadingText}>Loading listing...</Text>
      </View>
    )
  }

  if (!listing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Listing not found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>GO BACK</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>LISTING DETAILS</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Title */}
      <Text style={styles.title}>{listing.title}</Text>

      {/* Images */}
      {listing.image_urls && listing.image_urls.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip} contentContainerStyle={styles.imageStripContent}>
          {listing.image_urls.map((imageUri, index) => (
            <Image key={`${imageUri}-${index}`} source={{ uri: imageUri }} style={styles.image} />
          ))}
        </ScrollView>
      )}

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>PRICE</Text>
        <Text style={styles.priceValue}>{listing.price} DKK</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>DISTANCE</Text>
          <Text style={styles.infoValue}>{calculateListingDistanceKm(listing, readStoredMarketplaceLocation()).toFixed(1)} km</Text>
          {listing.distance_origin && <Text style={styles.infoSubValue}>{listing.distance_origin}</Text>}
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>CONDITION</Text>
          <Text style={styles.infoValue}>
            {Math.round(listing.condition_rating * 100)}%
          </Text>
        </View>
      </View>

      {/* Specifications */}
      {listing.specifications && Object.keys(listing.specifications).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SPECIFICATIONS</Text>
          {Object.entries(listing.specifications).map(([key, value]) => (
            <View key={key} style={styles.specRow}>
              <Text style={styles.specKey}>{key.toUpperCase()}</Text>
              <Text style={styles.specValue}>{formatSpecificationValue(value)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.secondaryBtn} onPress={handleMessageSeller}>
          <Text style={styles.secondaryBtnText}>MESSAGE SELLER</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>BUY NOW</Text>
        </Pressable>
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
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1326',
  },
  loadingText: {
    color: '#abc7ff',
    marginTop: 12,
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1326',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#8f9095',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 40,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#dae2fd',
    marginBottom: 24,
  },
  imageStrip: {
    marginBottom: 20,
  },
  imageStripContent: {
    gap: 12,
  },
  image: {
    width: 240,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#131b2e',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  priceLabel: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#abc7ff',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#131b2e',
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#222a3d',
  },
  infoLabel: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dae2fd',
  },
  infoSubValue: {
    marginTop: 4,
    fontSize: 11,
    color: '#8f9095',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 12,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222a3d',
  },
  specKey: {
    fontSize: 12,
    color: '#8f9095',
    letterSpacing: 1,
  },
  specValue: {
    fontSize: 14,
    color: '#dae2fd',
    fontWeight: '600',
  },
  negotiateBtn: {
    backgroundColor: '#abc7ff',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 4,
  },
  negotiateBtnDisabled: {
    backgroundColor: '#222a3d',
  },
  negotiateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#002f65',
    letterSpacing: 1,
  },
  logContainer: {
    marginTop: 16,
    backgroundColor: '#131b2e',
    padding: 12,
  },
  logRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  logActor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00e1ab',
    width: 70,
  },
  logBuyer: {
    color: '#abc7ff',
  },
  logMessage: {
    fontSize: 12,
    color: '#dae2fd',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 4,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#abc7ff',
    letterSpacing: 1,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#00e1ab',
    borderRadius: 4,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#002f65',
    letterSpacing: 1,
  },
})
