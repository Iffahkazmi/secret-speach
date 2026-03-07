'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  acceptFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendAction,
} from '@/actions/friends'
import { createConversationAction } from '@/actions/conversations'
import {
  Users, UserCheck, Clock, Check, X,
  MessageSquare, UserMinus, Zap, Languages,
} from 'lucide-react'
import { toast } from 'sonner'

export default function FriendsClient({ initialFriends, initialRequests, languages }) {
  const [friends, setFriends] = useState(initialFriends)
  const [requests, setRequests] = useState(initialRequests)
  const [activeTab, setActiveTab] = useState('friends')
  const [chatTarget, setChatTarget] = useState(null) // friend to start chat with

  function handleAccepted(requestId, sender) {
    setRequests(prev => prev.filter(r => r.id !== requestId))
    setFriends(prev => [...prev, sender])
  }

  function handleRejected(requestId) {
    setRequests(prev => prev.filter(r => r.id !== requestId))
  }

  function handleRemoved(friendId) {
    setFriends(prev => prev.filter(f => f.id !== friendId))
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(210 40% 95%)' }}>Friends</h1>
          <p className="text-sm mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 mb-6"
        style={{ background: 'hsl(215 25% 10%)', border: '1px solid hsl(215 25% 14%)' }}>
        <TabBtn
          active={activeTab === 'friends'}
          onClick={() => setActiveTab('friends')}
          icon={<UserCheck className="w-4 h-4" />}
          label="Friends"
          count={friends.length}
        />
        <TabBtn
          active={activeTab === 'requests'}
          onClick={() => setActiveTab('requests')}
          icon={<Clock className="w-4 h-4" />}
          label="Requests"
          count={requests.length}
          badge={requests.length > 0}
        />
      </div>

      {/* Friends tab */}
      {activeTab === 'friends' && (
        friends.length === 0 ? (
          <EmptyState
            icon={<Users className="w-10 h-10" />}
            title="No friends yet"
            subtitle="Go to Find Users to send friend requests"
          />
        ) : (
          <div className="space-y-2">
            {friends.map(friend => (
              <FriendRow
                key={friend.id}
                friend={friend}
                onChat={() => setChatTarget(friend)}
                onRemove={handleRemoved}
              />
            ))}
          </div>
        )
      )}

      {/* Requests tab */}
      {activeTab === 'requests' && (
        requests.length === 0 ? (
          <EmptyState
            icon={<Clock className="w-10 h-10" />}
            title="No pending requests"
            subtitle="When someone sends you a friend request it will appear here"
          />
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <RequestRow
                key={req.id}
                request={req}
                onAccepted={handleAccepted}
                onRejected={handleRejected}
              />
            ))}
          </div>
        )
      )}

      {/* Start chat modal */}
      {chatTarget && (
        <StartChatModal
          friend={chatTarget}
          languages={languages}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  )
}

function FriendRow({ friend, onChat, onRemove }) {
  const [isPending, startTransition] = useTransition()
  const hue = friend.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  function handleRemove() {
    if (!confirm(`Remove ${friend.username} from friends?`)) return
    startTransition(async () => {
      const result = await removeFriendAction(friend.id)
      if (result.error) toast.error(result.error)
      else { toast.success(`Removed ${friend.username}`); onRemove(friend.id) }
    })
  }

  return (
    <div className="card-glass rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
        style={{
          background: `hsl(${hue} 60% 30% / 0.4)`,
          border: `1px solid hsl(${hue} 60% 50% / 0.3)`,
          color: `hsl(${hue} 80% 75%)`,
        }}>
        {friend.username.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'hsl(210 40% 92%)' }}>
          {friend.username}
        </p>
        <p className="text-xs" style={{ color: 'hsl(160 60% 50%)' }}>Friends</p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:-translate-y-0.5"
          style={{
            background: 'hsl(185 100% 50% / 0.1)',
            color: 'hsl(185 100% 60%)',
            border: '1px solid hsl(185 100% 50% / 0.2)',
          }}>
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </button>

        <button
          onClick={handleRemove}
          disabled={isPending}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10 disabled:opacity-40"
          style={{ color: 'hsl(215 20% 45%)' }}
          title="Remove friend">
          <UserMinus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function RequestRow({ request, onAccepted, onRejected }) {
  const [isPending, startTransition] = useTransition()
  const hue = request.sender.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  function accept() {
    startTransition(async () => {
      const result = await acceptFriendRequestAction(request.id)
      if (result.error) toast.error(result.error)
      else {
        toast.success(`You and ${request.sender.username} are now friends!`)
        onAccepted(request.id, request.sender)
      }
    })
  }

  function reject() {
    startTransition(async () => {
      const result = await rejectFriendRequestAction(request.id)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Request declined')
        onRejected(request.id)
      }
    })
  }

  return (
    <div className="card-glass rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ borderColor: 'hsl(45 80% 50% / 0.15)' }}>
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
        style={{
          background: `hsl(${hue} 60% 30% / 0.4)`,
          border: `1px solid hsl(${hue} 60% 50% / 0.3)`,
          color: `hsl(${hue} 80% 75%)`,
        }}>
        {request.sender.username.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'hsl(210 40% 92%)' }}>
          {request.sender.username}
        </p>
        <p className="text-xs" style={{ color: 'hsl(45 80% 55%)' }}>
          Wants to be friends
        </p>
      </div>

      {isPending ? (
        <span className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: 'hsl(185 100% 50% / 0.2)', borderTopColor: 'hsl(185 100% 50%)' }} />
      ) : (
        <div className="flex items-center gap-1.5">
          <button onClick={accept}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:-translate-y-0.5"
            style={{
              background: 'hsl(160 84% 39% / 0.15)',
              color: 'hsl(160 84% 55%)',
              border: '1px solid hsl(160 84% 39% / 0.3)',
            }}
            title="Accept">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={reject}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
            style={{ color: 'hsl(215 20% 50%)', border: '1px solid hsl(215 25% 18%)' }}
            title="Decline">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

function StartChatModal({ friend, languages, onClose }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', languageId: '' })
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e) {
    e.preventDefault()
    startTransition(async () => {
      const result = await createConversationAction({
        name: form.name,
        languageId: form.languageId,
        participantIds: [friend.id],
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Conversation created!')
        onClose()
        router.push(`/chat/${result.conversationId}`)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card-glass rounded-2xl p-6 w-full max-w-md shadow-2xl"
        style={{ boxShadow: '0 0 60px hsl(185 100% 50% / 0.1)' }}>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'hsl(210 40% 95%)' }}>
              Chat with {friend.username}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>
              Choose a secret language for this conversation
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
            style={{ color: 'hsl(215 20% 50%)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(215 20% 55%)' }}>
              Conversation name
            </label>
            <input
              className="input-field"
              placeholder={`Chat with ${friend.username}`}
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
              <p className="text-sm py-3 text-center rounded-lg"
                style={{ background: 'hsl(215 25% 10%)', color: 'hsl(215 20% 45%)' }}>
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
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name || !form.languageId}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isPending ? (
                <span className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Start Secret Chat
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, icon, label, count, badge }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200"
      style={active ? {
        background: 'hsl(185 100% 50%)',
        color: 'hsl(222 47% 5%)',
        boxShadow: '0 0 15px hsl(185 100% 50% / 0.3)',
      } : {
        color: 'hsl(215 20% 50%)',
      }}>
      {icon}
      {label}
      {count > 0 && (
        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
          style={active ? {
            background: 'hsl(222 47% 5% / 0.3)',
            color: 'hsl(222 47% 5%)',
          } : {
            background: badge ? 'hsl(45 80% 50% / 0.2)' : 'hsl(215 25% 18%)',
            color: badge ? 'hsl(45 80% 65%)' : 'hsl(215 20% 55%)',
          }}>
          {count}
        </span>
      )}
    </button>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'hsl(215 25% 10%)', color: 'hsl(215 20% 35%)' }}>
        {icon}
      </div>
      <p className="font-semibold mb-1" style={{ color: 'hsl(215 20% 55%)' }}>{title}</p>
      <p className="text-sm" style={{ color: 'hsl(215 20% 38%)' }}>{subtitle}</p>
    </div>
  )
}
