import * as helpers from '../utils/helpers.ts'
import * as validation from '../constants/validation.ts'
import * as agentConfig from '../constants/agentConfig.ts'
import * as api from '../services/api.ts'
import * as listingsService from '../services/listings.ts'
import * as agentsService from '../services/agents.ts'
import * as negotiationsService from '../services/negotiations.ts'
import * as negotiator from '../services/agentNegotiator.ts'
import * as verificationService from '../services/verification.ts'

const results = []

function record(name, ok, details) {
  results.push({ name, ok, details })
}

async function run(name, fn) {
  try {
    await fn()
    record(name, true)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    record(name, false, message)
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

const listingJsonLd = {
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
}

await run('helpers.formatPrice', () => expect(helpers.formatPrice(1234).includes('DKK'), 'currency missing'))
await run('helpers.formatDistance', () => expect(typeof helpers.formatDistance(0.4) === 'string', 'not string'))
await run('helpers.formatRelativeTime', () => expect(typeof helpers.formatRelativeTime(new Date()) === 'string', 'not string'))
await run('helpers.formatCondition', () => expect(typeof helpers.formatCondition(0.8) === 'string', 'not string'))
await run('helpers.getConditionColor', () => expect(helpers.getConditionColor(0.8).startsWith('#'), 'not color'))
await run('helpers.truncate', () => expect(typeof helpers.truncate('abcdef', 3) === 'string', 'not string'))
await run('helpers.generateId', () => expect(helpers.generateId().length > 0, 'empty id'))
await run('helpers.isValidEmail', () => expect(helpers.isValidEmail('a@b.com') === true, 'invalid email check'))
await run('helpers.debounce', () => expect(typeof helpers.debounce(() => 1, 10) === 'function', 'not function'))
await run('helpers.sleep', async () => { await helpers.sleep(1) })
await run('helpers.isWeb', () => expect(typeof helpers.isWeb() === 'boolean', 'not boolean'))
await run('helpers.formatDate', () => expect(typeof helpers.formatDate(new Date()) === 'string', 'not string'))
await run('helpers.formatTime', () => expect(typeof helpers.formatTime(new Date()) === 'string', 'not string'))
await run('helpers.calculateNegotiatedPrice', () => expect(typeof helpers.calculateNegotiatedPrice(100, 0.1) === 'number', 'not number'))
await run('helpers.parseQueryParams', () => { const p = helpers.parseQueryParams('https://x?a=1&b=2'); expect(p.a === '1' && p.b === '2', 'bad parse') })
await run('helpers.slugify', () => expect(helpers.slugify('Hello World') === 'hello-world', 'bad slug'))

await run('validation.validateListingTitle', () => expect(validation.validateListingTitle('valid title') === null, 'should pass'))
await run('validation.validateListingPrice', () => expect(validation.validateListingPrice('100') === null, 'should pass'))
await run('validation.validateAgentName', () => expect(validation.validateAgentName('Claw') === null, 'should pass'))
await run('validation.validateAgentId', () => expect(validation.validateAgentId('claw-001') === null, 'should pass'))
await run('validation.validateEmail', () => expect(validation.validateEmail('test@example.com') === null, 'should pass'))

await run('agentConfig.parseAgentCommand', () => { const p = agentConfig.parseAgentCommand('find gpu'); expect(typeof p.action === 'string', 'no action') })
await run('agentConfig.formatAgentResponse', () => expect(typeof agentConfig.formatAgentResponse('search', { found: 1 }) === 'string', 'not string'))
await run('agentConfig.getAgentContext', () => { const c = agentConfig.getAgentContext(); expect(typeof c === 'object' && c !== null, 'bad context') })

await run('agentNegotiator.evaluateDeal', () => { const r = negotiator.evaluateDeal(listingJsonLd, 90); expect(typeof r.recommendation === 'string', 'bad rec') })
await run('agentNegotiator.simulateNegotiation', () => { const l = negotiator.simulateNegotiation(listingJsonLd); expect(Array.isArray(l), 'not array') })

let firstListingId = ''
await run('listings.getListings', async () => { const data = await listingsService.getListings({ maxDistance: 50 }); expect(Array.isArray(data) && data.length > 0, 'empty'); firstListingId = data[0].id })
await run('listings.getListing', async () => { const i = await listingsService.getListing(firstListingId); expect(!!i, 'not found') })

await run('listings.createListing throws', async () => { let threw = false; try { await listingsService.createListing({ title: 'Local Test Listing', description: 'd', price: 1, condition_rating: 0.5, distance_km: 1, specifications: {}, negotiation_logic: 'standard', status: 'active', seller_id: 's' }) } catch { threw = true } expect(threw, 'should throw') })
await run('listings.updateListing throws', async () => { let threw = false; try { await listingsService.updateListing(firstListingId, { title: 'x' }) } catch { threw = true } expect(threw, 'should throw') })
await run('listings.deleteListing throws', async () => { let threw = false; try { await listingsService.deleteListing(firstListingId) } catch { threw = true } expect(threw, 'should throw') })

let createdId = ''
await run('api.getListingsAPI', async () => { const r = await api.getListingsAPI({ limit: 5 }); expect(r.success && Array.isArray(r.data), 'failed') })
await run('api.createListingAPI', async () => { const r = await api.createListingAPI({ title: 'Smoke Listing 12345', price: 99, distance_km: 3, condition_rating: 0.7 }); expect(r.success && !!r.data?.id, 'failed'); createdId = r.data.id })
await run('api.getListingAPI', async () => { const r = await api.getListingAPI(createdId); expect(r.success && r.data?.id === createdId, 'failed') })
await run('api.updateListingAPI', async () => { const r = await api.updateListingAPI(createdId, { title: 'Updated' }); expect(r.success, 'failed') })
await run('api.deleteListingAPI', async () => { const r = await api.deleteListingAPI(createdId); expect(r.success, 'failed') })

const expectFail = async (name, fn) => run(name, async () => { const r = await fn(); expect(!r.success, 'expected graceful fail') })
await expectFail('api.createAgentAPI fallback', () => api.createAgentAPI({ agent_name: 'a', agent_id: 'b' }))
await expectFail('api.getAgentAPI fallback', () => api.getAgentAPI('x'))
await expectFail('api.linkAgentAPI fallback', () => api.linkAgentAPI({ agent_id: 'x', human_user_id: 'y' }))
await expectFail('api.getAgentsAPI fallback', () => api.getAgentsAPI('u'))
await expectFail('api.sendMessageAPI fallback', () => api.sendMessageAPI({ content: 'hello' }))
await expectFail('api.getMessagesAPI fallback', () => api.getMessagesAPI({ limit: 5 }))
await expectFail('api.markMessageSpamAPI fallback', () => api.markMessageSpamAPI('x', true))
await expectFail('api.createNegotiationAPI fallback', () => api.createNegotiationAPI({ listing_id: 'x', offer_price: 1 }))
await expectFail('api.getNegotiationsAPI fallback', () => api.getNegotiationsAPI('x'))
await expectFail('api.updateNegotiationAPI fallback', () => api.updateNegotiationAPI('x', { status: 'accepted' }))
await expectFail('api.createUserAPI fallback', () => api.createUserAPI({ username: 'u', email: 'u@x.com', password_hash: 'h' }))
await expectFail('api.getUserAPI fallback', () => api.getUserAPI('x'))
await run('api.processAgentCommand', async () => { const r = await api.processAgentCommand('find gpu'); expect(r.success && r.data?.action === 'search', 'failed') })

await run('agents.getAgentProfile', async () => { const p = await agentsService.getAgentProfile('default-agent'); expect(!!p?.agent_id, 'failed') })
await run('agents.upsertAgentProfile throws', async () => { let threw = false; try { await agentsService.upsertAgentProfile({ agent_id: 'a' }) } catch { threw = true } expect(threw, 'should throw') })
await run('agents.verifyAgent throws', async () => { let threw = false; try { await agentsService.verifyAgent('a') } catch { threw = true } expect(threw, 'should throw') })
await run('agents.updateReputation throws', async () => { let threw = false; try { await agentsService.updateReputation('a', 0.8) } catch { threw = true } expect(threw, 'should throw') })
await run('agents.getVerifiedAgents fallback', async () => { const data = await agentsService.getVerifiedAgents(); expect(Array.isArray(data), 'failed') })

await run('negotiations.startNegotiation', async () => { const s = await negotiationsService.startNegotiation('l', 'b', 's'); expect(s.status === 'active', 'failed') })
await run('negotiations.addNegotiationMessage fallback', async () => { const m = await negotiationsService.addNegotiationMessage('l', 'b', 's', 'buyer', 'hello'); expect(!!m.id, 'failed') })
await run('negotiations.getNegotiationMessages fallback', async () => { const msgs = await negotiationsService.getNegotiationMessages('l'); expect(Array.isArray(msgs), 'failed') })
await run('negotiations.runSimulatedNegotiation', () => { const log = negotiationsService.runSimulatedNegotiation(listingJsonLd); expect(Array.isArray(log), 'failed') })
await run('negotiations.completeNegotiation', async () => { await negotiationsService.completeNegotiation('l', 'accepted', 90) })
await run('negotiations.calculateCounterOffer', () => { const val = negotiationsService.calculateCounterOffer(100, 80, 'standard'); expect(typeof val === 'number', 'failed') })

await run('verification.createHumanUser throws', async () => { let threw = false; try { await verificationService.createHumanUser('u', 'u@x.com', 'pw') } catch { threw = true } expect(threw, 'should throw') })
await run('verification.linkAgentToUser throws', async () => { let threw = false; try { await verificationService.linkAgentToUser('u', 'Agent') } catch { threw = true } expect(threw, 'should throw') })
await run('verification.verifyAgentToken fallback', async () => { const r = await verificationService.verifyAgentToken('a', 'b'); expect(r.valid === false, 'failed') })
await run('verification.createAgentSession throws', async () => { let threw = false; try { await verificationService.createAgentSession('a', 'openclaw') } catch { threw = true } expect(threw, 'should throw') })
await run('verification.sendMessage throws', async () => { let threw = false; try { await verificationService.sendMessage('human', 'name', null, 'hello') } catch { threw = true } expect(threw, 'should throw') })
await run('verification.getMessages fallback', async () => { const r = await verificationService.getMessages('u'); expect(Array.isArray(r.inbox) && Array.isArray(r.spam), 'failed') })

const failed = results.filter((r) => !r.ok)
const passed = results.length - failed.length
console.log('--- FUNCTION SMOKE TEST RESULTS ---')
console.log(`Total: ${results.length}`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed.length}`)
if (failed.length > 0) {
  console.log('\nFailed tests:')
  for (const f of failed) {
    console.log(`- ${f.name}: ${f.details || 'unknown error'}`)
  }
  process.exitCode = 1
} else {
  console.log('\nAll function smoke tests passed.')
}
