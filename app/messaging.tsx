import React, { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../services/supabase'

interface Message {
  id: string
  sender_type: 'human' | 'agent'
  sender_name: string
  content: string
  created_at: string
  spam_flag: boolean
}

export default function MessagingScreen() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [inputText, setInputText] = useState('')
  const [showSpam, setShowSpam] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null)
  // Always show left conversation list to avoid overlapping messages

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    setLoading(true)
    try {
      if (!supabase) {
        // Mock data
        setMessages([
          { id: '1', sender_type: 'agent', sender_name: 'Claw', content: 'Hej! Jeg fandt en GPU til dig.', created_at: new Date().toISOString(), spam_flag: false },
          { id: '2', sender_type: 'human', sender_name: 'Rasmus', content: 'Perfekt, hvilken model?', created_at: new Date().toISOString(), spam_flag: false },
          { id: '3', sender_type: 'agent', sender_name: 'Claw', content: 'RTX 4070 Ti - kr 4.200 i Aarhus', created_at: new Date().toISOString(), spam_flag: false },
          { id: '4', sender_type: 'agent', sender_name: 'UnknownBot', content: 'BUY NOW CLICK HERE', created_at: new Date().toISOString(), spam_flag: true },
        ])
        return
      }

      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })

      setMessages(data || [])
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || sending) return

    setSending(true)
    try {
      if (supabase) {
        await supabase.from('messages').insert({
          sender_type: 'human',
          sender_name: 'Rasmus',
          content: inputText.trim(),
          spam_flag: false,
        })
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender_type: 'human',
        sender_name: 'Rasmus',
        content: inputText.trim(),
        created_at: new Date().toISOString(),
        spam_flag: false,
      }])

      setInputText('')
    } catch (err) {
      console.error('Error sending message:', err)
    } finally {
      setSending(false)
    }
  }

  const visibleMessages = showSpam ? messages.filter(m => m.spam_flag) : messages.filter(m => !m.spam_flag)

  // derive conversation participants (other users)
  const participants = Array.from(new Set(visibleMessages.map(m => m.sender_name).filter(n => n && n !== 'Rasmus')))

  // Default select first participant when available
  useEffect(() => {
    if (!selectedParticipant) {
      setSelectedParticipant(participants[0] || null)
    } else if (selectedParticipant && !participants.includes(selectedParticipant)) {
      // selected participant removed (e.g., spam filter) -> clear or pick first
      setSelectedParticipant(participants[0] || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMessages])

  const filteredMessages = selectedParticipant
    ? visibleMessages.filter(m => m.sender_name === selectedParticipant || m.sender_name === 'Rasmus')
    : visibleMessages

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>MESSAGES</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Claw Online</Text>
          </View>
        </View>
        <Pressable
          style={[styles.spamToggle, showSpam && styles.spamToggleActive]}
          onPress={() => setShowSpam(!showSpam)}
        >
          <Text style={[styles.spamToggleText, showSpam && styles.spamToggleTextActive]}>
            🚫
          </Text>
          {messages.filter(m => m.spam_flag).length > 0 && (
            <View style={styles.spamBadge}>
              <Text style={styles.spamBadgeText}>
                {messages.filter(m => m.spam_flag).length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Two-column layout: conversations list + messages */}
      <View style={styles.twoPane}>
        {/* Left: conversations */}
        <View style={styles.leftPane}>
          <FlatList
            data={participants}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const last = visibleMessages.slice().reverse().find(m => m.sender_name === item)
              return (
                <Pressable
                  style={[styles.convItem, selectedParticipant === item && styles.convItemActive]}
                  onPress={() => setSelectedParticipant(item)}
                >
                  <View style={styles.convAvatar}>
                    <Text style={styles.convAvatarText}>{item[0] || '?'}</Text>
                  </View>
                  <View style={styles.convMeta}>
                    <Text style={styles.convName}>{item}</Text>
                    <Text style={styles.convPreview}>{last?.content || ''}</Text>
                  </View>
                  <View style={styles.convRight}>
                    <Text style={styles.convTime}>
                      {last ? new Date(last.created_at).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </Pressable>
              )
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No conversations</Text>}
          />
        </View>

        {/* Right: messages for selected conversation */}
        <View style={styles.rightPane}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#abc7ff" />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMessages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.messageBubble,
                    item.sender_type === 'human' ? styles.humanBubble : styles.agentBubble,
                  ]}
                >
                  <Text style={styles.senderName}>{item.sender_name}</Text>
                  <Text style={styles.messageContent}>{item.content}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString('da-DK', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              contentContainerStyle={styles.messagesList}
              inverted={false}
            />
          )}
        </View>
      </View>

      {/* Empty State */}
      {!loading && filteredMessages.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{showSpam ? '✨' : '💬'}</Text>
          <Text style={styles.emptyText}>
            {showSpam ? 'No spam!' : 'No messages yet'}
          </Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={showSpam ? "Can't reply to spam" : "Type a message..."}
          placeholderTextColor="#8f9095"
          editable={!showSpam}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, (!inputText.trim() || showSpam) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending || showSpam}
        >
          <Text style={styles.sendBtnText}>{sending ? '...' : '→'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1326',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#0d1117',
    borderBottomWidth: 2,
    borderBottomColor: '#222a3d',
  },
  backBtn: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#abc7ff',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#8f9095',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00e1ab',
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#00e1ab',
  },
  spamToggle: {
    padding: 8,
    position: 'relative',
  },
  spamToggleActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 4,
  },
  spamToggleText: {
    fontSize: 20,
    opacity: 0.5,
  },
  spamToggleTextActive: {
    opacity: 1,
  },
  twoPane: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: '#151827',
    backgroundColor: '#071029',
    padding: 8,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  convItemActive: {
    backgroundColor: '#0f1a2b',
  },
  convAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#abc7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  convAvatarText: {
    color: '#002f65',
    fontWeight: '700',
  },
  convMeta: {
    flex: 1,
  },
  convName: {
    color: '#dae2fd',
    fontWeight: '700',
  },
  convPreview: {
    color: '#8f9095',
    fontSize: 12,
  },
  convRight: {
    marginLeft: 8,
    alignItems: 'flex-end',
  },
  convTime: {
    color: '#8f9095',
    fontSize: 11,
  },
  rightPane: {
    flex: 1,
    position: 'relative',
  },
  menuBtn: {
    padding: 8,
    marginRight: 8,
  },
  spamBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  spamBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#abc7ff',
    marginTop: 12,
    fontSize: 12,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 80,
  },
  messageBubble: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#131b2e',
    borderLeftWidth: 2,
    borderLeftColor: '#abc7ff',
  },
  humanBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a2847',
  },
  senderName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#abc7ff',
    letterSpacing: 1,
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 14,
    color: '#dae2fd',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    color: '#8f9095',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#8f9095',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#0d1117',
    borderTopWidth: 2,
    borderTopColor: '#222a3d',
  },
  input: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#dae2fd',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#abc7ff',
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#222a3d',
  },
  sendBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#002f65',
  },
})
