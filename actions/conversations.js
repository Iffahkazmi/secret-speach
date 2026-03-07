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

  // Verify user has access to this language
  const { data: lang } = await supabase
    .from('languages')
    .select('id, is_preset, owner_id')
    .eq('id', languageId)
    .single()

  if (!lang) return { error: 'Language not found' }

  const hasAccess =
    lang.is_preset ||
    lang.owner_id === session.user.id ||
    (await supabase
      .from('language_shares')
      .select('id')
      .eq('language_id', languageId)
      .eq('user_id', session.user.id)
      .maybeSingle()
    ).data !== null

  if (!hasAccess) return { error: 'You do not have access to this language' }

  // Create conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      name: name.trim(),
      language_id: languageId,
      created_by: session.user.id,
    })
    .select()
    .single()

  if (convError) {
    console.error('Create conversation error:', convError)
    return { error: 'Failed to create conversation' }
  }

  // Add ALL participants at once (creator + any others)
  // Using service role — no RLS chicken-and-egg problem
  const allParticipantIds = [session.user.id, ...participantIds.filter(id => id !== session.user.id)]
  const participantsPayload = allParticipantIds.map(uid => ({
    conversation_id: conv.id,
    user_id: uid,
  }))

  const { error: partError } = await supabase
    .from('participants')
    .insert(participantsPayload)

  if (partError) {
    console.error('Participants insert error:', partError)
    // Roll back conversation
    await supabase.from('conversations').delete().eq('id', conv.id)
    return { error: 'Failed to add participants' }
  }

  revalidatePath('/dashboard')
  return { success: true, conversationId: conv.id }
}

export async function getConversationsAction() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  // Get all conversation IDs this user is in
  const { data: participations } = await supabase
    .from('participants')
    .select('conversation_id')
    .eq('user_id', session.user.id)

  if (!participations?.length) return { conversations: [] }

  const convIds = participations.map(p => p.conversation_id)

  // Fetch conversations with language name and last message in one query
  const { data: convs, error } = await supabase
    .from('conversations')
    .select(`
      id, name, created_at, language_id,
      languages(id, name),
      messages(id, encoded_content, created_at, sender_id)
    `)
    .in('id', convIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Get conversations error:', error)
    return { error: 'Failed to fetch conversations' }
  }

  // Attach participant count + last message per conversation
  const enriched = convs.map(conv => {
    const sortedMessages = (conv.messages ?? []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
    return {
      id: conv.id,
      name: conv.name,
      created_at: conv.created_at,
      language_id: conv.language_id,
      language_name: conv.languages?.name ?? 'Unknown',
      last_message: sortedMessages[0]?.encoded_content ?? null,
      last_message_at: sortedMessages[0]?.created_at ?? conv.created_at,
      message_count: conv.messages?.length ?? 0,
    }
  })

  // Sort by most recent activity
  enriched.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))

  return { conversations: enriched }
}

export async function getConversationAction(conversationId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  // Verify user is a participant
  const { data: part } = await supabase
    .from('participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!part) return { error: 'You are not a participant in this conversation' }

  // Fetch conversation with language + rules in ONE query
  const { data: conv, error } = await supabase
    .from('conversations')
    .select(`
      id, name, language_id,
      languages(id, name, rules(id, rule_type, rule_config, sort_order))
    `)
    .eq('id', conversationId)
    .single()

  if (error || !conv) return { error: 'Conversation not found' }

  // Fetch initial messages with sender username joined — no N+1
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, encoded_content, original_content, created_at, profiles(username)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(100)

  // Fetch participants with usernames
  const { data: participants } = await supabase
    .from('participants')
    .select('user_id, profiles(username)')
    .eq('conversation_id', conversationId)

  return {
    conversation: {
      id: conv.id,
      name: conv.name,
      language: {
        id: conv.language_id,
        name: conv.languages?.name,
        rules: (conv.languages?.rules ?? []).sort((a, b) => a.sort_order - b.sort_order),
      },
    },
    messages: (messages ?? []).map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      sender_username: m.profiles?.username ?? 'Unknown',
      encoded_content: m.encoded_content,
      original_content: m.original_content,
      created_at: m.created_at,
    })),
    participants: (participants ?? []).map(p => ({
      user_id: p.user_id,
      username: p.profiles?.username ?? 'Unknown',
    })),
    currentUserId: session.user.id,
  }
}
