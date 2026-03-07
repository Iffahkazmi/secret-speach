'use server'

import { auth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function sendMessageAction({ conversationId, originalContent, encodedContent }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  if (!originalContent?.trim()) return { error: 'Message cannot be empty' }
  if (originalContent.length > 2000) return { error: 'Message too long (max 2000 chars)' }

  const supabase = createServiceClient()

  // Verify participant
  const { data: part } = await supabase
    .from('participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!part) return { error: 'Not a participant in this conversation' }

  // Rate limit: max 20 messages per minute
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', session.user.id)
    .gte('created_at', oneMinuteAgo)

  if (count >= 20) return { error: 'Slow down — too many messages. Wait a moment.' }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      original_content: originalContent.trim(),
      encoded_content: encodedContent ?? originalContent.trim(),
    })
    .select()
    .single()

  if (error) {
    console.error('Send message error:', error)
    return { error: 'Failed to send message' }
  }

  return { success: true, message }
}
