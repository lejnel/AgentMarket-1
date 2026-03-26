import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { formatRelativeTime } from '../utils/helpers'

interface Notification {
  id: string
  type: 'message' | 'price' | 'system' | 'alert'
  title: string
  description: string
  timestamp: string
  read: boolean
  actionUrl?: string
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'message',
    title: 'New message from Claw',
    description: 'Hej! Jeg fandt en GPU til dig...',
    timestamp: new Date().toISOString(),
    read: false,
    actionUrl: '/messaging',
  },
  {
    id: '2',
    type: 'price',
    title: 'Price drop alert',
    description: 'Industrial GPU Node V2 is now 2,200 DKK',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    actionUrl: '/listing/1',
  },
  {
    id: '3',
    type: 'system',
    title: 'Agent verified',
    description: 'Claw has been verified successfully',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
  {
    id: '4',
    type: 'alert',
    title: 'Negotiation complete',
    description: 'Your agent accepted an offer for 2,100 DKK',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
    actionUrl: '/listing/1',
  },
]

const icons: Record<string, string> = {
  message: '💬',
  price: '💰',
  system: '⚙️',
  alert: '🔔',
}

export default function NotificationsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  function handleNotificationPress(notification: Notification) {
    // Mark as read
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    )

    // Navigate if action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl as any)
    }
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>NOTIFICATIONS</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAllRead}>
            <Text style={styles.markAllBtn}>MARK ALL READ</Text>
          </Pressable>
        )}
      </View>

      {/* Notifications List */}
      {notifications.map((notification) => (
        <Pressable
          key={notification.id}
          style={[
            styles.notificationItem,
            !notification.read && styles.notificationItemUnread,
          ]}
          onPress={() => handleNotificationPress(notification)}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{icons[notification.type]}</Text>
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>
                {notification.title}
              </Text>
              {!notification.read && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notificationDescription}>
              {notification.description}
            </Text>
            <Text style={styles.notificationTime}>
              {formatRelativeTime(notification.timestamp)}
            </Text>
          </View>
        </Pressable>
      ))}

      {/* Empty State */}
      {notifications.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up!
          </Text>
        </View>
      )}
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
    paddingTop: 48,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dae2fd',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#8f9095',
    marginTop: 4,
  },
  markAllBtn: {
    fontSize: 10,
    color: '#abc7ff',
    letterSpacing: 1,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 8,
  },
  notificationItemUnread: {
    borderLeftWidth: 2,
    borderLeftColor: '#abc7ff',
    backgroundColor: '#1a2847',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dae2fd',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#abc7ff',
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: 13,
    color: '#8f9095',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    color: '#8f9095',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
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
})
