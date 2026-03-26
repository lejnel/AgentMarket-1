import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { banBot, banUser, getModerationSnapshot } from '../services/moderation'
import { deleteListing, getAdminListings, hideListing, unhideListing, type Listing } from '../services/listings'

export default function AdminScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [userId, setUserId] = useState('')
  const [botId, setBotId] = useState('')
  const [snapshot, setSnapshot] = useState(getModerationSnapshot())

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleListingsChanged = () => {
      loadData()
    }

    window.addEventListener('agentmarket:listings-updated', handleListingsChanged)
    return () => window.removeEventListener('agentmarket:listings-updated', handleListingsChanged)
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getAdminListings()
      setListings(data)
      setSnapshot(getModerationSnapshot())
    } finally {
      setLoading(false)
    }
  }

  async function handleHide(id: string) {
    await hideListing(id)
    await loadData()
  }

  async function handleUnhide(id: string) {
    await unhideListing(id)
    await loadData()
  }

  async function handleDelete(id: string, title: string) {
    Alert.alert('Delete Listing', `Delete ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteListing(id)
          await loadData()
        },
      },
    ])
  }

  async function handleBanUser() {
    if (!userId.trim()) return
    setSaving(true)
    try {
      banUser(userId)
      setUserId('')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function handleBanBot() {
    if (!botId.trim()) return
    setSaving(true)
    try {
      banBot(botId)
      setBotId('')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const activeListings = listings.filter((listing) => listing.status === 'active')
  const hiddenListings = listings.filter((listing) => listing.status === 'hidden')

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>ADMIN</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BANNED ACCOUNTS</Text>
        <Text style={styles.metaText}>Users: {snapshot.bannedUsers.length} | Bots: {snapshot.bannedBots.length}</Text>
        <Text style={styles.metaText}>Hidden listings: {snapshot.blockedListings.length}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BAN USER</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="User or seller ID" placeholderTextColor="#8f9095" value={userId} onChangeText={setUserId} />
          <Pressable style={styles.primaryBtn} onPress={handleBanUser} disabled={saving}>
            <Text style={styles.primaryBtnText}>BAN</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BAN BOT</Text>
        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="Bot name or token" placeholderTextColor="#8f9095" value={botId} onChangeText={setBotId} />
          <Pressable style={styles.primaryBtn} onPress={handleBanBot} disabled={saving}>
            <Text style={styles.primaryBtnText}>BAN</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVE LISTINGS</Text>
        {loading ? (
          <ActivityIndicator color="#abc7ff" />
        ) : activeListings.length === 0 ? (
          <Text style={styles.emptyText}>No active listings</Text>
        ) : activeListings.map((listing) => (
          <View key={listing.id} style={styles.listingCard}>
            <View style={styles.listingTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingMeta}>{listing.seller_id || 'unknown seller'} · {listing.status}</Text>
              </View>
              <Text style={styles.listingPrice}>{listing.price} DKK</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => handleHide(listing.id)}>
                <Text style={styles.secondaryBtnText}>HIDE</Text>
              </Pressable>
              <Pressable style={styles.dangerBtn} onPress={() => handleDelete(listing.id, listing.title)}>
                <Text style={styles.dangerBtnText}>DELETE</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HIDDEN LISTINGS</Text>
        {hiddenListings.length === 0 ? (
          <Text style={styles.emptyText}>No hidden listings</Text>
        ) : hiddenListings.map((listing) => (
          <View key={listing.id} style={styles.listingCard}>
            <View style={styles.listingTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingMeta}>{listing.hidden_reason || 'hidden'} · {listing.seller_id || 'unknown seller'}</Text>
              </View>
              <Text style={styles.listingPrice}>{listing.price} DKK</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => handleUnhide(listing.id)}>
                <Text style={styles.secondaryBtnText}>UNHIDE</Text>
              </Pressable>
              <Pressable style={styles.dangerBtn} onPress={() => handleDelete(listing.id, listing.title)}>
                <Text style={styles.dangerBtnText}>DELETE</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1326' },
  content: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 40, marginBottom: 24 },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backIcon: { fontSize: 24, color: '#abc7ff' },
  title: { fontSize: 24, fontWeight: '700', color: '#abc7ff', letterSpacing: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, letterSpacing: 2, color: '#8f9095', marginBottom: 12 },
  metaText: { color: '#8f9095', fontSize: 12, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#131b2e', color: '#dae2fd', borderBottomWidth: 2, borderBottomColor: '#222a3d', padding: 14 },
  primaryBtn: { backgroundColor: '#00e1ab', paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
  primaryBtnText: { color: '#002f65', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#8f9095', fontSize: 13 },
  listingCard: { backgroundColor: '#131b2e', borderBottomWidth: 2, borderBottomColor: '#222a3d', padding: 14, marginBottom: 10 },
  listingTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  listingTitle: { color: '#dae2fd', fontSize: 14, fontWeight: '700' },
  listingMeta: { color: '#8f9095', fontSize: 11, marginTop: 4 },
  listingPrice: { color: '#abc7ff', fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  secondaryBtn: { flex: 1, backgroundColor: '#222a3d', paddingVertical: 10, alignItems: 'center', borderRadius: 4 },
  secondaryBtnText: { color: '#dae2fd', fontSize: 12, fontWeight: '700' },
  dangerBtn: { flex: 1, backgroundColor: '#ff6b6b', paddingVertical: 10, alignItems: 'center', borderRadius: 4 },
  dangerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
})