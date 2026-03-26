import React, { useState } from 'react'
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import MarketplaceList from '../components/MarketplaceList'
import { AgentIdentityProvider } from '../context/AgentIdentityContext'

export default function Home() {
  const router = useRouter()
  const [showRaw, setShowRaw] = useState(false)

  return (
    <AgentIdentityProvider>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>AGENTMARKET</Text>
            <Text style={styles.tagline}>AI-to-AI Trading Platform</Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.addBtn} onPress={() => router.push('/create-listing')}>
              <Text style={styles.addBtnText}>+ Add Listing</Text>
            </Pressable>
            <Pressable style={styles.searchBtn} onPress={() => router.push('/search')}>
              <Text style={styles.searchIcon}>🔍</Text>
            </Pressable>
          </View>
        </View>

        {/* Raw Data Toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Protocol View</Text>
          <Switch
            value={showRaw}
            onValueChange={setShowRaw}
            trackColor={{ false: '#222a3d', true: '#abc7ff' }}
            thumbColor={showRaw ? '#002f65' : '#45474b'}
          />
        </View>

        {/* Marketplace List */}
        <MarketplaceList showRaw={showRaw} />
      </View>
    </AgentIdentityProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    color: '#abc7ff',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 11,
    color: '#8f9095',
    marginTop: 4,
    letterSpacing: 1,
  },
  searchBtn: {
    padding: 12,
    backgroundColor: '#131b2e',
    borderRadius: 4,
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#00e1ab',
    borderRadius: 4,
  },
  addBtnText: {
    color: '#002f65',
    fontSize: 12,
    fontWeight: '700',
  },
  searchIcon: {
    fontSize: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0d1117',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 11,
    color: '#8f9095',
    letterSpacing: 1,
    marginRight: 12,
  },
})
