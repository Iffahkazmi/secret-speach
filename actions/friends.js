'use server'

import { auth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get all users except self, with friendship status attached
export async function getUsersAction({ search = '' } = {}) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()
  const me = session.user.id

  // Fetch all profiles except self
  let query = supabase
    .from('profiles')
    .select('id, username, avatar_url, created_at')
    .neq('id', me)
    .order('username')

  if (search.trim()) {
    query = query.ilike('username', `%${search.trim()}%`)
  }

  const { data: users, error } = await query

  if (error) return { error: 'Failed to fetch users' }

  // Fetch all friend requests involving me
  const { data: requests } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id, status')
    .or(`sender_id.eq.${me},receiver_id.eq.${me}`)

  // Map friendship status onto each user
  const usersWithStatus = (users ?? []).map(user => {
    const req = (requests ?? []).find(
      r =>
        (r.sender_id === me && r.receiver_id === user.id) ||
        (r.sender_id === user.id && r.receiver_id === me)
    )

    let friendStatus = 'none' // none | pending_sent | pending_received | accepted | rejected
    let requestId = null

    if (req) {
      requestId = req.id
      if (req.status === 'accepted') {
        friendStatus = 'accepted'
      } else if (req.status === 'rejected') {
        friendStatus = req.sender_id === me ? 'rejected' : 'none'
      } else if (req.status === 'pending') {
        friendStatus = req.sender_id === me ? 'pending_sent' : 'pending_received'
      }
    }

    return { ...user, friendStatus, requestId }
  })

  return { users: usersWithStatus, currentUserId: me }
}

// Get only accepted friends
export async function getFriendsAction() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()
  const me = session.user.id

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, receiver_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${me},receiver_id.eq.${me}`)

  if (error) return { error: 'Failed to fetch friends' }
  if (!requests?.length) return { friends: [] }

  const friendIds = requests.map(r =>
    r.sender_id === me ? r.receiver_id : r.sender_id
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', friendIds)
    .order('username')

  return { friends: profiles ?? [] }
}

// Get pending incoming friend requests
export async function getPendingRequestsAction() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()
  const me = session.user.id

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('id, sender_id, created_at')
    .eq('receiver_id', me)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) return { error: 'Failed to fetch requests' }
  if (!requests?.length) return { requests: [] }

  const senderIds = requests.map(r => r.sender_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', senderIds)

  const enriched = requests.map(req => ({
    id: req.id,
    created_at: req.created_at,
    sender: profiles?.find(p => p.id === req.sender_id) ?? { username: 'Unknown' },
  }))

  return { requests: enriched }
}

export async function sendFriendRequestAction(receiverId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const me = session.user.id
  if (me === receiverId) return { error: 'Cannot add yourself' }

  const supabase = createServiceClient()

  // Check if request already exists either way
  const { data: existing } = await supabase
    .from('friend_requests')
    .select('id, status, sender_id')
    .or(
      `and(sender_id.eq.${me},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${me})`
    )
    .maybeSingle()

  if (existing) {
    if (existing.status === 'accepted') return { error: 'Already friends' }
    if (existing.status === 'pending') return { error: 'Request already sent' }
    // If rejected and we were sender, update to pending again
    if (existing.status === 'rejected' && existing.sender_id === me) {
      await supabase
        .from('friend_requests')
        .update({ status: 'pending' })
        .eq('id', existing.id)
      revalidatePath('/users')
      return { success: true }
    }
  }

  const { error } = await supabase.from('friend_requests').insert({
    sender_id: me,
    receiver_id: receiverId,
  })

  if (error) {
    console.error('Send friend request error:', error)
    return { error: 'Failed to send request' }
  }

  revalidatePath('/users')
  revalidatePath('/friends')
  return { success: true }
}

export async function acceptFriendRequestAction(requestId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  // Verify this request is for the current user
  const { data: req } = await supabase
    .from('friend_requests')
    .select('receiver_id')
    .eq('id', requestId)
    .single()

  if (req?.receiver_id !== session.user.id) return { error: 'Not your request' }

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId)

  if (error) return { error: 'Failed to accept request' }

  revalidatePath('/friends')
  revalidatePath('/users')
  return { success: true }
}

export async function rejectFriendRequestAction(requestId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  const { data: req } = await supabase
    .from('friend_requests')
    .select('receiver_id')
    .eq('id', requestId)
    .single()

  if (req?.receiver_id !== session.user.id) return { error: 'Not your request' }

  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)

  if (error) return { error: 'Failed to reject request' }

  revalidatePath('/friends')
  revalidatePath('/users')
  return { success: true }
}

export async function removeFriendAction(friendId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()
  const me = session.user.id

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .or(
      `and(sender_id.eq.${me},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${me})`
    )

  if (error) return { error: 'Failed to remove friend' }

  revalidatePath('/friends')
  revalidatePath('/users')
  return { success: true }
}

export async function cancelFriendRequestAction(requestId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  const { data: req } = await supabase
    .from('friend_requests')
    .select('sender_id')
    .eq('id', requestId)
    .single()

  if (req?.sender_id !== session.user.id) return { error: 'Not your request' }

  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId)

  if (error) return { error: 'Failed to cancel request' }

  revalidatePath('/users')
  revalidatePath('/friends')
  return { success: true }
}
