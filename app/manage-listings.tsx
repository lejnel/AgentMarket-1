import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { deleteListing, getAdminListings, hideListing, type Listing, unhideListing } from '../services/listings'
import { getOwnedListingIds, removeOwnedListingId } from '../utils/listingOwnership'

export default function ManageListingsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [ownedIds, setOwnedIds] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleListingsChanged = () => {
      loadData()
    }

    window.addEventListener('agentmarket:listings-updated', handleListingsChanged)
    return () => window.removeEventListener('agentmarket:listings-updated', handleListingsChanged)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const ids = getOwnedListingIds()
      const allListings = await getAdminListings()
      setOwnedIds(ids)
      setListings(allListings)
    } finally {
      setLoading(false)
    }
  }

  const ownedListings = useMemo(() => {
    return listings.filter((listing) => ownedIds.includes(listing.id))
  }, [listings, ownedIds])

  const activeOwnedListings = ownedListings.filter((listing) => listing.status === 'active')
  const hiddenOwnedListings = ownedListings.filter((listing) => listing.status === 'hidden')

  async function handleHide(id: string) {
    await hideListing(id, 'manual')
    await loadData()
  }

  async function handleUnhide(id: string) {
    await unhideListing(id)
    await loadData()
  }

  async function performDelete(id: string) {
    await deleteListing(id)
    removeOwnedListingId(id)
    await loadData()
  }

  function handleDelete(id: string, title: string) {
    const prompt = `Delete ${title}?`

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(prompt)) {
        void performDelete(id)
      }
      return
    }

    Alert.alert('Delete Listing', prompt, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void performDelete(id)
        },
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>MANAGE LISTINGS</Text>
        <Pressable onPress={() => router.push('/create-listing')} style={styles.createBtn}>
          <Text style={styles.createBtnText}>+ NEW</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Manage your own active and hidden listings.</Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#abc7ff" />
        </View>
      ) : ownedListings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No owned listings found</Text>
          <Text style={styles.emptyText}>Create a listing first, then manage it here.</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTIVE</Text>
            {activeOwnedListings.length === 0 ? (
              <Text style={styles.metaText}>No active listings</Text>
            ) : (
              activeOwnedListings.map((listing) => (
                <View key={listing.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{listing.title}</Text>
                      <Text style={styles.cardMeta}>{listing.main_category || 'Uncategorized'} · {listing.subcategory || 'General'}</Text>
                    </View>
                    <Text style={styles.cardPrice}>{listing.price} DKK</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryBtn} onPress={() => handleHide(listing.id)}>
                      <Text style={styles.secondaryBtnText}>HIDE</Text>
                    </Pressable>
                    <Pressable style={styles.dangerBtn} onPress={() => handleDelete(listing.id, listing.title)}>
                      <Text style={styles.dangerBtnText}>DELETE</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HIDDEN</Text>
            {hiddenOwnedListings.length === 0 ? (
              <Text style={styles.metaText}>No hidden listings</Text>
            ) : (
              hiddenOwnedListings.map((listing) => (
                <View key={listing.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{listing.title}</Text>
                      <Text style={styles.cardMeta}>{listing.hidden_reason || 'hidden'} · {listing.main_category || 'Uncategorized'}</Text>
                    </View>
                    <Text style={styles.cardPrice}>{listing.price} DKK</Text>
                  </View>
                  <View style={styles.actions}>
                    <Pressable style={styles.secondaryBtn} onPress={() => handleUnhide(listing.id)}>
                      <Text style={styles.secondaryBtnText}>UNHIDE</Text>
                    </Pressable>
                    <Pressable style={styles.dangerBtn} onPress={() => handleDelete(listing.id, listing.title)}>
                      <Text style={styles.dangerBtnText}>DELETE</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1326' },
  content: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 10 },
  backBtn: { width: 52 },
  backIcon: { color: '#abc7ff', fontSize: 24 },
  title: { color: '#abc7ff', fontSize: 20, fontWeight: '700', letterSpacing: 1.5 },
  createBtn: { backgroundColor: '#00e1ab', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4 },
  createBtnText: { color: '#002f65', fontSize: 11, fontWeight: '700' },
  subtitle: { color: '#8f9095', fontSize: 12, marginBottom: 18 },
  section: { marginBottom: 22 },
  sectionTitle: { color: '#8f9095', fontSize: 11, letterSpacing: 2, marginBottom: 10 },
  metaText: { color: '#8f9095', fontSize: 12 },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyCard: { backgroundColor: '#131b2e', padding: 16, borderBottomWidth: 2, borderBottomColor: '#222a3d' },
  emptyTitle: { color: '#dae2fd', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: '#8f9095', fontSize: 12 },
  card: { backgroundColor: '#131b2e', borderBottomWidth: 2, borderBottomColor: '#222a3d', padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { color: '#dae2fd', fontSize: 14, fontWeight: '700' },
  cardMeta: { color: '#8f9095', fontSize: 11, marginTop: 4 },
  cardPrice: { color: '#abc7ff', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryBtn: { flex: 1, backgroundColor: '#222a3d', paddingVertical: 10, borderRadius: 4, alignItems: 'center' },
  secondaryBtnText: { color: '#dae2fd', fontSize: 12, fontWeight: '700' },
  dangerBtn: { flex: 1, backgroundColor: '#ff6b6b', paddingVertical: 10, borderRadius: 4, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})