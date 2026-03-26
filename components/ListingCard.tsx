import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { formatPrice, formatDistance, formatCondition, getConditionColor } from '../utils/helpers'

interface ListingCardProps {
  id: string
  title: string
  price: number
  distanceKm: number
  conditionRating: number
  onPress?: () => void
}

export default function ListingCard({
  id,
  title,
  price,
  distanceKm,
  conditionRating,
  onPress,
}: ListingCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {/* Price */}
      <Text style={styles.price}>{formatPrice(price)}</Text>

      {/* Meta Row */}
      <View style={styles.metaRow}>
        {/* Distance */}
        <View style={styles.metaItem}>
          <Text style={styles.metaIcon}>📍</Text>
          <Text style={styles.metaText}>{formatDistance(distanceKm)}</Text>
        </View>

        {/* Condition */}
        <View style={styles.metaItem}>
          <View
            style={[
              styles.conditionDot,
              { backgroundColor: getConditionColor(conditionRating) },
            ]}
          />
          <Text style={styles.metaText}>{formatCondition(conditionRating)}</Text>
        </View>
      </View>

      {/* ID Badge */}
      <Text style={styles.idBadge}>ID: {id.slice(0, 8)}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#222a3d',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dae2fd',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: '#abc7ff',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 12,
    color: '#8f9095',
  },
  conditionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  idBadge: {
    fontSize: 10,
    color: '#8f9095',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
})
