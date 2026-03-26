import { supabase, isSupabaseConfigured } from './supabase'
import { isSellerBanned, isListingBlocked } from './moderation'

export interface Listing {
  id: string
  title: string
  description?: string
  price: number
  condition_rating: number
  distance_km: number
  distance_origin?: string
  image_urls?: string[]
  main_category?: string
  subcategory?: string
  specifications?: Record<string, any>
  negotiation_logic: 'standard' | 'aggressive' | 'strict'
  seller_id?: string
  status: 'active' | 'sold' | 'pending' | 'hidden'
  published_at?: string
  hidden_reason?: string | null
  created_at: string
  updated_at: string
}

export interface ListingFilters {
  maxDistance?: number
  maxPrice?: number
  minCondition?: number
  status?: 'active' | 'sold' | 'pending' | 'hidden'
}

const LISTING_LIFETIME_DAYS = 30

function nowIso() {
  return new Date().toISOString()
}

function daysBetween(startIso: string | undefined, end = new Date()) {
  if (!startIso) return 0
  const start = new Date(startIso).getTime()
  return Math.floor((end.getTime() - start) / (1000 * 60 * 60 * 24))
}

function createPlaceholderImage(label: string, tint: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0b1326" />
          <stop offset="100%" stop-color="${tint}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)" />
      <circle cx="980" cy="180" r="120" fill="#abc7ff" fill-opacity="0.12" />
      <circle cx="180" cy="620" r="160" fill="#00e1ab" fill-opacity="0.12" />
      <text x="80" y="620" fill="#dae2fd" font-family="Space Grotesk, Arial, sans-serif" font-size="84" font-weight="700">${label}</text>
      <text x="80" y="700" fill="#8f9095" font-family="Inter, Arial, sans-serif" font-size="34">AgentMarket listing</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const MOCK_LISTINGS_STORAGE_KEY = 'agentmarket.mock.listings'

function readMockListingsFromStorage(): Listing[] | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(MOCK_LISTINGS_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Listing[]) : null
  } catch {
    return null
  }
}

function persistMockListingsToStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(MOCK_LISTINGS_STORAGE_KEY, JSON.stringify(mockListingStore))
  } catch {
    // Ignore storage failures in constrained environments.
  }
}

function notifyMockListingsChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event('agentmarket:listings-updated'))
}

let mockListingStore: Listing[] = [
  {
    id: 'lst_sock_001',
    title: 'Rasmus Dirty Sock - Used',
    description: 'Authentic dirty sock from Rasmus. 48 hours of wear. Unwashed.',
    price: 50,
    condition_rating: 0.85,
    distance_km: 0.5,
    distance_origin: 'Aarhus, Denmark',
    image_urls: [createPlaceholderImage('Dirty Sock', '#5a637a')],
    main_category: 'Home & Living',
    subcategory: 'Home Decor',
    published_at: new Date().toISOString(),
    specifications: {
      material: 'cotton',
      size: 'EU 42',
      color: 'white (now gray)',
      usage_hours: '48',
      odor_level: 'medium',
      washed: false,
    },
    negotiation_logic: 'standard',
    status: 'active',
    seller_id: 'sel_rasmus_001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lst_gpu_001',
    title: 'Industrial GPU Node V2',
    description: 'High-performance GPU compute node',
    price: 2500,
    condition_rating: 0.92,
    distance_km: 12,
    distance_origin: 'Aarhus, Denmark',
    image_urls: [createPlaceholderImage('GPU Node', '#277be7')],
    main_category: 'Handmade Supplies',
    subcategory: 'Digital Files & Templates',
    published_at: new Date(Date.now() - 86400000).toISOString(),
    specifications: {
      cores: 8192,
      memory: '16GB GDDR6',
      brand: 'NVIDIA',
    },
    negotiation_logic: 'standard',
    status: 'active',
    seller_id: 'sel_claw_001',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'lst_neural_001',
    title: 'Neural Mesh Controller',
    description: 'Neural network processing unit',
    price: 1800,
    condition_rating: 0.85,
    distance_km: 8,
    distance_origin: 'Copenhagen, Denmark',
    image_urls: [createPlaceholderImage('Neural Mesh', '#00b894')],
    main_category: 'Fine Art & Collectibles',
    subcategory: 'Digital Art Prints',
    published_at: new Date(Date.now() - 172800000).toISOString(),
    specifications: {
      throughput: '100GB/s',
      nodes: 128,
    },
    negotiation_logic: 'aggressive',
    status: 'active',
    seller_id: 'sel_claw_001',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

const storedMockListings = readMockListingsFromStorage()
if (storedMockListings) {
  mockListingStore = storedMockListings
}

export function upsertMockListingRecord(listing: Listing) {
  const index = mockListingStore.findIndex((item) => item.id === listing.id)
  if (index >= 0) {
    mockListingStore[index] = listing
  } else {
    mockListingStore.unshift(listing)
  }

  persistMockListingsToStorage()
  notifyMockListingsChanged()
}

/**
 * Fetch all active listings with optional filters
 */
export async function getListings(filters?: ListingFilters): Promise<Listing[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, returning mock data')
    const storedListings = readMockListingsFromStorage()
    if (storedListings) {
      mockListingStore = storedListings
    }
    return getMockListings(filters)
  }

  let query = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else {
    query = query.eq('status', 'active')
  }

  if (filters?.maxDistance) {
    query = query.lte('distance_km', filters.maxDistance)
  }

  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }

  if (filters?.minCondition) {
    query = query.gte('condition_rating', filters.minCondition)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching listings:', error)
    throw error
  }

  return (data || []).filter((listing) => !isSellerBanned(listing.seller_id) && !isListingBlocked(listing.id))
}

/**
 * Fetch a single listing by ID
 */
export async function getListing(id: string): Promise<Listing | null> {
  if (!isSupabaseConfigured || !supabase) {
    const storedListings = readMockListingsFromStorage()
    if (storedListings) {
      mockListingStore = storedListings
    }
    return getMockListings().find(l => l.id === id) || null
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching listing:', error)
    return null
  }

  if (!data || data.status === 'hidden' || isSellerBanned(data.seller_id) || isListingBlocked(data.id)) {
    return null
  }

  return data
}

/**
 * Create a new listing
 */
export async function createListing(listing: Omit<Listing, 'id' | 'created_at' | 'updated_at'>): Promise<Listing> {
  if (!isSupabaseConfigured || !supabase) {
    const created = {
      ...listing,
      id: `lst_${Date.now().toString(36)}`,
      status: listing.status || 'active',
      published_at: listing.published_at || nowIso(),
      hidden_reason: listing.hidden_reason || null,
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    mockListingStore.unshift(created as Listing)
    persistMockListingsToStorage()
    notifyMockListingsChanged()
    return created as Listing
  }

  const { data, error } = await supabase
    .from('listings')
    .insert(listing)
    .select()
    .single()

  if (error) {
    console.error('Error creating listing:', error)
    throw error
  }

  return data
}

/**
 * Update a listing
 */
export async function updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
  if (!isSupabaseConfigured || !supabase) {
    const storedListings = readMockListingsFromStorage()
    if (storedListings) {
      mockListingStore = storedListings
    }

    const existing = mockListingStore.find((item) => item.id === id)
    if (!existing) {
      throw new Error('Listing not found')
    }

    const updated: Listing = {
      ...existing,
      ...updates,
      published_at:
        updates.status === 'active' && existing.status === 'hidden'
          ? nowIso()
          : updates.published_at || existing.published_at,
      hidden_reason: updates.status === 'hidden' ? updates.hidden_reason || existing.hidden_reason || 'manual' : updates.hidden_reason ?? existing.hidden_reason,
      updated_at: nowIso(),
    }

    mockListingStore = mockListingStore.map((item) => (item.id === id ? updated : item))
    persistMockListingsToStorage()
    notifyMockListingsChanged()
    return updated
  }

  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating listing:', error)
    throw error
  }

  return data
}

/**
 * Delete a listing
 */
export async function deleteListing(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    mockListingStore = mockListingStore.filter((item) => item.id !== id)
    persistMockListingsToStorage()
    notifyMockListingsChanged()
    return
  }

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting listing:', error)
    throw error
  }
}

/**
 * Mock listings for development/fallback
 */
function getMockListings(filters?: ListingFilters): Listing[] {
  const storedListings = readMockListingsFromStorage()
  if (storedListings) {
    mockListingStore = storedListings
  }

  syncMockVisibility()

  let listings = [...mockListingStore].sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (filters?.status) {
    listings = listings.filter((listing) => listing.status === filters.status)
  } else {
    listings = listings.filter((listing) => listing.status === 'active')
  }

  if (filters?.maxDistance !== undefined) {
    listings = listings.filter((listing) => listing.distance_km <= filters.maxDistance!)
  }

  if (filters?.maxPrice !== undefined) {
    listings = listings.filter((listing) => listing.price <= filters.maxPrice!)
  }

  if (filters?.minCondition !== undefined) {
    listings = listings.filter((listing) => listing.condition_rating >= filters.minCondition!)
  }

  return listings
    .filter((listing) => !isSellerBanned(listing.seller_id) && !isListingBlocked(listing.id))
    .map((listing) => ({ ...listing }))
}

function matchesSearch(listing: Listing, query: string) {
  const searchable = [
    listing.title,
    listing.description,
    listing.distance_origin,
    listing.main_category,
    listing.subcategory,
    JSON.stringify(listing.specifications || {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchable.includes(query.toLowerCase())
}

function syncMockVisibility() {
  const now = new Date()
  let changed = false
  mockListingStore = mockListingStore.map((listing) => {
    if (listing.status !== 'active') return listing
    if (daysBetween(listing.published_at || listing.created_at, now) >= LISTING_LIFETIME_DAYS) {
      changed = true
      return {
        ...listing,
        status: 'hidden',
        hidden_reason: 'expired',
        updated_at: nowIso(),
      }
    }
    return listing
  })

  if (changed) {
    persistMockListingsToStorage()
    notifyMockListingsChanged()
  }
}

export async function hideListing(id: string, reason: string = 'manual'): Promise<Listing> {
  return updateListing(id, { status: 'hidden', hidden_reason: reason })
}

export async function unhideListing(id: string): Promise<Listing> {
  return updateListing(id, { status: 'active', hidden_reason: null, published_at: nowIso() })
}

export async function getAdminListings(): Promise<Listing[]> {
  if (!isSupabaseConfigured || !supabase) {
    const storedListings = readMockListingsFromStorage()
    if (storedListings) {
      mockListingStore = storedListings
    }
    syncMockVisibility()
    return [...mockListingStore].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching admin listings:', error)
    throw error
  }

  return (data || []).filter((listing) => !isSellerBanned(listing.seller_id) && !isListingBlocked(listing.id))
}

export async function searchListings(query: string, filters?: ListingFilters): Promise<Listing[]> {
  if (!query.trim()) return []

  const listings = await getListings(filters)
  return listings.filter((listing) => matchesSearch(listing, query.trim()))
}
