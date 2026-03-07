'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  sendFriendRequestAction,
  cancelFriendRequestAction,
} from '@/actions/friends'
import {
  Search, UserPlus, UserCheck, UserX,
  Clock, Users, X, Check,
} from 'lucide-react'
import { toast } from 'sonner'

export default function UsersClient({ initialUsers, currentUserId, initialSearch }) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [search, setSearch] = useState(initialSearch)
  const [isPendingSearch, startSearch] = useTransition()

  function handleSearch(e) {
    e.preventDefault()
    startSearch(() => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      router.push(`/users?${params.toString()}`)
    })
  }

  function updateUserStatus(userId, friendStatus, requestId = null) {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, friendStatus, requestId } : u
    ))
  }

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(210 40% 95%)' }}>
          Find Users
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(215 20% 45%)' }}>
          {users.length} user{users.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'hsl(215 20% 45%)' }} />
          <input
            className="input-field pl-9"
            placeholder="Search by username…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); router.push('/users') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'hsl(215 20% 45%)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button type="submit" disabled={isPendingSearch} className="btn-primary px-4">
          {isPendingSearch ? (
            <span className="w-4 h-4 border-2 rounded-full animate-spin"
              style={{ borderColor: 'hsl(222 47% 5% / 0.3)', borderTopColor: 'hsl(222 47% 5%)' }} />
          ) : 'Search'}
        </button>
      </form>

      {/* User list */}
      {users.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'hsl(215 20% 30%)' }} />
          <p style={{ color: 'hsl(215 20% 45%)' }}>No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <UserRow
              key={user.id}
              user={user}
              onStatusChange={updateUserStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onStatusChange }) {
  const [isPending, startTransition] = useTransition()

  function sendRequest() {
    startTransition(async () => {
      const result = await sendFriendRequestAction(user.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Friend request sent to ${user.username}!`)
        onStatusChange(user.id, 'pending_sent', null)
      }
    })
  }

  function cancelRequest() {
    startTransition(async () => {
      const result = await cancelFriendRequestAction(user.requestId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Request cancelled')
        onStatusChange(user.id, 'none', null)
      }
    })
  }

  const initials = user.username.slice(0, 2).toUpperCase()

  // Pick a deterministic color per user
  const hue = user.username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360

  return (
    <div className="card-glass rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-200">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm"
        style={{
          background: `hsl(${hue} 60% 30% / 0.4)`,
          border: `1px solid hsl(${hue} 60% 50% / 0.3)`,
          color: `hsl(${hue} 80% 75%)`,
        }}>
        {initials}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'hsl(210 40% 92%)' }}>
          {user.username}
        </p>
        <p className="text-xs" style={{ color: 'hsl(215 20% 40%)' }}>
          {statusLabel(user.friendStatus)}
        </p>
      </div>

      {/* Action button */}
      <FriendButton
        status={user.friendStatus}
        isPending={isPending}
        onSend={sendRequest}
        onCancel={cancelRequest}
      />
    </div>
  )
}

function FriendButton({ status, isPending, onSend, onCancel }) {
  if (isPending) {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <span className="w-4 h-4 border-2 rounded-full animate-spin"
          style={{ borderColor: 'hsl(185 100% 50% / 0.2)', borderTopColor: 'hsl(185 100% 50%)' }} />
      </div>
    )
  }

  switch (status) {
    case 'none':
      return (
        <button onClick={onSend}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:-translate-y-0.5"
          style={{
            background: 'hsl(185 100% 50% / 0.1)',
            color: 'hsl(185 100% 60%)',
            border: '1px solid hsl(185 100% 50% / 0.2)',
          }}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Friend
        </button>
      )

    case 'pending_sent':
      return (
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group"
          style={{
            background: 'hsl(45 80% 50% / 0.1)',
            color: 'hsl(45 80% 65%)',
            border: '1px solid hsl(45 80% 50% / 0.2)',
          }}>
          <Clock className="w-3.5 h-3.5 group-hover:hidden" />
          <X className="w-3.5 h-3.5 hidden group-hover:block" />
          <span className="group-hover:hidden">Pending</span>
          <span className="hidden group-hover:block">Cancel</span>
        </button>
      )

    case 'pending_received':
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: 'hsl(160 60% 40% / 0.1)',
            color: 'hsl(160 60% 55%)',
            border: '1px solid hsl(160 60% 40% / 0.2)',
          }}>
          <UserPlus className="w-3.5 h-3.5" />
          Wants to connect
        </span>
      )

    case 'accepted':
      return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: 'hsl(160 84% 39% / 0.12)',
            color: 'hsl(160 84% 55%)',
            border: '1px solid hsl(160 84% 39% / 0.25)',
          }}>
          <UserCheck className="w-3.5 h-3.5" />
          Friends
        </span>
      )

    case 'rejected':
      return (
        <button onClick={onSend}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: 'hsl(215 25% 12%)',
            color: 'hsl(215 20% 50%)',
            border: '1px solid hsl(215 25% 18%)',
          }}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Again
        </button>
      )

    default:
      return null
  }
}

function statusLabel(status) {
  switch (status) {
    case 'accepted': return '✓ Friends'
    case 'pending_sent': return 'Request sent'
    case 'pending_received': return 'Sent you a request'
    case 'rejected': return ''
    default: return ''
  }
}
