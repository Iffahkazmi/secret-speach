'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createConversationAction } from '@/actions/conversations'
import { MessageSquare, Plus, Languages, X, Zap } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function ConversationsClient({ initialConversations, languages }) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({ name: '', languageId: '' })

  function handleCreate(e) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createConversationAction({
        name: form.name,
        languageId: form.languageId,
        participantIds: [],
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Conversation created!')
      setShowCreate(false)
      setForm({ name: '', languageId: '' })
      router.push(`/chat/${result.conversationId}`)
    })
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(210 40% 95%)' }}>Chats</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* List */}
      {conversations.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <ConversationCard
              key={conv.id}
              conv={conv}
              onClick={() => router.push(`/chat/${conv.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="New Conversation">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
                Conversation name
              </label>
              <input
                className="input-field"
                placeholder="e.g. Secret Mission Alpha"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
                Secret language
              </label>
              {languages.length === 0 ? (
                <p className="text-sm py-3 text-center" style={{ color: 'hsl(215 20% 45%)' }}>
                  No languages yet — create one in the Languages tab first.
                </p>
              ) : (
                <select
                  className="input-field"
                  value={form.languageId}
                  onChange={e => setForm(f => ({ ...f, languageId: e.target.value }))}
                  required
                >
                  <option value="">Select a language…</option>
                  {languages.map(lang => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name}{lang.is_preset ? ' (Preset)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !form.name || !form.languageId}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <span className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Start Chat
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function ConversationCard({ conv, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card-glass w-full text-left rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.15), hsl(160 84% 39% / 0.15))',
            border: '1px solid hsl(185 100% 50% / 0.2)',
          }}>
          <MessageSquare className="w-5 h-5" style={{ color: 'hsl(185 100% 60%)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm truncate group-hover:text-cyan-400 transition-colors"
              style={{ color: 'hsl(210 40% 92%)' }}>
              {conv.name}
            </h3>
            <span className="text-xs flex-shrink-0" style={{ color: 'hsl(215 20% 40%)' }}>
              {formatDate(conv.last_message_at)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Languages className="w-3 h-3 flex-shrink-0" style={{ color: 'hsl(215 20% 45%)' }} />
            <span className="text-xs truncate" style={{ color: 'hsl(215 20% 45%)' }}>
              {conv.language_name}
            </span>
            {conv.last_message && (
              <>
                <span style={{ color: 'hsl(215 20% 30%)' }}>•</span>
                <span className="encoded-text text-xs truncate opacity-60">{conv.last_message}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: 'hsl(185 100% 50% / 0.08)',
          border: '1px solid hsl(185 100% 50% / 0.15)',
        }}>
        <MessageSquare className="w-7 h-7" style={{ color: 'hsl(185 100% 50% / 0.5)' }} />
      </div>
      <h3 className="font-semibold mb-1" style={{ color: 'hsl(215 20% 60%)' }}>No conversations yet</h3>
      <p className="text-sm mb-6" style={{ color: 'hsl(215 20% 40%)' }}>
        Create a conversation and start chatting in your secret language
      </p>
      <button onClick={onCreateClick} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Create your first chat
      </button>
    </div>
  )
}

function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-glass rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ boxShadow: '0 0 60px hsl(185 100% 50% / 0.1)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: 'hsl(210 40% 95%)' }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: 'hsl(215 20% 50%)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
