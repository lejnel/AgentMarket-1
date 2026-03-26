import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'

export default function SettingsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState(true)
  const [darkMode, setDarkMode] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('agentmarket.darkMode')
      if (stored !== null) return stored === 'true'
    }
    return true
  })
  const [autoNegotiate, setAutoNegotiate] = useState(false)
  const [spamFilter, setSpamFilter] = useState(true)

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('agentmarket.darkMode', String(darkMode))
      document.body.style.backgroundColor = darkMode ? '#0b1326' : '#f4f6fb'
      document.body.style.color = darkMode ? '#dae2fd' : '#111827'
    }
  }, [darkMode])

  return (
    <ScrollView style={[styles.container, !darkMode && styles.containerLight]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, !darkMode && styles.titleLight]}>SETTINGS</Text>
      </View>

      {/* Agent Settings */}
      <View style={[styles.section, !darkMode && styles.sectionLight]}>
        <Text style={[styles.sectionTitle, !darkMode && styles.sectionTitleLight]}>AGENT BEHAVIOR</Text>

        <View style={[styles.settingRow, !darkMode && styles.settingRowLight]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, !darkMode && styles.settingLabelLight]}>Auto-Negotiate</Text>
            <Text style={[styles.settingDesc, !darkMode && styles.settingDescLight]}>Let agents negotiate on your behalf</Text>
          </View>
          <Switch
            value={autoNegotiate}
            onValueChange={setAutoNegotiate}
            trackColor={{ false: '#222a3d', true: '#abc7ff' }}
            thumbColor={autoNegotiate ? '#002f65' : '#45474b'}
          />
        </View>

        <View style={[styles.settingRow, !darkMode && styles.settingRowLight]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, !darkMode && styles.settingLabelLight]}>Spam Filter</Text>
            <Text style={[styles.settingDesc, !darkMode && styles.settingDescLight]}>Block suspicious agent messages</Text>
          </View>
          <Switch
            value={spamFilter}
            onValueChange={setSpamFilter}
            trackColor={{ false: '#222a3d', true: '#abc7ff' }}
            thumbColor={spamFilter ? '#002f65' : '#45474b'}
          />
        </View>
      </View>

      {/* App Settings */}
      <View style={[styles.section, !darkMode && styles.sectionLight]}>
        <Text style={[styles.sectionTitle, !darkMode && styles.sectionTitleLight]}>APP</Text>

        <View style={[styles.settingRow, !darkMode && styles.settingRowLight]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, !darkMode && styles.settingLabelLight]}>Notifications</Text>
            <Text style={[styles.settingDesc, !darkMode && styles.settingDescLight]}>Push notifications for new messages</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#222a3d', true: '#abc7ff' }}
            thumbColor={notifications ? '#002f65' : '#45474b'}
          />
        </View>

        <View style={[styles.settingRow, !darkMode && styles.settingRowLight]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, !darkMode && styles.settingLabelLight]}>Dark Mode</Text>
            <Text style={[styles.settingDesc, !darkMode && styles.settingDescLight]}>Industrial dark theme</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#222a3d', true: '#abc7ff' }}
            thumbColor={darkMode ? '#002f65' : '#45474b'}
          />
        </View>
      </View>

      {/* Tools */}
      <View style={[styles.section, !darkMode && styles.sectionLight]}>
        <Text style={[styles.sectionTitle, !darkMode && styles.sectionTitleLight]}>TOOLS</Text>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]} onPress={() => router.push('/agent-api')}>
          <View>
            <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Agent API</Text>
            <Text style={[styles.menuDesc, !darkMode && styles.menuDescLight]}>Commands, refresh, create, and JSON payloads</Text>
          </View>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]} onPress={() => router.push('/search')}>
          <View>
            <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Search</Text>
            <Text style={[styles.menuDesc, !darkMode && styles.menuDescLight]}>Find listings faster</Text>
          </View>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]} onPress={() => router.push('/manage-listings')}>
          <View>
            <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Manage Listings</Text>
            <Text style={[styles.menuDesc, !darkMode && styles.menuDescLight]}>Hide, unhide, and delete your listings</Text>
          </View>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]} onPress={() => router.push('/admin')}>
          <View>
            <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Admin</Text>
            <Text style={[styles.menuDesc, !darkMode && styles.menuDescLight]}>Moderate listings, users, and bots</Text>
          </View>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>
      </View>

      {/* Account */}
      <View style={[styles.section, !darkMode && styles.sectionLight]}>
        <Text style={[styles.sectionTitle, !darkMode && styles.sectionTitleLight]}>ACCOUNT</Text>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]} onPress={() => router.push('/profile')}>
          <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Profile</Text>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]} onPress={() => router.push('/agent-link')}>
          <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Linked Agents</Text>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>

        <Pressable style={[styles.menuItem, !darkMode && styles.menuItemLight]}>
          <Text style={[styles.menuLabel, !darkMode && styles.menuLabelLight]}>Transaction History</Text>
          <Text style={[styles.menuArrow, !darkMode && styles.menuArrowLight]}>→</Text>
        </Pressable>
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, !darkMode && styles.sectionLight]}>
        <Text style={[styles.sectionTitleDanger, !darkMode && styles.sectionTitleDangerLight]}>DANGER ZONE</Text>

        <Pressable
          style={[styles.dangerBtn, !darkMode && styles.dangerBtnLight]}
          onPress={() => {
            Alert.alert(
              'Clear Data',
              'This will delete all local data. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive' },
              ]
            )
          }}
        >
          <Text style={[styles.dangerBtnText, !darkMode && styles.dangerBtnTextLight]}>CLEAR LOCAL DATA</Text>
        </Pressable>

        <Pressable
          style={[styles.dangerBtn, !darkMode && styles.dangerBtnLight]}
          onPress={() => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive' },
              ]
            )
          }}
        >
          <Text style={[styles.dangerBtnText, !darkMode && styles.dangerBtnTextLight]}>SIGN OUT</Text>
        </Pressable>
      </View>

      {/* Version */}
      <Text style={[styles.version, !darkMode && styles.versionLight]}>AgentMarket v0.1.0</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  containerLight: {
    backgroundColor: '#f4f6fb',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 32,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#abc7ff',
    letterSpacing: 2,
  },
  titleLight: {
    color: '#111827',
  },
  section: {
    marginBottom: 32,
  },
  sectionLight: {
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitleLight: {
    color: '#6b7280',
  },
  sectionTitleDanger: {
    fontSize: 10,
    color: '#ff6b6b',
    letterSpacing: 2,
    marginBottom: 12,
  },
  sectionTitleDangerLight: {
    color: '#dc2626',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
  },
  settingRowLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dae2fd',
    marginBottom: 4,
  },
  settingLabelLight: {
    color: '#111827',
  },
  settingDesc: {
    fontSize: 12,
    color: '#8f9095',
  },
  settingDescLight: {
    color: '#6b7280',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
  },
  menuItemLight: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe3ef',
  },
  menuLabel: {
    fontSize: 14,
    color: '#dae2fd',
  },
  menuLabelLight: {
    color: '#111827',
  },
  menuDesc: {
    fontSize: 11,
    color: '#8f9095',
    marginTop: 2,
  },
  menuDescLight: {
    color: '#6b7280',
  },
  menuArrow: {
    fontSize: 18,
    color: '#abc7ff',
  },
  menuArrowLight: {
    color: '#277be7',
  },
  dangerBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  dangerBtnLight: {
    backgroundColor: '#fff1f1',
  },
  dangerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b6b',
    letterSpacing: 1,
  },
  dangerBtnTextLight: {
    color: '#dc2626',
  },
  version: {
    textAlign: 'center',
    color: '#8f9095',
    fontSize: 12,
    marginTop: 20,
  },
  versionLight: {
    color: '#6b7280',
  },
})
