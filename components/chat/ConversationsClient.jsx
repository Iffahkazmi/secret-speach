'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createConversationAction,
  deleteConversationForMeAction,
  deleteConversationForEveryoneAction,
} from '@/actions/conversations'
import { MessageSquare, Plus, Languages, X, Zap, Trash2, UserPlus, Users, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function ConversationsClient({ initialConversations, languages, friends, currentUserId }) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [showCreate, setShowCreate] = useState(false)

  function handleDeleted(id) {
    setConversations(prev => prev.filter(c => c.id !== id))
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
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5">
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
              currentUserId={currentUserId}
              onClick={() => router.push(`/chat/${conv.id}`)}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateChatModal
          languages={languages}
          friends={friends}
          onClose={() => setShowCreate(false)}
          onCreated={(convId) => {
            setShowCreate(false)
            router.push(`/chat/${convId}`)
          }}
        />
      )}
    </div>
  )
}

function ConversationCard({ conv, currentUserId, onClick, onDeleted }) {
  const [showMenu, setShowMenu] = useState(false)
  const [isPending, startTransition] = useTransition()
  const isCreator = conv.created_by === currentUserId

  function deleteForMe(e) {
    e.stopPropagation()
    if (!confirm('Remove this conversation from your list?')) return
    startTransition(async () => {
      const result = await deleteConversationForMeAction(conv.id)
      if (result.error) toast.error(result.error)
      else { toast.success('Conversation removed'); onDeleted(conv.id) }
    })
    setShowMenu(false)
  }

  function deleteForEveryone(e) {
    e.stopPropagation()
    if (!confirm('Delete this conversation for ALL participants? This cannot be undone.')) return
    startTransition(async () => {
      const result = await deleteConversationForEveryoneAction(conv.id)
      if (result.error) toast.error(result.error)
      else { toast.success('Conversation deleted for everyone'); onDeleted(conv.id) }
    })
    setShowMenu(false)
  }

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="card-glass w-full text-left rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(185 100% 50% / 0.15), hsl(160 84% 39% / 0.15))',
              border: '1px solid hsl(185 100% 50% / 0.2)',
            }}>
            <MessageSquare className="w-5 h-5" style={{ color: 'hsl(185 100% 60%)' }} />
          </div>
          <div className="flex-1 min-w-0 pr-8">
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

      {/* Delete toggle button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <button
          onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
          disabled={isPending}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          style={{
            background: showMenu ? 'hsl(0 84% 40% / 0.15)' : 'hsl(215 25% 14%)',
            color: showMenu ? 'hsl(0 84% 65%)' : 'hsl(215 20% 50%)',
            border: `1px solid ${showMenu ? 'hsl(0 84% 40% / 0.3)' : 'hsl(215 25% 20%)'}`,
          }}
          title="Delete options"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-9 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[200px]"
              style={{
                background: 'hsl(222 40% 9%)',
                border: '1px solid hsl(215 25% 16%)',
                boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)',
              }}>
              <button
                onClick={deleteForMe}
                className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 transition-colors hover:bg-white/5"
                style={{ color: 'hsl(215 20% 65%)' }}
              >
                <X className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="font-medium">Delete for me</div>
                  <div className="text-xs mt-0.5" style={{ color: 'hsl(215 20% 40%)' }}>
                    Others can still see this chat
                  </div>
                </div>
              </button>
              {isCreator && (
                <button
                  onClick={deleteForEveryone}
                  className="w-full text-left px-4 py-3 text-sm flex items-center gap-2.5 transition-colors hover:bg-red-500/10 border-t"
                  style={{ color: 'hsl(0 84% 65%)', borderColor: 'hsl(215 25% 14%)' }}
                >
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Delete for everyone</div>
                    <div className="text-xs mt-0.5" style={{ color: 'hsl(0 84% 45%)' }}>
                      Permanently removes the chat
                    </div>
                  </div>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CreateChatModal({ languages, friends, onClose, onCreated }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', languageId: '' })
  const [selectedFriends, setSelectedFriends] = useState([])
  const [isPending, startTransition] = useTransition()

  function toggleFriend(friend) {
    setSelectedFriends(prev =>
      prev.find(f => f.id === friend.id)
        ? prev.filter(f => f.id !== friend.id)
        : [...prev, friend]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (selectedFriends.length === 0) {
      toast.error('Add at least one friend to start a conversation')
      return
    }
    startTransition(async () => {
      const result = await createConversationAction({
        name: form.name,
        languageId: form.languageId,
        participantIds: selectedFriends.map(f => f.id),
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Conversation created!')
        onCreated(result.conversationId)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-glass rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ boxShadow: '0 0 60px hsl(185 100% 50% / 0.1)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{ color: 'hsl(210 40% 95%)' }}>New Conversation</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: 'hsl(215 20% 50%)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
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

          {/* Friends picker */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
              Add friends
            </label>
            {friends.length === 0 ? (
              <div className="rounded-xl p-4 text-center"
                style={{ background: 'hsl(215 25% 10%)', border: '1px solid hsl(215 25% 16%)' }}>
                <Users className="w-6 h-6 mx-auto mb-2" style={{ color: 'hsl(215 20% 35%)' }} />
                <p className="text-xs mb-2" style={{ color: 'hsl(215 20% 45%)' }}>
                  You have no friends yet
                </p>
                <button
                  type="button"
                  onClick={() => { onClose(); router.push('/users') }}
                  className="text-xs flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    background: 'hsl(185 100% 50% / 0.1)',
                    color: 'hsl(185 100% 60%)',
                    border: '1px solid hsl(185 100% 50% / 0.2)',
                  }}>
                  <UserPlus className="w-3.5 h-3.5" />
                  Find & Add Friends
                </button>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden"
                style={{ border: '1px solid hsl(215 25% 16%)' }}>
                {friends.map((friend, i) => {
                  const selected = selectedFriends.find(f => f.id === friend.id)
                  const hue = friend.username.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => toggleFriend(friend)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left"
                      style={{
                        background: selected ? 'hsl(185 100% 50% / 0.08)' : i % 2 === 0 ? 'hsl(222 40% 8%)' : 'hsl(222 40% 7%)',
                        borderBottom: i < friends.length - 1 ? '1px solid hsl(215 25% 12%)' : 'none',
                      }}>
                      <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{
                          background: `hsl(${hue} 60% 30% / 0.4)`,
                          color: `hsl(${hue} 80% 75%)`,
                        }}>
                        {friend.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: selected ? 'hsl(185 100% 70%)' : 'hsl(210 40% 80%)' }}>
                        {friend.username}
                      </span>
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          background: selected ? 'hsl(185 100% 50%)' : 'transparent',
                          border: `2px solid ${selected ? 'hsl(185 100% 50%)' : 'hsl(215 25% 30%)'}`,
                        }}>
                        {selected && <span style={{ color: 'hsl(222 47% 5%)', fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {selectedFriends.length > 0 && (
              <p className="text-xs mt-1.5" style={{ color: 'hsl(185 100% 55%)' }}>
                {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Language */}
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
                required>
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
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button
              type="submit"
              disabled={isPending || !form.name || !form.languageId || selectedFriends.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isPending ? (
                <span className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
              ) : (
                <><Zap className="w-4 h-4" /> Start Chat</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'hsl(185 100% 50% / 0.08)', border: '1px solid hsl(185 100% 50% / 0.15)' }}>
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
