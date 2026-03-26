import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase, isSupabaseConfigured } from '../services/supabase'
import { getActiveAgentId } from '../utils/activeAgent'

export default function ProfileScreen() {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Rasmus',
    email: 'rasmus@example.com',
    location: 'Aarhus, Denmark',
    bio: 'Industrial systems enthusiast. Building AI-powered tools.',
  })
  const [stats, setStats] = useState({
    listings: 3,
    trades: 12,
    rating: 98,
    verified: true,
  })

  useEffect(() => {
    fetchProfileStats()
  }, [])

  async function fetchProfileStats() {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    try {
      const agentId = getActiveAgentId()
      const { data: agentProfiles } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('agent_id', agentId)
        .limit(1)

      const agentProfile = agentProfiles?.[0]

      if (!agentProfile) return

      const { data: listingRows } = await supabase
        .from('listings')
        .select('status')
        .eq('seller_id', agentProfile.id)

      setProfile((current) => ({
        ...current,
        name: agentProfile.name || current.name,
      }))

      setStats({
        listings: listingRows?.length || 0,
        trades: listingRows?.filter((item) => item.status === 'sold').length || 0,
        rating: Math.round((agentProfile.reputation_score || 0) * 100) || 0,
        verified: Boolean(agentProfile.verified),
      })
    } catch (err) {
      console.error('Failed to load profile stats:', err)
    }
  }

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setEditing(false)
    }, 1000)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.title}>PROFILE</Text>
        <Pressable
          style={styles.editBtn}
          onPress={() => editing ? handleSave() : setEditing(true)}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#abc7ff" />
          ) : (
            <Text style={styles.editBtnText}>
              {editing ? 'SAVE' : 'EDIT'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.userName}>{profile.name}</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ {stats.verified ? 'VERIFIED HUMAN' : 'UNVERIFIED'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.listings}</Text>
          <Text style={styles.statLabel}>LISTINGS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.trades}</Text>
          <Text style={styles.statLabel}>TRADES</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.rating}%</Text>
          <Text style={styles.statLabel}>RATING</Text>
        </View>
      </View>

      {/* Profile Fields */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>NAME</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
            />
          ) : (
            <Text style={styles.fieldValue}>{profile.name}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.fieldValue}>{profile.email}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>LOCATION</Text>
          {editing ? (
            <TextInput
              style={styles.fieldInput}
              value={profile.location}
              onChangeText={(text) => setProfile({ ...profile, location: text })}
            />
          ) : (
            <Text style={styles.fieldValue}>{profile.location}</Text>
          )}
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BIO</Text>
        {editing ? (
          <TextInput
            style={styles.bioInput}
            value={profile.bio}
            onChangeText={(text) => setProfile({ ...profile, bio: text })}
            multiline
            numberOfLines={4}
          />
        ) : (
          <Text style={styles.bioText}>{profile.bio}</Text>
        )}
      </View>

      {/* Linked Agents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LINKED AGENTS</Text>
          <Pressable onPress={() => router.push('/agent-link')}>
            <Text style={styles.addBtn}>+ ADD</Text>
          </Pressable>
        </View>

        <View style={styles.agentCard}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentName}>Claw</Text>
            <Text style={styles.agentId}>claw-rasmus-001</Text>
          </View>
          <View style={styles.agentBadge}>
            <Text style={styles.agentBadgeText}>ACTIVE</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/settings')}>
          <Text style={styles.actionBtnText}>⚙️ SETTINGS</Text>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 24,
  },
  backBtn: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#abc7ff',
  },
  title: {
    fontSize: 12,
    color: '#8f9095',
    letterSpacing: 2,
  },
  editBtn: {
    padding: 8,
  },
  editBtnText: {
    fontSize: 12,
    color: '#abc7ff',
    fontWeight: '600',
    letterSpacing: 1,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#abc7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#002f65',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dae2fd',
    marginBottom: 8,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(0, 225, 171, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#00e1ab',
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dae2fd',
  },
  statLabel: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 1,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#222a3d',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 14,
    color: '#dae2fd',
    backgroundColor: '#131b2e',
    padding: 12,
  },
  fieldInput: {
    fontSize: 14,
    color: '#dae2fd',
    backgroundColor: '#131b2e',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#abc7ff',
  },
  bioInput: {
    fontSize: 14,
    color: '#dae2fd',
    backgroundColor: '#131b2e',
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    borderBottomWidth: 2,
    borderBottomColor: '#abc7ff',
  },
  bioText: {
    fontSize: 14,
    color: '#8f9095',
    lineHeight: 22,
  },
  addBtn: {
    fontSize: 12,
    color: '#abc7ff',
    fontWeight: '600',
  },
  agentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 16,
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
  agentBadge: {
    backgroundColor: 'rgba(0, 225, 171, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  agentBadgeText: {
    fontSize: 10,
    color: '#00e1ab',
    fontWeight: '600',
    letterSpacing: 1,
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  actionBtn: {
    backgroundColor: '#131b2e',
    padding: 16,
    alignItems: 'center',
    borderRadius: 4,
  },
  actionBtnText: {
    fontSize: 12,
    color: '#abc7ff',
    fontWeight: '600',
    letterSpacing: 1,
  },
})
