import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface AgentStatusBadgeProps {
  status: 'active' | 'inactive' | 'negotiating' | 'error'
  label?: string
}

const statusConfig = {
  active: {
    color: '#00e1ab',
    label: 'ACTIVE',
  },
  inactive: {
    color: '#8f9095',
    label: 'INACTIVE',
  },
  negotiating: {
    color: '#abc7ff',
    label: 'NEGOTIATING',
  },
  error: {
    color: '#ff6b6b',
    label: 'ERROR',
  },
}

export default function AgentStatusBadge({ status, label }: AgentStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <View style={[styles.container, { borderColor: config.color }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>
        {label || config.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
})
