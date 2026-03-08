'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendMessageAction } from '@/actions/messages'
import { deleteMessageForEveryoneAction, changeConversationLanguageAction } from '@/actions/conversations'
import { encodeMessage, decodeMessage } from '@/lib/encoder'
import { formatTime } from '@/lib/utils'
import { ArrowLeft, Send, Eye, EyeOff, Users, Languages, Lock, Trash2, X, ChevronDown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function ChatRoom({ initialData, conversationId, languages = [] }) {
  const router = useRouter()
  const { conversation, currentUserId } = initialData

  const [currentLanguage, setCurrentLanguage] = useState(conversation.language)
  const rules = currentLanguage.rules ?? []

  const [messages, setMessages] = useState(initialData.messages)
  const [participants] = useState(initialData.participants)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [showParticipants, setShowParticipants] = useState(false)
  const [showLangSwitcher, setShowLangSwitcher] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const supabase = createClient()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev
          supabase.from('profiles').select('username').eq('id', newMsg.sender_id).single()
            .then(({ data }) => {
              setMessages(prev2 => prev2.map(m =>
                m.id === newMsg.id ? { ...m, sender_username: data?.username ?? 'Unknown' } : m
              ))
            })
          return [...prev, {
            id: newMsg.id, sender_id: newMsg.sender_id, sender_username: '…',
            encoded_content: newMsg.encoded_content, original_content: newMsg.original_content,
            created_at: newMsg.created_at,
          }]
        })
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [conversationId, supabase])

  function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isPending) return
    const encoded = encodeMessage(text, rules)
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId, sender_id: currentUserId, sender_username: 'You',
      encoded_content: encoded, original_content: text,
      created_at: new Date().toISOString(), isOptimistic: true,
    }])
    setInput('')
    startTransition(async () => {
      const result = await sendMessageAction({ conversationId, originalContent: text, encodedContent: encoded })
      if (result.error) {
        toast.error(result.error)
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setInput(text)
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: result.message.id, isOptimistic: false } : m))
      }
    })
    inputRef.current?.focus()
  }

  function handleMessageDeleted(messageId) {
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  function handleLanguageChange(lang) {
    startTransition(async () => {
      const result = await changeConversationLanguageAction(conversationId, lang.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        setCurrentLanguage(lang)
        toast.success(`Language changed to ${lang.name}`)
        setShowLangSwitcher(false)
      }
    })
  }

  const preview = input.trim() ? encodeMessage(input, rules) : null

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'hsl(222 47% 5% / 0.9)', borderColor: 'hsl(215 25% 14%)', backdropFilter: 'blur(16px)' }}>
        <button onClick={() => router.push('/dashboard')}
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
            <span className="text-xs" style={{ color: 'hsl(185 100% 60%)' }}>{currentLanguage.name}</span>
            <span style={{ color: 'hsl(215 20% 30%)' }}>·</span>
            <Lock className="w-3 h-3" style={{ color: 'hsl(215 20% 45%)' }} />
            <span className="text-xs" style={{ color: 'hsl(215 20% 45%)' }}>
              {rules.length} rule{rules.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Language switcher button */}
        <div className="relative">
          <button
            onClick={() => setShowLangSwitcher(v => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: showLangSwitcher ? 'hsl(185 100% 50%)' : 'hsl(215 20% 55%)' }}
            title="Change language">
            <RefreshCw className="w-4 h-4" />
          </button>
          {showLangSwitcher && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowLangSwitcher(false)} />
              <div className="absolute right-0 top-10 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[200px]"
                style={{ background: 'hsl(222 40% 9%)', border: '1px solid hsl(215 25% 16%)', boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)' }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: 'hsl(215 25% 14%)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(215 20% 40%)' }}>
                    Switch Language
                  </p>
                </div>
                {languages.length === 0 ? (
                  <p className="px-3 py-3 text-xs" style={{ color: 'hsl(215 20% 45%)' }}>No languages available</p>
                ) : (
                  languages.map(lang => (
                    <button key={lang.id} onClick={() => handleLanguageChange(lang)}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-white/5"
                      style={{
                        color: lang.id === currentLanguage.id ? 'hsl(185 100% 60%)' : 'hsl(215 20% 65%)',
                        background: lang.id === currentLanguage.id ? 'hsl(185 100% 50% / 0.08)' : 'transparent',
                      }}>
                      <Languages className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1 truncate">{lang.name}</span>
                      {lang.id === currentLanguage.id && <span className="text-xs">✓</span>}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Participants button */}
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
            onDeleted={handleMessageDeleted}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t px-4 py-3"
        style={{ background: 'hsl(222 47% 5% / 0.9)', borderColor: 'hsl(215 25% 14%)', backdropFilter: 'blur(16px)' }}>
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
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e) }}
          />
          <button type="submit" disabled={isPending || !input.trim()}
            className="btn-primary w-10 h-10 p-0 flex items-center justify-center rounded-lg flex-shrink-0">
            {isPending
              ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
              : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn, rules, onDeleted }) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [isPending, startTransition] = useTransition()
  const decoded = decodeMessage(message.encoded_content, rules)

  function deleteForMe() {
    // Client-side only hide (no DB persistence needed for "delete for me")
    onDeleted(message.id)
    setShowDeleteMenu(false)
    toast.success('Message hidden')
  }

  function deleteForEveryone() {
    if (!confirm('Delete this message for everyone?')) return
    startTransition(async () => {
      const result = await deleteMessageForEveryoneAction(message.id)
      if (result.error) toast.error(result.error)
      else { onDeleted(message.id); toast.success('Message deleted') }
    })
    setShowDeleteMenu(false)
  }

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} group`}>
      {!isOwn && (
        <span className="text-xs mb-1 ml-1" style={{ color: 'hsl(215 20% 40%)' }}>
          {message.sender_username}
        </span>
      )}

      <div className={`max-w-[85%] sm:max-w-[70%] relative ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
        <div className="px-3.5 py-2.5 rounded-2xl"
          style={isOwn ? {
            background: 'linear-gradient(135deg, hsl(185 100% 40% / 0.25), hsl(185 100% 30% / 0.2))',
            border: '1px solid hsl(185 100% 50% / 0.25)', borderBottomRightRadius: '4px',
          } : {
            background: 'hsl(215 25% 14%)', border: '1px solid hsl(215 25% 20%)', borderBottomLeftRadius: '4px',
          }}>
          <p className={`${showOriginal ? 'decoded-text' : 'encoded-text'} text-sm`}>
            {showOriginal ? decoded : message.encoded_content}
          </p>
        </div>

        {/* Controls */}
        <div className={`flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs" style={{ color: 'hsl(215 20% 35%)' }}>
            {formatTime(message.created_at)}
          </span>
          {rules.length > 0 && (
            <button onClick={() => setShowOriginal(v => !v)}
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all"
              style={showOriginal ? {
                background: 'hsl(45 100% 50% / 0.1)', color: 'hsl(45 100% 65%)', border: '1px solid hsl(45 100% 50% / 0.2)',
              } : {
                background: 'hsl(185 100% 50% / 0.08)', color: 'hsl(185 100% 60%)', border: '1px solid hsl(185 100% 50% / 0.15)',
              }}>
              {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showOriginal ? 'Encode' : 'Decode'}
            </button>
          )}

          {/* Delete button */}
          {!message.isOptimistic && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteMenu(v => !v)}
                disabled={isPending}
                className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md transition-all"
                style={{ background: 'hsl(0 84% 40% / 0.08)', color: 'hsl(0 84% 60%)', border: '1px solid hsl(0 84% 40% / 0.15)' }}>
                <Trash2 className="w-3 h-3" />
              </button>

              {showDeleteMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDeleteMenu(false)} />
                  <div className={`absolute bottom-7 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[180px] ${isOwn ? 'right-0' : 'left-0'}`}
                    style={{ background: 'hsl(222 40% 9%)', border: '1px solid hsl(215 25% 16%)', boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)' }}>
                    <button onClick={deleteForMe}
                      className="w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 transition-colors hover:bg-white/5"
                      style={{ color: 'hsl(215 20% 65%)' }}>
                      <X className="w-3.5 h-3.5" />
                      <div>
                        <div className="font-medium">Delete for me</div>
                        <div style={{ color: 'hsl(215 20% 40%)' }}>Only you won't see it</div>
                      </div>
                    </button>
                    {isOwn && (
                      <button onClick={deleteForEveryone}
                        className="w-full text-left px-3 py-2.5 text-xs flex items-center gap-2 transition-colors hover:bg-red-500/10 border-t"
                        style={{ color: 'hsl(0 84% 65%)', borderColor: 'hsl(215 25% 14%)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                        <div>
                          <div className="font-medium">Delete for everyone</div>
                          <div style={{ color: 'hsl(0 84% 40%)' }}>Removes for all</div>
                        </div>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
