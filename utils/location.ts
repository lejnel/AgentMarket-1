export type MarketplaceLocation = {
  label: string
  lat: number
  lon: number
  placeId?: string
  countryCode?: string
}

type ListingLike = {
  distance_origin?: string
  specifications?: Record<string, any>
  distance_km?: number
}

const LOCATION_STORAGE_KEY = 'agentmarket.location'

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function normalizeStoredLocation(input: any): MarketplaceLocation | null {
  if (!input) return null

  if (typeof input === 'string') {
    const label = input.trim()
    return label ? { label, lat: NaN, lon: NaN } : null
  }

  if (typeof input !== 'object') {
    return null
  }

  const label = typeof input.label === 'string' ? input.label.trim() : ''
  const lat = Number(input.lat)
  const lon = Number(input.lon)

  if (!label) {
    return null
  }

  return {
    label,
    lat,
    lon,
    placeId: typeof input.placeId === 'string' ? input.placeId : typeof input.place_id === 'string' ? input.place_id : undefined,
    countryCode: typeof input.countryCode === 'string' ? input.countryCode : typeof input.country_code === 'string' ? input.country_code : undefined,
  }
}

export function readStoredMarketplaceLocation(): MarketplaceLocation | null {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return null
    return normalizeStoredLocation(JSON.parse(raw))
  } catch {
    return null
  }
}

export function storeMarketplaceLocation(location: MarketplaceLocation) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusKm = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const startLat = toRadians(lat1)
  const endLat = toRadians(lat2)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(startLat) * Math.cos(endLat)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

export function extractListingLocation(listing: ListingLike): MarketplaceLocation | null {
  const spec = listing.specifications || {}
  const candidates = [
    spec.distance_origin_location,
    spec.location,
    spec.origin_location,
  ]

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue

    const label = typeof candidate.label === 'string'
      ? candidate.label
      : typeof candidate.display_name === 'string'
        ? candidate.display_name
        : typeof candidate.name === 'string'
          ? candidate.name
          : ''

    const lat = Number(candidate.lat)
    const lon = Number(candidate.lon)

    if (!label || !isFiniteNumber(lat) || !isFiniteNumber(lon)) {
      continue
    }

    return {
      label,
      lat,
      lon,
      placeId: typeof candidate.placeId === 'string' ? candidate.placeId : typeof candidate.place_id === 'string' ? candidate.place_id : undefined,
      countryCode: typeof candidate.countryCode === 'string' ? candidate.countryCode : typeof candidate.country_code === 'string' ? candidate.country_code : undefined,
    }
  }

  const fallbackLat = Number(spec.distance_origin_lat)
  const fallbackLon = Number(spec.distance_origin_lon)
  const fallbackLabel = typeof listing.distance_origin === 'string' ? listing.distance_origin : typeof spec.distance_origin === 'string' ? spec.distance_origin : ''

  if (fallbackLabel && isFiniteNumber(fallbackLat) && isFiniteNumber(fallbackLon)) {
    return {
      label: fallbackLabel,
      lat: fallbackLat,
      lon: fallbackLon,
      placeId: typeof spec.distance_origin_place_id === 'string' ? spec.distance_origin_place_id : undefined,
      countryCode: typeof spec.distance_origin_country_code === 'string' ? spec.distance_origin_country_code : undefined,
    }
  }

  return null
}

export function calculateListingDistanceKm(listing: ListingLike, viewerLocation: MarketplaceLocation | null) {
  const originLocation = extractListingLocation(listing)

  if (
    viewerLocation &&
    isFiniteNumber(viewerLocation.lat) &&
    isFiniteNumber(viewerLocation.lon) &&
    originLocation &&
    isFiniteNumber(originLocation.lat) &&
    isFiniteNumber(originLocation.lon)
  ) {
    return haversineDistanceKm(viewerLocation.lat, viewerLocation.lon, originLocation.lat, originLocation.lon)
  }

  return typeof listing.distance_km === 'number' && Number.isFinite(listing.distance_km)
    ? listing.distance_km
    : 0
}
