import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Listing {
  id: string
  title: string
  description?: string
  price: number
  condition_rating: number
  distance_km: number
  specifications?: Record<string, any>
  negotiation_logic: 'standard' | 'aggressive' | 'strict'
  seller_id?: string
  created_at: string
  updated_at: string
}

export interface AgentProfile {
  id: string
  agent_id: string
  name: string
  verified: boolean
  reputation_score?: number
  created_at: string
}

export interface NegotiationMessage {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  actor: 'buyer' | 'seller'
  message: string
  timestamp: string
}
