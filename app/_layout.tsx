import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import ErrorBoundary from '../components/ErrorBoundary'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#0b1326' },
          headerTintColor: '#abc7ff',
          headerTitleStyle: { fontWeight: 'bold' },
          tabBarStyle: {
            backgroundColor: '#0d1117',
            borderTopColor: '#222a3d',
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: '#abc7ff',
          tabBarInactiveTintColor: '#8f9095',
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: () => <Text>📊</Text>
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Marketplace',
            tabBarIcon: () => <Text>🏪</Text>
          }}
        />
        <Tabs.Screen
          name="messaging"
          options={{
            title: 'Messages',
            tabBarIcon: () => <Text>💬</Text>
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: () => <Text>👤</Text>
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen
          name="search"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="agent-api"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="agent-link"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="create-listing"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="manage-listings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="onboarding"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="details"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="listing/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  )
}
