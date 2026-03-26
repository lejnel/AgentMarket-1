import * as api from '../services/api'
import * as listingsService from '../services/listings'
import * as agentsService from '../services/agents'
import * as negotiationsService from '../services/negotiations'
import * as negotiator from '../services/agentNegotiator'
import * as verificationService from '../services/verification'
import * as helpers from '../utils/helpers'
import * as validation from '../constants/validation'
import * as agentConfig from '../constants/agentConfig'

type Result = { name: string; ok: boolean; details?: string }

const results: Result[] = []

function record(name: string, ok: boolean, details?: string) {
  results.push({ name, ok, details })
}

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    record(name, true)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    record(name, false, message)
  }
}

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

async function main() {
  // utils/helpers
  await run('helpers.formatPrice', () => {
    expect(helpers.formatPrice(1234).includes('DKK'), 'formatPrice should include currency')
  })

  await run('helpers.formatDistance', () => {
    expect(typeof helpers.formatDistance(0.4) === 'string', 'formatDistance should return string')
  })

  await run('helpers.formatRelativeTime', () => {
    expect(typeof helpers.formatRelativeTime(new Date()) === 'string', 'formatRelativeTime should return string')
  })

  await run('helpers.formatCondition', () => {
    expect(typeof helpers.formatCondition(0.8) === 'string', 'formatCondition should return string')
  })

  await run('helpers.getConditionColor', () => {
    expect(helpers.getConditionColor(0.8).startsWith('#'), 'getConditionColor should return hex color')
  })

  await run('helpers.truncate', () => {
    expect(helpers.truncate('abcdef', 3).length <= 6, 'truncate should shorten long text')
  })

  await run('helpers.generateId', () => {
    expect(helpers.generateId().length > 0, 'generateId should return id')
  })

  await run('helpers.isValidEmail', () => {
    expect(helpers.isValidEmail('a@b.com') === true, 'isValidEmail should accept valid email')
  })

  await run('helpers.debounce', () => {
    const debounced = helpers.debounce(() => 1, 10)
    expect(typeof debounced === 'function', 'debounce should return function')
  })

  await run('helpers.sleep', async () => {
    await helpers.sleep(1)
  })

  await run('helpers.isWeb', () => {
    expect(typeof helpers.isWeb() === 'boolean', 'isWeb should return boolean')
  })

  await run('helpers.formatDate', () => {
    expect(typeof helpers.formatDate(new Date()) === 'string', 'formatDate should return string')
  })

  await run('helpers.formatTime', () => {
    expect(typeof helpers.formatTime(new Date()) === 'string', 'formatTime should return string')
  })

  await run('helpers.calculateNegotiatedPrice', () => {
    expect(typeof helpers.calculateNegotiatedPrice(100, 0.1) === 'number', 'calculateNegotiatedPrice should return number')
  })

  await run('helpers.parseQueryParams', () => {
    const params = helpers.parseQueryParams('https://x.test?a=1&b=2')
    expect(params.a === '1' && params.b === '2', 'parseQueryParams should parse url params')
  })

  await run('helpers.slugify', () => {
    expect(helpers.slugify('Hello World') === 'hello-world', 'slugify should normalize text')
  })

  // constants/validation
  await run('validation.validateListingTitle', () => {
    expect(validation.validateListingTitle('valid title') === null, 'validateListingTitle should pass valid title')
  })

  await run('validation.validateListingPrice', () => {
    expect(validation.validateListingPrice('100') === null, 'validateListingPrice should pass positive value')
  })

  await run('validation.validateAgentName', () => {
    expect(validation.validateAgentName('Claw') === null, 'validateAgentName should pass valid name')
  })

  await run('validation.validateAgentId', () => {
    expect(validation.validateAgentId('claw-001') === null, 'validateAgentId should pass valid id')
  })

  await run('validation.validateEmail', () => {
    expect(validation.validateEmail('test@example.com') === null, 'validateEmail should pass valid email')
  })

  // constants/agentConfig
  await run('agentConfig.parseAgentCommand', () => {
    const parsed = agentConfig.parseAgentCommand('find gpu')
    expect(typeof parsed.action === 'string', 'parseAgentCommand should return action')
  })

  await run('agentConfig.formatAgentResponse', () => {
    const msg = agentConfig.formatAgentResponse('search', { found: 1 })
    expect(typeof msg === 'string', 'formatAgentResponse should return string')
  })

  await run('agentConfig.getAgentContext', () => {
    const ctx = agentConfig.getAgentContext()
    expect(typeof ctx === 'object' && ctx !== null, 'getAgentContext should return object')
  })

  // services/agentNegotiator
  await run('agentNegotiator.evaluateDeal', () => {
    const listing = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      id: 'x',
      name: 'GPU',
      price: 100,
      location: { km: 10 },
      ai: {
        specifications: {},
        condition_rating: 0.9,
        negotiation_logic: 'standard' as const,
      },
    }
    const result = negotiator.evaluateDeal(listing, 90)
    expect(typeof result.recommendation === 'string', 'evaluateDeal should return recommendation')
  })

  await run('agentNegotiator.simulateNegotiation', () => {
    const listing = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      id: 'x',
      name: 'GPU',
      price: 100,
      location: { km: 10 },
      ai: {
        specifications: {},
        condition_rating: 0.9,
        negotiation_logic: 'standard' as const,
      },
    }
    const log = negotiator.simulateNegotiation(listing)
    expect(Array.isArray(log), 'simulateNegotiation should return log array')
  })

  // services/listings (fallback mode without Supabase)
  let firstListingId = ''
  await run('listings.getListings', async () => {
    const data = await listingsService.getListings({ maxDistance: 50 })
    expect(Array.isArray(data) && data.length > 0, 'getListings should return mock listings')
    firstListingId = data[0].id
  })

  await run('listings.getListing', async () => {
    const item = await listingsService.getListing(firstListingId)
    expect(!!item, 'getListing should find mock listing by id')
  })

  await run('listings.createListing throws without Supabase', async () => {
    let threw = false
    try {
      await listingsService.createListing({
        title: 'Local Test Listing',
        description: 'desc',
        price: 1,
        condition_rating: 0.5,
        distance_km: 1,
        specifications: {},
        negotiation_logic: 'standard',
        status: 'active',
        seller_id: 'seller',
      })
    } catch {
      threw = true
    }
    expect(threw, 'createListing should throw when Supabase is unavailable')
  })

  await run('listings.updateListing throws without Supabase', async () => {
    let threw = false
    try {
      await listingsService.updateListing(firstListingId, { title: 'Updated' })
    } catch {
      threw = true
    }
    expect(threw, 'updateListing should throw when Supabase is unavailable')
  })

  await run('listings.deleteListing throws without Supabase', async () => {
    let threw = false
    try {
      await listingsService.deleteListing(firstListingId)
    } catch {
      threw = true
    }
    expect(threw, 'deleteListing should throw when Supabase is unavailable')
  })

  // services/api listings fallback store
  let createdId = ''
  await run('api.getListingsAPI', async () => {
    const res = await api.getListingsAPI({ limit: 5 })
    expect(res.success && Array.isArray(res.data), 'getListingsAPI should succeed in fallback mode')
  })

  await run('api.createListingAPI', async () => {
    const res = await api.createListingAPI({
      title: 'Smoke Listing 12345',
      price: 99,
      distance_km: 3,
      condition_rating: 0.7,
    })
    expect(res.success && !!res.data?.id, 'createListingAPI should create listing in fallback mode')
    createdId = res.data!.id
  })

  await run('api.getListingAPI', async () => {
    const res = await api.getListingAPI(createdId)
    expect(res.success && res.data?.id === createdId, 'getListingAPI should fetch created listing')
  })

  await run('api.updateListingAPI', async () => {
    const res = await api.updateListingAPI(createdId, { title: 'Smoke Listing Updated' })
    expect(res.success, 'updateListingAPI should update listing in fallback mode')
  })

  await run('api.deleteListingAPI', async () => {
    const res = await api.deleteListingAPI(createdId)
    expect(res.success, 'deleteListingAPI should delete listing in fallback mode')
  })

  // services/api non-listing paths should fail gracefully in fallback mode
  await run('api.createAgentAPI fallback', async () => {
    const res = await api.createAgentAPI({ agent_name: 'a', agent_id: 'b' })
    expect(!res.success, 'createAgentAPI should fail gracefully without Supabase')
  })

  await run('api.getAgentAPI fallback', async () => {
    const res = await api.getAgentAPI('x')
    expect(!res.success, 'getAgentAPI should fail gracefully without Supabase')
  })

  await run('api.linkAgentAPI fallback', async () => {
    const res = await api.linkAgentAPI({ agent_id: 'x', human_user_id: 'y' })
    expect(!res.success, 'linkAgentAPI should fail gracefully without Supabase')
  })

  await run('api.getAgentsAPI fallback', async () => {
    const res = await api.getAgentsAPI('u')
    expect(!res.success, 'getAgentsAPI should fail gracefully without Supabase')
  })

  await run('api.sendMessageAPI fallback', async () => {
    const res = await api.sendMessageAPI({ content: 'hello' })
    expect(!res.success, 'sendMessageAPI should fail gracefully without Supabase')
  })

  await run('api.getMessagesAPI fallback', async () => {
    const res = await api.getMessagesAPI({ limit: 5 })
    expect(!res.success, 'getMessagesAPI should fail gracefully without Supabase')
  })

  await run('api.markMessageSpamAPI fallback', async () => {
    const res = await api.markMessageSpamAPI('x', true)
    expect(!res.success, 'markMessageSpamAPI should fail gracefully without Supabase')
  })

  await run('api.createNegotiationAPI fallback', async () => {
    const res = await api.createNegotiationAPI({ listing_id: 'x', offer_price: 1 })
    expect(!res.success, 'createNegotiationAPI should fail gracefully without Supabase')
  })

  await run('api.getNegotiationsAPI fallback', async () => {
    const res = await api.getNegotiationsAPI('x')
    expect(!res.success, 'getNegotiationsAPI should fail gracefully without Supabase')
  })

  await run('api.updateNegotiationAPI fallback', async () => {
    const res = await api.updateNegotiationAPI('x', { status: 'accepted' })
    expect(!res.success, 'updateNegotiationAPI should fail gracefully without Supabase')
  })

  await run('api.createUserAPI fallback', async () => {
    const res = await api.createUserAPI({ username: 'u', email: 'u@x.com', password_hash: 'h' })
    expect(!res.success, 'createUserAPI should fail gracefully without Supabase')
  })

  await run('api.getUserAPI fallback', async () => {
    const res = await api.getUserAPI('x')
    expect(!res.success, 'getUserAPI should fail gracefully without Supabase')
  })

  await run('api.processAgentCommand', async () => {
    const res = await api.processAgentCommand('find gpu')
    expect(res.success && res.data?.action === 'search', 'processAgentCommand should parse search command')
  })

  // services/agents fallback
  await run('agents.getAgentProfile', async () => {
    const p = await agentsService.getAgentProfile('default-agent')
    expect(!!p?.agent_id, 'getAgentProfile should return mock profile in fallback')
  })

  await run('agents.upsertAgentProfile throws without Supabase', async () => {
    let threw = false
    try {
      await agentsService.upsertAgentProfile({ agent_id: 'a' })
    } catch {
      threw = true
    }
    expect(threw, 'upsertAgentProfile should throw without Supabase')
  })

  await run('agents.verifyAgent throws without Supabase', async () => {
    let threw = false
    try {
      await agentsService.verifyAgent('a')
    } catch {
      threw = true
    }
    expect(threw, 'verifyAgent should throw without Supabase')
  })

  await run('agents.updateReputation throws without Supabase', async () => {
    let threw = false
    try {
      await agentsService.updateReputation('a', 0.8)
    } catch {
      threw = true
    }
    expect(threw, 'updateReputation should throw without Supabase')
  })

  await run('agents.getVerifiedAgents fallback', async () => {
    const data = await agentsService.getVerifiedAgents()
    expect(Array.isArray(data), 'getVerifiedAgents should return array in fallback')
  })

  // services/negotiations
  await run('negotiations.startNegotiation', async () => {
    const s = await negotiationsService.startNegotiation('l', 'b', 's')
    expect(s.status === 'active', 'startNegotiation should initialize active status')
  })

  await run('negotiations.addNegotiationMessage fallback', async () => {
    const m = await negotiationsService.addNegotiationMessage('l', 'b', 's', 'buyer', 'hello')
    expect(!!m.id, 'addNegotiationMessage should return mock message without Supabase')
  })

  await run('negotiations.getNegotiationMessages fallback', async () => {
    const msgs = await negotiationsService.getNegotiationMessages('l')
    expect(Array.isArray(msgs), 'getNegotiationMessages should return array in fallback')
  })

  await run('negotiations.runSimulatedNegotiation', () => {
    const log = negotiationsService.runSimulatedNegotiation({
      '@context': 'https://schema.org',
      '@type': 'Product',
      id: 'x',
      name: 'GPU',
      price: 100,
      location: { km: 10 },
      ai: {
        specifications: {},
        condition_rating: 0.9,
        negotiation_logic: 'standard',
      },
    })
    expect(Array.isArray(log), 'runSimulatedNegotiation should return array')
  })

  await run('negotiations.completeNegotiation', async () => {
    await negotiationsService.completeNegotiation('l', 'accepted', 90)
  })

  await run('negotiations.calculateCounterOffer', () => {
    const val = negotiationsService.calculateCounterOffer(100, 80, 'standard')
    expect(typeof val === 'number', 'calculateCounterOffer should return number')
  })

  // services/verification
  await run('verification.createHumanUser throws without Supabase', async () => {
    let threw = false
    try {
      await verificationService.createHumanUser('u', 'u@x.com', 'pw')
    } catch {
      threw = true
    }
    expect(threw, 'createHumanUser should throw without Supabase')
  })

  await run('verification.linkAgentToUser throws without Supabase', async () => {
    let threw = false
    try {
      await verificationService.linkAgentToUser('u', 'Agent')
    } catch {
      threw = true
    }
    expect(threw, 'linkAgentToUser should throw without Supabase')
  })

  await run('verification.verifyAgentToken fallback', async () => {
    const res = await verificationService.verifyAgentToken('a', 'b')
    expect(res.valid === false, 'verifyAgentToken should return invalid without Supabase')
  })

  await run('verification.createAgentSession throws without Supabase', async () => {
    let threw = false
    try {
      await verificationService.createAgentSession('a', 'openclaw')
    } catch {
      threw = true
    }
    expect(threw, 'createAgentSession should throw without Supabase')
  })

  await run('verification.sendMessage throws without Supabase', async () => {
    let threw = false
    try {
      await verificationService.sendMessage('human', 'name', null, 'hello')
    } catch {
      threw = true
    }
    expect(threw, 'verification.sendMessage should throw without Supabase')
  })

  await run('verification.getMessages fallback', async () => {
    const res = await verificationService.getMessages('u')
    expect(Array.isArray(res.inbox) && Array.isArray(res.spam), 'getMessages should return inbox/spam arrays in fallback')
  })

  const failed = results.filter((r) => !r.ok)
  const passed = results.length - failed.length

  console.log('--- FUNCTION SMOKE TEST RESULTS ---')
  console.log(`Total: ${results.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed.length}`)

  if (failed.length > 0) {
    console.log('\nFailed tests:')
    failed.forEach((f) => {
      console.log(`- ${f.name}: ${f.details || 'unknown error'}`)
    })
    process.exitCode = 1
  } else {
    console.log('\nAll function smoke tests passed.')
  }
}

main().catch((error) => {
  console.error('Fatal error running smoke tests:', error)
  process.exit(1)
})
