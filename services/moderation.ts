import { Platform } from 'react-native'

export interface ModerationSnapshot {
  bannedUsers: string[]
  bannedBots: string[]
  blockedListings: string[]
}

type ModerationState = ModerationSnapshot

const STORAGE_KEY = 'agentmarket.moderation'

const defaultState: ModerationState = {
  bannedUsers: [],
  bannedBots: [],
  blockedListings: [],
}

let state = loadState()

const ILLEGAL_KEYWORDS = [
  'weapon',
  'gun',
  'ammo',
  'explosive',
  'bomb',
  'drugs',
  'narcotic',
  'stolen',
  'counterfeit',
  'fake id',
  'fraud',
  'carding',
  'hack',
  'malware',
  'child exploitation',
]

function loadState(): ModerationState {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ModerationState>
        return {
          bannedUsers: Array.isArray(parsed.bannedUsers) ? parsed.bannedUsers : [],
          bannedBots: Array.isArray(parsed.bannedBots) ? parsed.bannedBots : [],
          blockedListings: Array.isArray(parsed.blockedListings) ? parsed.blockedListings : [],
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }

  return { ...defaultState }
}

function saveState(next: ModerationState) {
  state = next
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
}

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase()
}

function addUnique(list: string[], value: string) {
  if (list.includes(value)) return list
  return [...list, value]
}

export function getModerationSnapshot(): ModerationSnapshot {
  return {
    bannedUsers: [...state.bannedUsers],
    bannedBots: [...state.bannedBots],
    blockedListings: [...state.blockedListings],
  }
}

export function banUser(identifier: string) {
  const value = normalize(identifier)
  if (!value) return
  saveState({
    ...state,
    bannedUsers: addUnique(state.bannedUsers, value),
  })
}

export function unbanUser(identifier: string) {
  const value = normalize(identifier)
  if (!value) return
  saveState({
    ...state,
    bannedUsers: state.bannedUsers.filter((item) => item !== value),
  })
}

export function banBot(identifier: string) {
  const value = normalize(identifier)
  if (!value) return
  saveState({
    ...state,
    bannedBots: addUnique(state.bannedBots, value),
  })
}

export function unbanBot(identifier: string) {
  const value = normalize(identifier)
  if (!value) return
  saveState({
    ...state,
    bannedBots: state.bannedBots.filter((item) => item !== value),
  })
}

export function blockListing(listingId: string) {
  const value = normalize(listingId)
  if (!value) return
  saveState({
    ...state,
    blockedListings: addUnique(state.blockedListings, value),
  })
}

export function unblockListing(listingId: string) {
  const value = normalize(listingId)
  if (!value) return
  saveState({
    ...state,
    blockedListings: state.blockedListings.filter((item) => item !== value),
  })
}

export function isSellerBanned(identifier?: string | null) {
  const value = normalize(identifier)
  return Boolean(value) && (state.bannedUsers.includes(value) || state.bannedBots.includes(value))
}

export function isListingBlocked(listingId?: string | null) {
  const value = normalize(listingId)
  return Boolean(value) && state.blockedListings.includes(value)
}

export function scanListingSafety(input: {
  title?: string
  description?: string
  main_category?: string
  subcategory?: string
  specifications?: Record<string, any>
}): string | null {
  const haystack = [
    input.title,
    input.description,
    input.main_category,
    input.subcategory,
    JSON.stringify(input.specifications || {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const match = ILLEGAL_KEYWORDS.find((keyword) => haystack.includes(keyword))
  if (match) {
    return `Listing blocked by safety filter: suspected illegal content (${match}).`
  }

  return null
}
