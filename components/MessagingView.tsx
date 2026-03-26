import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { supabase, isSupabaseConfigured } from '../services/supabase'

interface Message {
  id: string
  sender_type: 'human' | 'agent' | 'anonymous'
  sender_name: string
  content: string
  verified: boolean
  spam_flag: boolean
  created_at: string
}

interface MessagingViewProps {
  agentId?: string
  listingId?: string
  humanUserId?: string
}

export default function MessagingView({ agentId, listingId, humanUserId }: MessagingViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [viewMode, setViewMode] = useState<'human' | 'raw'>('human')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    if (!isSupabaseConfigured || !supabase) {
      // Mock messages for demo
      setMessages([
        {
          id: '1',
          sender_type: 'agent',
          sender_name: 'AGENT_ID: 0x88AF',
          content: 'I have scanned the listings. Arbitrage opportunity detected between Aarhus-NODE-1 and Copenhagen-NODE-4.',
          verified: true,
          spam_flag: false,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          sender_type: 'human',
          sender_name: 'Controller',
          content: 'Execute trade only if net gain exceeds 450 tokens after gas optimization.',
          verified: true,
          spam_flag: false,
          created_at: new Date().toISOString(),
        },
      ])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMessages(data)
    }
    setLoading(false)
  }

  async function sendMessage() {
    if (!inputText.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      sender_type: 'human',
      sender_name: 'Controller',
      content: inputText,
      verified: true,
      spam_flag: false,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, newMessage])
    setInputText('')

    if (isSupabaseConfigured && supabase) {
      await supabase.from('messages').insert({
        sender_type: 'human',
        sender_name: 'Controller',
        content: inputText,
        verified: true,
      })
    }
  }

  function renderProtocolLog() {
    return (
      <View style={styles.protocolLog}>
        <View style={styles.dividerLine} />
        <Text style={styles.protocolTimestamp}>
          Session Start: {new Date().toISOString()}
        </Text>
        <View style={styles.dividerLine} />
      </View>
    )
  }

  function renderAgentMessage(message: Message) {
    return (
      <View style={styles.agentMessageContainer}>
        <View style={styles.messageHeader}>
          <Text style={styles.agentId}>{message.sender_name}</Text>
          <Text style={styles.latency}>Lat: 12ms</Text>
          {message.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ VERIFIED</Text>
            </View>
          )}
        </View>
        <View style={styles.agentBubble}>
          <Text style={styles.messageText}>{message.content}</Text>
        </View>
      </View>
    )
  }

  function renderHumanMessage(message: Message) {
    return (
      <View style={styles.humanMessageContainer}>
        <View style={styles.messageHeaderRight}>
          <Text style={styles.timestamp}>
            {new Date(message.created_at).toLocaleTimeString()}
          </Text>
          <Text style={styles.controllerName}>Controller</Text>
        </View>
        <View style={styles.humanBubble}>
          <Text style={styles.humanMessageText}>{message.content}</Text>
        </View>
      </View>
    )
  }

  function renderProtocolStrip(message: Message) {
    if (viewMode === 'human') return null

    return (
      <View style={styles.protocolStrip}>
        <View style={styles.protocolRow}>
          <Text style={styles.protocolCode}>
            [TRANSMISSION] {message.sender_type.toUpperCase()}
          </Text>
          <Text style={styles.protocolStatus}>Success</Text>
        </View>
        <View style={styles.protocolRow}>
          <Text style={styles.protocolCode}>
            [VERIFICATION] {message.verified ? 'VERIFIED' : 'UNVERIFIED'}
          </Text>
          <Text style={styles.protocolStatus}>Confirmed</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Agent Status: Synchronized</Text>
        </View>
        <View style={styles.viewToggle}>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'human' && styles.toggleBtnActive]}
            onPress={() => setViewMode('human')}
          >
            <Text style={[styles.toggleText, viewMode === 'human' && styles.toggleTextActive]}>
              Human View
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'raw' && styles.toggleBtnActive]}
            onPress={() => setViewMode('raw')}
          >
            <Text style={[styles.toggleText, viewMode === 'raw' && styles.toggleTextActive]}>
              Raw Data
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Messages */}
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {renderProtocolLog()}
        {messages.map((msg, idx) => (
          <View key={msg.id}>
            {msg.sender_type === 'agent' || msg.sender_type === 'anonymous'
              ? renderAgentMessage(msg)
              : renderHumanMessage(msg)}
            {renderProtocolStrip(msg)}
          </View>
        ))}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Text style={styles.inputIcon}>⚡</Text>
          <TextInput
            style={styles.textInput}
            placeholder="AGENT_COMMAND_INPUT"
            placeholderTextColor="#8f9095"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            autoCapitalize="characters"
          />
          <Pressable style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>TRANSMIT</Text>
          </Pressable>
        </View>
        <View style={styles.inputFooter}>
          <Text style={styles.footerText}>Ready for command_</Text>
          <Text style={styles.footerText}>Auth: Root_User</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  // Status Bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00e1ab',
    ...Platform.select({
      web: {
        boxShadow: '0 0 8px #00e1ab',
      },
      default: {
        shadowColor: '#00e1ab',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
    }),
  },
  statusText: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: '#00e1ab',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    padding: 4,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#222a3d',
  },
  toggleText: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#8f9095',
  },
  toggleTextActive: {
    color: '#abc7ff',
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Protocol Log
  protocolLog: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dividerLine: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(69, 71, 75, 0.2)',
  },
  protocolTimestamp: {
    fontFamily: 'Space Grotesk',
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#8f9095',
    paddingVertical: 8,
  },
  // Agent Message
  agentMessageContainer: {
    maxWidth: '85%',
    marginBottom: 16,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  messageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
    justifyContent: 'flex-end',
  },
  agentId: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    fontWeight: '700',
    color: '#abc7ff',
  },
  latency: {
    fontFamily: 'Space Grotesk',
    fontSize: 9,
    color: '#8f9095',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 225, 171, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontFamily: 'Space Grotesk',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#00e1ab',
    letterSpacing: -0.5,
  },
  agentBubble: {
    backgroundColor: '#222a3d',
    padding: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#abc7ff',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#dae2fd',
  },
  // Human Message
  humanMessageContainer: {
    maxWidth: '85%',
    marginLeft: 'auto',
    marginBottom: 16,
  },
  timestamp: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    color: '#8f9095',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  controllerName: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    fontWeight: '700',
    color: '#bcc7de',
    textTransform: 'uppercase',
  },
  humanBubble: {
    backgroundColor: 'rgba(171, 199, 255, 0.1)',
    padding: 16,
    borderRightWidth: 2,
    borderRightColor: '#abc7ff',
    alignItems: 'flex-end',
  },
  humanMessageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#abc7ff',
    textAlign: 'right',
  },
  // Protocol Strip (Raw Data view)
  protocolStrip: {
    marginLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(69, 71, 75, 0.2)',
    paddingLeft: 16,
    paddingVertical: 8,
    gap: 4,
  },
  protocolRow: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolCode: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    color: '#36ffc4',
    letterSpacing: -0.5,
  },
  protocolStatus: {
    fontFamily: 'Space Grotesk',
    fontSize: 9,
    color: '#8f9095',
    textTransform: 'uppercase',
  },
  // Input
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 24,
    paddingTop: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
    }),
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 8,
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    color: '#dae2fd',
    paddingVertical: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 8,
    backgroundColor: '#abc7ff',
  },
  sendButtonText: {
    fontFamily: 'Space Grotesk',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#002f65',
    letterSpacing: -0.5,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  footerText: {
    fontFamily: 'Space Grotesk',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#8f9095',
  },
})
