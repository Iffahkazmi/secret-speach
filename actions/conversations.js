'use server'

import { auth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createConversationAction({ name, languageId, participantIds = [] }) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  if (!name?.trim()) return { error: 'Conversation name is required' }
  if (!languageId) return { error: 'Please select a language' }

  const supabase = createServiceClient()

  // Block self-only conversations
  const others = participantIds.filter(id => id !== session.user.id)
  if (others.length === 0) return { error: 'Add at least one friend to start a conversation' }

  const { data: lang } = await supabase
    .from('languages')
    .select('id, is_preset, owner_id')
    .eq('id', languageId)
    .single()

  if (!lang) return { error: 'Language not found' }

  const hasAccess =
    lang.is_preset ||
    lang.owner_id === session.user.id ||
    (await supabase.from('language_shares').select('id')
      .eq('language_id', languageId).eq('user_id', session.user.id).maybeSingle()).data !== null

  if (!hasAccess) return { error: 'You do not have access to this language' }

  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({ name: name.trim(), language_id: languageId, created_by: session.user.id })
    .select().single()

  if (convError) return { error: 'Failed to create conversation' }

  const allIds = [session.user.id, ...others]
  const { error: partError } = await supabase
    .from('participants')
    .insert(allIds.map(uid => ({ conversation_id: conv.id, user_id: uid })))

  if (partError) {
    await supabase.from('conversations').delete().eq('id', conv.id)
    return { error: 'Failed to add participants' }
  }

  revalidatePath('/dashboard')
  return { success: true, conversationId: conv.id }
}

export async function deleteConversationForMeAction(conversationId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const supabase = createServiceClient()
  const { error } = await supabase.from('participants').delete()
    .eq('conversation_id', conversationId).eq('user_id', session.user.id)
  if (error) return { error: 'Failed to leave conversation' }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteConversationForEveryoneAction(conversationId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const supabase = createServiceClient()
  const { data: conv } = await supabase.from('conversations').select('created_by').eq('id', conversationId).single()
  if (!conv) return { error: 'Conversation not found' }
  if (conv.created_by !== session.user.id) return { error: 'Only the creator can delete for everyone' }
  const { error } = await supabase.from('conversations').delete().eq('id', conversationId)
  if (error) return { error: 'Failed to delete conversation' }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function changeConversationLanguageAction(conversationId, newLanguageId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const supabase = createServiceClient()
  const { data: part } = await supabase.from('participants').select('user_id')
    .eq('conversation_id', conversationId).eq('user_id', session.user.id).maybeSingle()
  if (!part) return { error: 'Not a participant' }
  const { data: lang } = await supabase.from('languages').select('id, is_preset, owner_id').eq('id', newLanguageId).single()
  if (!lang) return { error: 'Language not found' }
  const hasAccess = lang.is_preset || lang.owner_id === session.user.id ||
    (await supabase.from('language_shares').select('id').eq('language_id', newLanguageId).eq('user_id', session.user.id).maybeSingle()).data !== null
  if (!hasAccess) return { error: 'You do not have access to this language' }
  const { error } = await supabase.from('conversations').update({ language_id: newLanguageId }).eq('id', conversationId)
  if (error) return { error: 'Failed to change language' }
  revalidatePath(`/chat/${conversationId}`)
  return { success: true }
}

export async function deleteMessageForEveryoneAction(messageId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const supabase = createServiceClient()
  const { data: msg } = await supabase.from('messages').select('sender_id').eq('id', messageId).single()
  if (!msg) return { error: 'Message not found' }
  if (msg.sender_id !== session.user.id) return { error: 'You can only delete your own messages' }
  const { error } = await supabase.from('messages').delete().eq('id', messageId)
  if (error) return { error: 'Failed to delete message' }
  return { success: true }
}

export async function getConversationsAction() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const supabase = createServiceClient()
  const { data: participations } = await supabase.from('participants').select('conversation_id').eq('user_id', session.user.id)
  if (!participations?.length) return { conversations: [], currentUserId: session.user.id }
  const convIds = participations.map(p => p.conversation_id)
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, name, created_at, language_id, created_by, languages(id, name), messages(id, encoded_content, created_at, sender_id)')
    .in('id', convIds).order('created_at', { ascending: false })
  if (error) return { error: 'Failed to fetch conversations' }
  const enriched = convs.map(conv => {
    const sorted = (conv.messages ?? []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return {
      id: conv.id, name: conv.name, created_at: conv.created_at,
      created_by: conv.created_by, language_id: conv.language_id,
      language_name: conv.languages?.name ?? 'Unknown',
      last_message: sorted[0]?.encoded_content ?? null,
      last_message_at: sorted[0]?.created_at ?? conv.created_at,
    }
  })
  enriched.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
  return { conversations: enriched, currentUserId: session.user.id }
}

export async function getConversationAction(conversationId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }
  const supabase = createServiceClient()
  const { data: part } = await supabase.from('participants').select('user_id')
    .eq('conversation_id', conversationId).eq('user_id', session.user.id).maybeSingle()
  if (!part) return { error: 'You are not a participant in this conversation' }
  const { data: conv, error } = await supabase
    .from('conversations')
    .select('id, name, language_id, created_by, languages(id, name, rules(id, rule_type, rule_config, sort_order))')
    .eq('id', conversationId).single()
  if (error || !conv) return { error: 'Conversation not found' }
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, encoded_content, original_content, created_at, profiles(username)')
    .eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(100)
  const { data: participants } = await supabase
    .from('participants').select('user_id, profiles(username)').eq('conversation_id', conversationId)
  return {
    conversation: {
      id: conv.id, name: conv.name, created_by: conv.created_by,
      language: { id: conv.language_id, name: conv.languages?.name, rules: (conv.languages?.rules ?? []).sort((a, b) => a.sort_order - b.sort_order) },
    },
    messages: (messages ?? []).map(m => ({
      id: m.id, sender_id: m.sender_id, sender_username: m.profiles?.username ?? 'Unknown',
      encoded_content: m.encoded_content, original_content: m.original_content, created_at: m.created_at,
    })),
    participants: (participants ?? []).map(p => ({ user_id: p.user_id, username: p.profiles?.username ?? 'Unknown' })),
    currentUserId: session.user.id,
  }
}
