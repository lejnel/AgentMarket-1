import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase, isSupabaseConfigured } from '../services/supabase'
import { getActiveAgentId } from '../utils/activeAgent'
import { getAdminListings } from '../services/listings'

interface LinkedAgent {
  id: string
  agent_name: string
  agent_id: string
  verified: boolean
  created_at: string
}

interface UserListing {
  id: string
  title: string
  status: string
  price: number
  created_at: string
}

interface MessageSummary {
  total: number
  unread: number
  spam: number
}

export default function DashboardScreen() {
  const router = useRouter()
  const [linkedAgents, setLinkedAgents] = useState<LinkedAgent[]>([])
  const [userListings, setUserListings] = useState<UserListing[]>([])
  const [messages, setMessages] = useState<MessageSummary>({ total: 0, unread: 0, spam: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
  }

  async function fetchDashboardData() {
    setLoading(true)

    try {
      if (!isSupabaseConfigured || !supabase) {
        const activeAgentId = getActiveAgentId()
        const allListings = await getAdminListings()
        const ownedListings = allListings
          .filter((listing) => listing.seller_id === activeAgentId)
          .slice(0, 5)

        setLinkedAgents(
          activeAgentId && activeAgentId !== 'OPERATOR_01'
            ? [
                {
                  id: activeAgentId,
                  agent_name: activeAgentId,
                  agent_id: activeAgentId,
                  verified: true,
                  created_at: new Date().toISOString(),
                },
              ]
            : []
        )
        setUserListings(
          ownedListings.map((listing) => ({
            id: listing.id,
            title: listing.title,
            status: listing.status,
            price: listing.price,
            created_at: listing.created_at,
          }))
        )
        setMessages({ total: 0, unread: 0, spam: 0 })
        return
      }

      const activeAgentId = getActiveAgentId()

      const { data: humanUsers } = await supabase
        .from('human_users')
        .select('id')
        .eq('username', 'default_user')
        .limit(1)

      const humanId = humanUsers?.[0]?.id || null

      const { data: agentTokens } = await supabase
        .from('agent_tokens')
        .select('id, agent_name, agent_id, verified, created_at')
        .eq('human_user_id', humanId || '__none__')
        .order('created_at', { ascending: false })

      const { data: agentProfiles } = await supabase
        .from('agent_profiles')
        .select('id, name, agent_id, verified, created_at')
        .eq('agent_id', activeAgentId)
        .limit(1)

      const agentProfile = agentProfiles?.[0] || null

      const { data: listingRows } = await supabase
        .from('listings')
        .select('id, title, status, price, created_at')
        .eq('seller_id', agentProfile?.id || '__none__')
        .order('created_at', { ascending: false })

      const { data: messageRows } = await supabase
        .from('messages')
        .select('spam_flag')
        .eq('recipient_id', humanId || '__none__')

      setLinkedAgents(agentTokens || [])
      setUserListings(listingRows || [])
      setMessages({
        total: messageRows?.length || 0,
        unread: messageRows?.filter((message) => !message.spam_flag).length || 0,
        spam: messageRows?.filter((message) => message.spam_flag).length || 0,
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setLinkedAgents([])
      setUserListings([])
      setMessages({ total: 0, unread: 0, spam: 0 })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#abc7ff" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#abc7ff"
          colors={['#abc7ff']}
        />
      }
    >
      <View style={styles.header}>
        <Pressable style={styles.avatarPlaceholder} onPress={() => router.push('/settings')}>
          <Text style={styles.avatarText}>R</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>Rasmus</Text>
        </View>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>ONLINE</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Pressable style={styles.statCard} onPress={() => router.push('/agent-link')}>
          <Text style={styles.statNumber}>{linkedAgents.length}</Text>
          <Text style={styles.statLabel}>LINKED AGENTS</Text>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/')}>
          <Text style={styles.statNumber}>{userListings.length}</Text>
          <Text style={styles.statLabel}>LISTINGS</Text>
        </Pressable>
        <Pressable style={styles.statCard} onPress={() => router.push('/messaging')}>
          <Text style={styles.statNumber}>{messages.unread}</Text>
          <Text style={styles.statLabel}>UNREAD</Text>
        </Pressable>
        <Pressable
          style={[styles.statCard, messages.spam > 0 && styles.statCardWarning]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[styles.statNumber, messages.spam > 0 && styles.statNumberWarning]}>
            {messages.spam}
          </Text>
          <Text style={styles.statLabel}>SPAM</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LINKED AGENTS</Text>
          <Pressable onPress={() => router.push('/agent-link')}>
            <Text style={styles.sectionLink}>+ ADD</Text>
          </Pressable>
        </View>

        {linkedAgents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤖</Text>
            <Text style={styles.emptyText}>No agents linked yet</Text>
          </View>
        ) : (
          linkedAgents.map((agent) => (
            <Pressable key={agent.id} style={styles.agentItem} onPress={() => router.push('/agent-link')}>
              <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{agent.agent_name}</Text>
                <Text style={styles.agentId}>{agent.agent_id}</Text>
              </View>
              {agent.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ VERIFIED</Text>
                </View>
              )}
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR LISTINGS</Text>
          <View style={styles.sectionHeaderActions}>
            <Pressable onPress={() => router.push('/manage-listings')}>
              <Text style={styles.sectionLink}>MANAGE</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/create-listing')}>
              <Text style={styles.sectionLink}>+ NEW</Text>
            </Pressable>
          </View>
        </View>

        {userListings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No listings yet</Text>
          </View>
        ) : (
          userListings.map((listing) => (
            <Pressable key={listing.id} style={styles.listingItem} onPress={() => router.push(`/listing/${listing.id}`)}>
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle}>{listing.title}</Text>
                <Text style={styles.listingPrice}>${listing.price.toLocaleString()}</Text>
              </View>
              <View
                style={[
                  styles.statusTag,
                  listing.status === 'active' && styles.statusTagActive,
                  listing.status === 'pending' && styles.statusTagPending,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    listing.status === 'active' && styles.statusTagTextActive,
                  ]}
                >
                  {listing.status.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.quickActions}>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/messaging')}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Messages</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => router.push('/')}>
          <Text style={styles.actionIcon}>🏪</Text>
          <Text style={styles.actionText}>Marketplace</Text>
        </Pressable>

        <Pressable style={styles.actionBtnPrimary} onPress={() => router.push('/create-listing')}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionTextPrimary}>New Listing</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={() => router.push('/manage-listings')}>
          <Text style={styles.actionIcon}>🧰</Text>
          <Text style={styles.actionText}>Manage</Text>
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
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#abc7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#002f65',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  greeting: {
    fontSize: 12,
    color: '#8f9095',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dae2fd',
    marginTop: 2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e1ab',
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    color: '#00e1ab',
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#131b2e',
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#222a3d',
  },
  statCardWarning: {
    borderLeftColor: '#ffb4ab',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#dae2fd',
  },
  statNumberWarning: {
    color: '#ffb4ab',
  },
  statLabel: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#8f9095',
    letterSpacing: 2,
    fontWeight: '600',
  },
  sectionLink: {
    fontSize: 12,
    color: '#abc7ff',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#131b2e',
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: '#8f9095',
    fontSize: 14,
  },
  agentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#00e1ab',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dae2fd',
  },
  agentId: {
    fontSize: 12,
    color: '#8f9095',
    marginTop: 4,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(0, 225, 171, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#00e1ab',
    fontWeight: '600',
    letterSpacing: 1,
  },
  listingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dae2fd',
  },
  listingPrice: {
    fontSize: 12,
    color: '#abc7ff',
    marginTop: 4,
  },
  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#222a3d',
    borderRadius: 4,
  },
  statusTagActive: {
    backgroundColor: 'rgba(0, 225, 171, 0.1)',
  },
  statusTagPending: {
    backgroundColor: 'rgba(171, 199, 255, 0.1)',
  },
  statusTagText: {
    fontSize: 10,
    color: '#8f9095',
    fontWeight: '600',
    letterSpacing: 1,
  },
  statusTagTextActive: {
    color: '#00e1ab',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#222a3d',
  },
  actionBtn: {
    alignItems: 'center',
    padding: 12,
  },
  actionBtnPrimary: {
    alignItems: 'center',
    backgroundColor: '#abc7ff',
    padding: 12,
    borderRadius: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#abc7ff',
    fontWeight: '600',
  },
  actionTextPrimary: {
    fontSize: 12,
    color: '#002f65',
    fontWeight: '700',
  },
})