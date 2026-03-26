import { Platform } from 'react-native'

const ACTIVE_AGENT_STORAGE_KEY = 'agentmarket.active-agent-id'
const FALLBACK_AGENT_ID = 'OPERATOR_01'

function canUseStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage
}

export function getActiveAgentId() {
  if (canUseStorage()) {
    try {
      const stored = window.localStorage.getItem(ACTIVE_AGENT_STORAGE_KEY)
      if (stored?.trim()) {
        return stored.trim()
      }
    } catch {
      // Ignore storage issues in constrained environments.
    }
  }

  return FALLBACK_AGENT_ID
}

export function setActiveAgentId(agentId: string) {
  const normalized = agentId.trim()
  if (!normalized || !canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(ACTIVE_AGENT_STORAGE_KEY, normalized)
  } catch {
    // Ignore storage issues in constrained environments.
  }
}
