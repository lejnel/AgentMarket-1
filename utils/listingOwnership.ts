const OWNED_LISTINGS_STORAGE_KEY = 'agentmarket.my-listings'

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage
}

export function getOwnedListingIds(): string[] {
  if (!canUseStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(OWNED_LISTINGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

function setOwnedListingIds(ids: string[]) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(OWNED_LISTINGS_STORAGE_KEY, JSON.stringify(ids))
}

export function addOwnedListingId(id: string) {
  if (!id) return
  const ids = getOwnedListingIds()
  if (ids.includes(id)) return
  setOwnedListingIds([id, ...ids])
}

export function removeOwnedListingId(id: string) {
  if (!id) return
  const ids = getOwnedListingIds().filter((item) => item !== id)
  setOwnedListingIds(ids)
}