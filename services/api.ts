import { supabase, isSupabaseConfigured } from './supabase'
import { scanListingSafety, isSellerBanned } from './moderation'
import {
  createListing as createListingRecord,
  deleteListing as deleteListingRecord,
  getListing as getListingRecord,
  getListings as getListingsRecord,
  updateListing as updateListingRecord,
} from './listings'

// ============================================================
// Types
// ============================================================

export interface CreateListingRequest {
  title: string
  description?: string
  price: number
  distance_km: number
  distance_origin?: string
  condition_rating: number
  images?: string[]
  negotiation_logic?: 'standard' | 'aggressive' | 'strict'
  main_category?: string
  subcategory?: string
  specifications?: Record<string, any>
  seller_id?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AgentProfile {
  id: string
  agent_name: string
  agent_id: string
  verified: boolean
  human_user_id?: string
  created_at: string
}

export interface NegotiationRequest {
  listing_id: string
  offer_price: number
  message?: string
}

// ============================================================
// Utilities
// ============================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function handleError(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

function normalizeSellerId(sellerId?: string) {
  if (!sellerId) return null
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId)
  return looksLikeUuid ? sellerId : null
}

// ============================================================
// LISTINGS API
// ============================================================

/**
 * Create a new listing
 * POST /api/listings
 */
export async function createListingAPI(
  request: CreateListingRequest
): Promise<ApiResponse<{ id: string; title: string; price: number }>> {
  if (!isSupabaseConfigured || !supabase) {
    if (!request.title || request.title.length < 5) {
      return { success: false, error: 'Title must be at least 5 characters' }
    }
    if (request.price <= 0) {
      return { success: false, error: 'Price must be positive' }
    }
    if (request.condition_rating < 0 || request.condition_rating > 1) {
      return { success: false, error: 'Condition must be between 0 and 1' }
    }

    const safetyError = scanListingSafety({
      title: request.title,
      description: request.description,
      main_category: request.main_category,
      subcategory: request.subcategory,
      specifications: request.specifications,
    })

    if (safetyError) {
      return { success: false, error: safetyError }
    }

    if (isSellerBanned(request.seller_id)) {
      return { success: false, error: 'Seller is banned from posting listings' }
    }

    const createdListing = await createListingRecord({
      title: request.title,
      description: request.description,
      price: request.price,
      distance_km: request.distance_km,
      distance_origin: request.distance_origin,
      image_urls: request.images,
      main_category: request.main_category,
      subcategory: request.subcategory,
      condition_rating: request.condition_rating,
      specifications: request.specifications || {},
      negotiation_logic: request.negotiation_logic || 'standard',
      status: 'active',
      seller_id: normalizeSellerId(request.seller_id) || undefined,
      published_at: new Date().toISOString(),
      hidden_reason: null,
    })

    return { success: true, data: { id: createdListing.id, title: createdListing.title, price: createdListing.price } }
  }

  // Validation
  if (!request.title || request.title.length < 5) {
    return { success: false, error: 'Title must be at least 5 characters' }
  }
  if (request.price <= 0) {
    return { success: false, error: 'Price must be positive' }
  }
  if (request.condition_rating < 0 || request.condition_rating > 1) {
    return { success: false, error: 'Condition must be between 0 and 1' }
  }

  const safetyError = scanListingSafety({
    title: request.title,
    description: request.description,
    main_category: request.main_category,
    subcategory: request.subcategory,
    specifications: request.specifications,
  })

  if (safetyError) {
    return { success: false, error: safetyError }
  }

  if (isSellerBanned(request.seller_id)) {
    return { success: false, error: 'Seller is banned from posting listings' }
  }

  try {
    const { data, error } = await supabase
      .from('listings')
      .insert({
        id: generateUUID(),
        title: request.title,
        description: request.description || '',
        price: request.price,
        distance_km: request.distance_km,
        distance_origin: request.distance_origin || null,
        image_urls: request.images || [],
        main_category: request.main_category || null,
        subcategory: request.subcategory || null,
        condition_rating: request.condition_rating,
        specifications: request.specifications || {},
        negotiation_logic: request.negotiation_logic || 'standard',
        status: 'active',
        published_at: new Date().toISOString(),
        seller_id: normalizeSellerId(request.seller_id),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    return {
      success: true,
      data: { id: data.id, title: data.title, price: data.price }
    }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get all listings with optional filters
 * GET /api/listings
 */
export async function getListingsAPI(filters?: {
  maxDistance?: number
  maxPrice?: number
  minCondition?: number
  status?: 'active' | 'sold' | 'pending'
  limit?: number
  offset?: number
}): Promise<ApiResponse<any[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, data: getListingsRecord(filters) }
  }

  try {
    let query = supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    query = query.eq('status', filters?.status || 'active')
    
    if (filters?.maxDistance) {
      query = query.lte('distance_km', filters.maxDistance)
    }
    if (filters?.maxPrice) {
      query = query.lte('price', filters.maxPrice)
    }
    if (filters?.minCondition) {
      query = query.gte('condition_rating', filters.minCondition)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
    }

    const { data, error } = await query

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get a single listing by ID
 * GET /api/listings/:id
 */
export async function getListingAPI(listingId: string): Promise<ApiResponse<any>> {
  if (!isSupabaseConfigured || !supabase) {
    const listing = await getListingRecord(listingId)
    if (!listing) {
      return { success: false, error: 'Listing not found' }
    }

    return { success: true, data: listing }
  }

  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listingId)
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Update a listing
 * PATCH /api/listings/:id
 */
export async function updateListingAPI(
  listingId: string,
  updates: {
    title?: string
    description?: string
    price?: number
    distance_km?: number
    condition_rating?: number
    specifications?: Record<string, any>
    status?: 'active' | 'sold' | 'pending'
  }
): Promise<ApiResponse<{ id: string; title: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    const updated = await updateListingRecord(listingId, {
      ...updates,
      status: updates.status,
    })

    return { success: true, data: { id: updated.id, title: updated.title } }
  }

  try {
    const { data, error } = await supabase
      .from('listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: { id: data.id, title: data.title } }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Delete a listing
 * DELETE /api/listings/:id
 */
export async function deleteListingAPI(listingId: string): Promise<ApiResponse<{ id: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    const deleted = await deleteListingRecord(listingId)
    if (!deleted) {
      return { success: false, error: 'Listing not found' }
    }

    return { success: true, data: { id: listingId } }
  }

  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId)

    if (error) return { success: false, error: error.message }
    return { success: true, data: { id: listingId } }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

// ============================================================
// AGENTS API
// ============================================================

/**
 * Register a new agent
 * POST /api/agents
 */
export async function createAgentAPI(request: {
  agent_name: string
  agent_id: string
  human_user_id?: string
}): Promise<ApiResponse<AgentProfile>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('agent_tokens')
      .insert({
        id: generateUUID(),
        agent_name: request.agent_name,
        agent_id: request.agent_id,
        human_user_id: request.human_user_id || null,
        verified: false,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get agent profile
 * GET /api/agents/:id
 */
export async function getAgentAPI(agentId: string): Promise<ApiResponse<AgentProfile>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('agent_tokens')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Link agent to human user
 * POST /api/agents/:id/link
 */
export async function linkAgentAPI(request: {
  agent_id: string
  human_user_id: string
}): Promise<ApiResponse<{ verified: boolean }>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('agent_tokens')
      .update({
        human_user_id: request.human_user_id,
        verified: true,
      })
      .eq('agent_id', request.agent_id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: { verified: data.verified } }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get all agents for a human user
 * GET /api/agents?human_user_id=xxx
 */
export async function getAgentsAPI(humanUserId: string): Promise<ApiResponse<AgentProfile[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('agent_tokens')
      .select('*')
      .eq('human_user_id', humanUserId)

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

// ============================================================
// MESSAGES API
// ============================================================

/**
 * Send a message
 * POST /api/messages
 */
export async function sendMessageAPI(request: {
  recipient_id?: string
  content: string
  sender_type?: 'human' | 'agent'
  sender_name?: string
}): Promise<ApiResponse<{ id: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        id: generateUUID(),
        recipient_id: request.recipient_id || null,
        content: request.content,
        sender_type: request.sender_type || 'agent',
        sender_name: request.sender_name || 'Claw',
        spam_flag: false,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data: { id: data.id } }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get messages
 * GET /api/messages
 */
export async function getMessagesAPI(filters?: {
  recipient_id?: string
  sender_type?: 'human' | 'agent'
  spam?: boolean
  limit?: number
}): Promise<ApiResponse<any[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.recipient_id) {
      query = query.eq('recipient_id', filters.recipient_id)
    }
    if (filters?.sender_type) {
      query = query.eq('sender_type', filters.sender_type)
    }
    if (filters?.spam !== undefined) {
      query = query.eq('spam_flag', filters.spam)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Mark message as spam
 * PATCH /api/messages/:id/spam
 */
export async function markMessageSpamAPI(messageId: string, spam: boolean): Promise<ApiResponse<{ id: string }>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('messages')
      .update({ spam_flag: spam })
      .eq('id', messageId)

    if (error) return { success: false, error: error.message }
    return { success: true, data: { id: messageId } }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

// ============================================================
// NEGOTIATIONS API
// ============================================================

/**
 * Start a negotiation
 * POST /api/negotiations
 */
export async function createNegotiationAPI(request: NegotiationRequest): Promise<ApiResponse<any>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('negotiation_messages')
      .insert({
        id: generateUUID(),
        listing_id: request.listing_id,
        offer_price: request.offer_price,
        message: request.message || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get negotiations for a listing
 * GET /api/negotiations?listing_id=xxx
 */
export async function getNegotiationsAPI(listingId: string): Promise<ApiResponse<any[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('negotiation_messages')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: data || [] }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Update negotiation status
 * PATCH /api/negotiations/:id
 */
export async function updateNegotiationAPI(
  negotiationId: string,
  updates: {
    status?: 'pending' | 'accepted' | 'rejected' | 'countered'
    offer_price?: number
    message?: string
  }
): Promise<ApiResponse<any>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('negotiation_messages')
      .update(updates)
      .eq('id', negotiationId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

// ============================================================
// USERS API
// ============================================================

/**
 * Create a human user
 * POST /api/users
 */
export async function createUserAPI(request: {
  name: string
  email?: string
}): Promise<ApiResponse<any>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('human_users')
      .insert({
        id: generateUUID(),
        name: request.name,
        email: request.email || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

/**
 * Get user profile
 * GET /api/users/:id
 */
export async function getUserAPI(userId: string): Promise<ApiResponse<any>> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { data, error } = await supabase
      .from('human_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    return { success: false, error: handleError(err) }
  }
}

// ============================================================
// COMMAND PROCESSING
// ============================================================

/**
 * Process natural language commands from AI agents
 */
export async function processAgentCommand(command: string): Promise<ApiResponse<any>> {
  const cmd = command.toLowerCase().trim()

  // Parse "create listing" commands
  const createMatch = cmd.match(/create\s+listing[:\s]+(.+)/i)
  if (createMatch) {
    return {
      success: false,
      error: 'Use the form to create a listing with full details',
    }
  }

  // Parse "find" or "search" commands
  if (cmd.startsWith('find ') || cmd.startsWith('search ')) {
    return {
      success: true,
      data: { action: 'search', query: cmd.replace(/^(find|search)\s+/i, '') }
    }
  }

  // Parse "open" commands
  if (cmd.startsWith('open ') || cmd.startsWith('view ')) {
    return {
      success: true,
      data: { action: 'open', target: cmd.replace(/^(open|view)\s+/i, '') }
    }
  }

  // Parse "delete" commands
  if (cmd.startsWith('delete ') || cmd.startsWith('remove ')) {
    return {
      success: true,
      data: { action: 'delete', target: cmd.replace(/^(delete|remove)\s+/i, '') }
    }
  }

  // Parse "message" commands
  if (cmd.startsWith('message ') || cmd.startsWith('msg ')) {
    return {
      success: true,
      data: { action: 'message', content: cmd.replace(/^(message|msg)\s+/i, '') }
    }
  }

  return {
    success: false,
    error: 'Unknown command. Try: find, search, open, delete, message'
  }
}
