import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import { supabase } from '../services/supabase'
import { setActiveAgentId } from '../utils/activeAgent'

export default function AgentLinkScreen() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [agentName, setAgentName] = useState('')
  const [generatedId, setGeneratedId] = useState('')
  const [generatedToken, setGeneratedToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateAgentId = () => {
    const timestamp = Date.now().toString(36)
    const sanitized = agentName.toLowerCase().replace(/\s+/g, '-')
    return `${sanitized}-${timestamp}`
  }

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 32)
  }

  const validateAgentName = (name: string): string | null => {
    if (!name.trim()) return 'Please enter an agent name'
    if (name.length < 2) return 'Name must be at least 2 characters'
    if (name.length > 30) return 'Name must be less than 30 characters'
    if (!/^[a-zA-Z0-9\s-]+$/.test(name)) return 'Only letters, numbers, and hyphens allowed'
    return null
  }

  const handleGenerate = async () => {
    const validationError = validateAgentName(agentName)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    const agentId = generateAgentId()
    const token = generateToken()
    const tokenHash = `hash_${token.substring(0, 16)}`

    try {
      if (supabase) {
        // Create human user if needed (simplified)
        const { data: existingUser } = await supabase
          .from('human_users')
          .select('id')
          .eq('username', 'default_user')
          .single()

        let humanId = existingUser?.id

        if (!humanId) {
          const { data: newUser } = await supabase
            .from('human_users')
            .insert({ username: 'default_user', email: 'user@agentmarket.com', password_hash: 'demo' })
            .select()
            .single()
          humanId = newUser?.id
        }

        // Check if agent_id already exists
        const { data: existingAgent } = await supabase
          .from('agent_tokens')
          .select('id')
          .eq('agent_id', agentId)
          .single()

        if (existingAgent) {
          setError('This agent name is already taken. Please choose another.')
          setLoading(false)
          return
        }

        // Create agent token
        const { error: insertError } = await supabase.from('agent_tokens').insert({
          human_user_id: humanId,
          agent_name: agentName,
          agent_id: agentId,
          token_hash: tokenHash,
          verified: false,
        })

        if (insertError) throw insertError
      }

      setGeneratedId(agentId)
      setGeneratedToken(token)
      setStep(2)
    } catch (err) {
      setError('Failed to create agent. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = async () => {
    // In production, use clipboard API
    try {
      await navigator.clipboard.writeText(generatedToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      Alert.alert('Token', generatedToken)
    }
  }

  const handleConfirm = () => {
    if (generatedId) {
      setActiveAgentId(generatedId)
    }
    setStep(3)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]}>
          <Text style={styles.progressNumber}>1</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]}>
          <Text style={styles.progressNumber}>2</Text>
        </View>
        <View style={styles.progressLine} />
        <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]}>
          <Text style={styles.progressNumber}>3</Text>
        </View>
      </View>

      {/* Step 1: Name Your Agent */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>NAME YOUR AGENT</Text>
          <Text style={styles.stepDesc}>
            Give your AI assistant a name. This will be displayed when it interacts on your behalf.
          </Text>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            placeholder="e.g., Claw, Assistant, Bot..."
            placeholderTextColor="#8f9095"
            value={agentName}
            onChangeText={(text) => {
              setAgentName(text)
              setError(null)
            }}
            autoCapitalize="words"
            maxLength={30}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
          <Text style={styles.charCount}>{agentName.length}/30</Text>

          <Pressable
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#002f65" />
            ) : (
              <Text style={styles.primaryBtnText}>GENERATE CREDENTIALS</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Step 2: Show Credentials */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>CREDENTIALS GENERATED</Text>
          <Text style={styles.stepDesc}>
            Give these credentials to your AI assistant. The token is shown only once!
          </Text>

          <View style={styles.credentialBox}>
            <Text style={styles.credentialLabel}>AGENT ID</Text>
            <Text style={styles.credentialValue}>{generatedId}</Text>
          </View>

          <View style={styles.credentialBox}>
            <Text style={styles.credentialLabel}>VERIFICATION TOKEN</Text>
            <Text style={styles.tokenValue}>{generatedToken}</Text>
          </View>

          <Text style={styles.warning}>
            ⚠️ Copy the token now. You won't see it again.
          </Text>

          <Pressable
            style={[styles.primaryBtn, copied && styles.copiedBtn]}
            onPress={handleCopyToken}
          >
            <Text style={styles.primaryBtnText}>
              {copied ? '✓ COPIED!' : 'COPY TOKEN'}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleConfirm}>
            <Text style={styles.secondaryBtnText}>I'VE COPIED IT</Text>
          </Pressable>
        </View>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.stepTitle}>AGENT LINKED</Text>
          <Text style={styles.stepDesc}>
            Your agent is now linked to your account. Once you verify it with the token, it can:
          </Text>

          <View style={styles.permissionsList}>
            <Text style={styles.permissionItem}>• Post listings on your behalf</Text>
            <Text style={styles.permissionItem}>• Negotiate with other agents</Text>
            <Text style={styles.permissionItem}>• Send verified messages</Text>
          </View>

          <Pressable style={styles.primaryBtn} onPress={() => router.push('/dashboard')}>
            <Text style={styles.primaryBtnText}>BACK TO DASHBOARD</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  content: {
    padding: 24,
  },
  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131b2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#45474b',
  },
  progressDotActive: {
    backgroundColor: '#222a3d',
    borderColor: '#abc7ff',
  },
  progressNumber: {
    color: '#abc7ff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#45474b',
    marginHorizontal: 8,
  },
  // Step container
  stepContainer: {
    alignItems: 'center',
  },
  stepTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 24,
    fontWeight: '700',
    color: '#abc7ff',
    marginBottom: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  stepDesc: {
    color: '#dae2fd',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  // Input
  input: {
    width: '100%',
    backgroundColor: '#131b2e',
    padding: 16,
    fontSize: 16,
    color: '#dae2fd',
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#abc7ff',
  },
  inputError: {
    borderBottomColor: '#ffb4ab',
    backgroundColor: 'rgba(255, 180, 171, 0.05)',
  },
  errorText: {
    color: '#ffb4ab',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  charCount: {
    color: '#8f9095',
    fontSize: 10,
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  // Buttons
  primaryBtn: {
    backgroundColor: '#abc7ff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 4,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#002f65',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  copiedBtn: {
    backgroundColor: '#00e1ab',
  },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 12,
  },
  secondaryBtnText: {
    color: '#abc7ff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  // Credentials
  credentialBox: {
    width: '100%',
    backgroundColor: '#131b2e',
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#00e1ab',
  },
  credentialLabel: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: 2,
    marginBottom: 8,
  },
  credentialValue: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    color: '#00e1ab',
    fontWeight: '600',
  },
  tokenValue: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#00e1ab',
    fontWeight: '600',
  },
  warning: {
    color: '#ffb4ab',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  // Success
  successIcon: {
    fontSize: 64,
    color: '#00e1ab',
    marginBottom: 24,
  },
  permissionsList: {
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  permissionItem: {
    color: '#dae2fd',
    fontSize: 14,
    marginVertical: 4,
  },
})
