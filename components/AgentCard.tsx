import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import DistanceBadge from './DistanceBadge'

type Listing = {
  id: string
  title: string
  price: number
  distanceKm: number
  distanceOrigin?: string
  images?: string[]
  jsonld: any
}

export default function AgentCard({
  item,
  onPress,
  showRaw,
  compact,
}: {
  item: Listing
  onPress?: () => void
  showRaw?: boolean
  compact?: boolean
}) {
  const firstImage = item.images?.[0]

  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress}>
      {firstImage && !showRaw && (
        <Image source={{ uri: firstImage }} style={[styles.image, compact && styles.imageCompact]} resizeMode="cover" />
      )}
      <View style={styles.header}>
        <Text style={[styles.title, compact && styles.titleCompact]}>{item.title}</Text>
        <Text style={[styles.price, compact && styles.priceCompact]}>{item.price.toFixed(2)} DKK</Text>
      </View>
      <View style={styles.metaRow}>
        <DistanceBadge km={item.distanceKm} />
        <Text style={styles.cond}>Condition: {item.jsonld?.ai?.condition_rating ?? 'N/A'}</Text>
      </View>
      {item.distanceOrigin && !showRaw && (
        <Text style={styles.origin}>From {item.distanceOrigin}</Text>
      )}
      {showRaw && (
        <View style={styles.raw}>
          <Text style={styles.rawText}>{JSON.stringify(item.jsonld, null, 2)}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#171f33', padding: 12, borderRadius: 8, marginBottom: 12 },
  cardCompact: { flex: 1, marginBottom: 0 },
  image: { width: '100%', height: 160, borderRadius: 8, marginBottom: 12, backgroundColor: '#0b1326' },
  imageCompact: { height: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: '#dae2fd', fontWeight: '700' },
  titleCompact: { fontSize: 13 },
  price: { color: '#abc7ff', fontWeight: '700' },
  priceCompact: { fontSize: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cond: { color: '#c6c6cb', fontSize: 12 },
  origin: { color: '#8f9095', fontSize: 11, marginTop: 6 },
  raw: { marginTop: 8, backgroundColor: '#0b1326', padding: 8, borderRadius: 6 },
  rawText: { color: '#aeb9d0', fontSize: 11, fontFamily: 'monospace' }
})
