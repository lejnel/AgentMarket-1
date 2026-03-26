type NominatimAddress = {
  road?: string
  pedestrian?: string
  footway?: string
  cycleway?: string
  path?: string
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  country?: string
  country_code?: string
}

type NominatimResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  class?: string
  type?: string
  name?: string
  address?: NominatimAddress
}

export type LocationSuggestion = {
  id: string
  label: string
  subtitle: string
  lat: number
  lon: number
  countryCode?: string
}

function formatLabel(result: NominatimResult) {
  const address = result.address || {}
  const street = address.road || address.pedestrian || address.footway || address.cycleway || address.path || result.name
  const locality = address.city || address.town || address.village || address.municipality || address.county || address.state
  const country = address.country

  const parts = [street, locality, country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : result.display_name
}

function scoreSuggestion(result: NominatimResult, query: string) {
  const haystack = [formatLabel(result), result.display_name, result.name, result.address?.road]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (haystack.startsWith(query)) return 0
  if (haystack.includes(` ${query}`)) return 1
  if (haystack.includes(query)) return 2
  return 3
}

export async function searchLocationSuggestions(query: string, signal?: AbortSignal): Promise<LocationSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return []
  }

  const endpoint = new URL('https://nominatim.openstreetmap.org/search')
  endpoint.searchParams.set('format', 'jsonv2')
  endpoint.searchParams.set('addressdetails', '1')
  endpoint.searchParams.set('namedetails', '1')
  endpoint.searchParams.set('limit', '8')
  endpoint.searchParams.set('q', trimmed)

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Location lookup failed with status ${response.status}`)
  }

  const data = (await response.json()) as NominatimResult[]
  const normalizedQuery = trimmed.toLowerCase()

  return data
    .map((result) => ({
      id: String(result.place_id),
      label: formatLabel(result),
      subtitle: result.display_name,
      lat: Number(result.lat),
      lon: Number(result.lon),
      countryCode: result.address?.country_code?.toUpperCase(),
      _score: scoreSuggestion(result, normalizedQuery),
    }))
    .sort((left, right) => left._score - right._score)
    .map(({ _score, ...suggestion }) => suggestion)
    .filter((suggestion) => Boolean(suggestion.label))
}

export async function resolveLocationSuggestion(query: string, signal?: AbortSignal): Promise<LocationSuggestion | null> {
  const suggestions = await searchLocationSuggestions(query, signal)
  return suggestions[0] || null
}
