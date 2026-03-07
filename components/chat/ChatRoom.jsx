'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendMessageAction } from '@/actions/messages'
import { encodeMessage, decodeMessage } from '@/lib/encoder'
import { formatTime } from '@/lib/utils'
import { ArrowLeft, Send, Eye, EyeOff, Users, Languages, Lock } from 'lucide-react'
import { toast } from 'sonner'

export default function ChatRoom({ initialData, conversationId }) {
  const router = useRouter()
  const { conversation, currentUserId } = initialData
  const rules = conversation.language.rules ?? []

  const [messages, setMessages] = useState(initialData.messages)
  const [participants] = useState(initialData.participants)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showParticipants, setShowParticipants] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const supabase = createClient()

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Subscribe to real-time new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new
        // Avoid duplicates from our own optimistic sends
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev
          // Fetch sender username
          supabase
            .from('profiles')
            .select('username')
            .eq('id', newMsg.sender_id)
            .single()
            .then(({ data }) => {
              setMessages(prev2 => prev2.map(m =>
                m.id === newMsg.id ? { ...m, sender_username: data?.username ?? 'Unknown' } : m
              ))
            })
          return [...prev, {
            id: newMsg.id,
            sender_id: newMsg.sender_id,
            sender_username: '…',
            encoded_content: newMsg.encoded_content,
            original_content: newMsg.original_content,
            created_at: newMsg.created_at,
          }]
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [conversationId, supabase])

  function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isPending) return

    const encoded = encodeMessage(text, rules)

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      sender_id: currentUserId,
      sender_username: 'You',
      encoded_content: encoded,
      original_content: text,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }])
    setInput('')

    startTransition(async () => {
      const result = await sendMessageAction({
        conversationId,
        originalContent: text,
        encodedContent: encoded,
      })
      if (result.error) {
        toast.error(result.error)
        // Remove optimistic message on failure
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setInput(text)
      } else {
        // Replace optimistic with real
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, id: result.message.id, isOptimistic: false } : m
        ))
      }
    })

    inputRef.current?.focus()
  }

  const preview = input.trim() ? encodeMessage(input, rules) : null

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Chat header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'hsl(222 47% 5% / 0.9)', borderColor: 'hsl(215 25% 14%)', backdropFilter: 'blur(16px)' }}>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: 'hsl(215 20% 55%)' }}>
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate" style={{ color: 'hsl(210 40% 95%)' }}>
            {conversation.name}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Languages className="w-3 h-3" style={{ color: 'hsl(185 100% 50%)' }} />
            <span className="text-xs" style={{ color: 'hsl(185 100% 60%)' }}>
              {conversation.language.name}
            </span>
            <span style={{ color: 'hsl(215 20% 30%)' }}>·</span>
            <Lock className="w-3 h-3" style={{ color: 'hsl(215 20% 45%)' }} />
            <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowParticipants(v => !v)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
          style={{ color: showParticipants ? 'hsl(185 100% 50%)' : 'hsl(215 20% 55%)' }}>
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* Participants panel */}
      {showParticipants && (
        <div className="flex-shrink-0 px-4 py-2 border-b flex gap-2 flex-wrap"
          style={{ background: 'hsl(222 40% 7%)', borderColor: 'hsl(215 25% 12%)' }}>
          {participants.map(p => (
            <span key={p.user_id} className="text-xs px-2 py-1 rounded-full"
              style={{
                background: p.user_id === currentUserId ? 'hsl(185 100% 50% / 0.15)' : 'hsl(215 25% 14%)',
                color: p.user_id === currentUserId ? 'hsl(185 100% 60%)' : 'hsl(215 20% 55%)',
                border: `1px solid ${p.user_id === currentUserId ? 'hsl(185 100% 50% / 0.3)' : 'hsl(215 25% 20%)'}`,
              }}>
              {p.username}{p.user_id === currentUserId ? ' (you)' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="encoded-text text-2xl mb-2 opacity-30">S3cr3t M3ss4g3s</div>
              <p className="text-sm" style={{ color: 'hsl(215 20% 35%)' }}>No messages yet. Say something secret!</p>
            </div>
          </div>
        )}
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
            rules={rules}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t px-4 py-3"
        style={{ background: 'hsl(222 47% 5% / 0.9)', borderColor: 'hsl(215 25% 14%)', backdropFilter: 'blur(16px)' }}>
        {/* Encode preview */}
        {preview && preview !== input.trim() && (
          <div className="mb-2 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'hsl(185 100% 50% / 0.05)', border: '1px solid hsl(185 100% 50% / 0.1)' }}>
            <span style={{ color: 'hsl(215 20% 40%)' }}>Preview: </span>
            <span className="encoded-text">{preview}</span>
          </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            disabled={isPending}
            className="input-field flex-1"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) handleSend(e)
            }}
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="btn-primary w-10 h-10 p-0 flex items-center justify-center rounded-lg flex-shrink-0"
          >
            {isPending ? (
              <span className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn, rules }) {
  const [showOriginal, setShowOriginal] = useState(false)
  const decoded = decodeMessage(message.encoded_content, rules)

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group`}>
      {!isOwn && (
        <span className="text-xs mb-1 ml-1" style={{ color: 'hsl(215 20% 40%)' }}>
          {message.sender_username}
        </span>
      )}

      <div className={`max-w-[85%] sm:max-w-[70%] ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
        <div
          className="px-3.5 py-2.5 rounded-2xl"
          style={isOwn ? {
            background: 'linear-gradient(135deg, hsl(185 100% 40% / 0.25), hsl(185 100% 30% / 0.2))',
            border: '1px solid hsl(185 100% 50% / 0.25)',
            borderBottomRightRadius: '4px',
          } : {
            background: 'hsl(215 25% 14%)',
            border: '1px solid hsl(215 25% 20%)',
            borderBottomLeftRadius: '4px',
          }}
        >
          <p className={showOriginal ? 'decoded-text text-sm' : 'encoded-text text-sm'}>
            {showOriginal ? decoded : message.encoded_content}
          </p>
        </div>

        {/* Controls row */}
        <div className={`flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs" style={{ color: 'hsl(215 20% 35%)' }}>
            {formatTime(message.created_at)}
          </span>
          {rules.length > 0 && (
            <button
              onClick={() => setShowOriginal(v => !v)}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all"
              style={showOriginal ? {
                background: 'hsl(45 100% 50% / 0.1)',
                color: 'hsl(45 100% 65%)',
                border: '1px solid hsl(45 100% 50% / 0.2)',
              } : {
                background: 'hsl(185 100% 50% / 0.08)',
                color: 'hsl(185 100% 60%)',
                border: '1px solid hsl(185 100% 50% / 0.15)',
              }}
            >
              {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showOriginal ? 'Encode' : 'Decode'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
