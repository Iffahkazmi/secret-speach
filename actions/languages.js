'use server'

import { auth } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateInviteCode } from '@/lib/utils'

export async function createLanguageAction(data) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const { name, description, rules } = data

  if (!name?.trim()) return { error: 'Language name is required' }
  if (name.length > 60) return { error: 'Name too long (max 60 chars)' }

  const supabase = createServiceClient()

  // Generate unique invite code
  let invite_code
  let attempts = 0
  while (attempts < 10) {
    const code = generateInviteCode()
    const { data: exists } = await supabase
      .from('languages')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle()
    if (!exists) { invite_code = code; break }
    attempts++
  }

  const { data: lang, error: langError } = await supabase
    .from('languages')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: session.user.id,
      invite_code,
      is_preset: false,
    })
    .select()
    .single()

  if (langError) {
    console.error('Create language error:', langError)
    return { error: 'Failed to create language' }
  }

  // Insert rules
  if (rules?.length > 0) {
    const rulesPayload = rules.map((r, i) => ({
      language_id: lang.id,
      rule_type: r.rule_type,
      rule_config: r.rule_config ?? {},
      sort_order: i,
    }))

    const { error: rulesError } = await supabase.from('rules').insert(rulesPayload)
    if (rulesError) {
      console.error('Rules insert error:', rulesError)
      return { error: 'Language created but rules failed to save' }
    }
  }

  revalidatePath('/languages')
  return { success: true, language: lang }
}

export async function updateLanguageAction(languageId, data) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  // Verify ownership
  const { data: lang } = await supabase
    .from('languages')
    .select('owner_id')
    .eq('id', languageId)
    .single()

  if (lang?.owner_id !== session.user.id) return { error: 'Not your language' }

  const { error: updateError } = await supabase
    .from('languages')
    .update({
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
    .eq('id', languageId)

  if (updateError) return { error: 'Failed to update language' }

  // Replace rules: delete old, insert new
  await supabase.from('rules').delete().eq('language_id', languageId)

  if (data.rules?.length > 0) {
    const rulesPayload = data.rules.map((r, i) => ({
      language_id: languageId,
      rule_type: r.rule_type,
      rule_config: r.rule_config ?? {},
      sort_order: i,
    }))
    await supabase.from('rules').insert(rulesPayload)
  }

  revalidatePath('/languages')
  return { success: true }
}

export async function deleteLanguageAction(languageId) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  const { data: lang } = await supabase
    .from('languages')
    .select('owner_id')
    .eq('id', languageId)
    .single()

  if (lang?.owner_id !== session.user.id) return { error: 'Not your language' }

  const { error } = await supabase.from('languages').delete().eq('id', languageId)
  if (error) return { error: 'Failed to delete language' }

  revalidatePath('/languages')
  return { success: true }
}

export async function joinLanguageAction(inviteCode) {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  if (!inviteCode?.trim()) return { error: 'Invite code is required' }

  const supabase = createServiceClient()

  const { data: lang } = await supabase
    .from('languages')
    .select('id, name, owner_id')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .maybeSingle()

  if (!lang) return { error: 'Invalid invite code' }

  if (lang.owner_id === session.user.id) {
    return { error: 'You own this language already' }
  }

  // Check already joined
  const { data: existing } = await supabase
    .from('language_shares')
    .select('id')
    .eq('language_id', lang.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (existing) return { error: 'You already have access to this language' }

  const { error } = await supabase.from('language_shares').insert({
    language_id: lang.id,
    user_id: session.user.id,
  })

  if (error) return { error: 'Failed to join language' }

  revalidatePath('/languages')
  return { success: true, languageName: lang.name }
}

export async function getLanguagesAction() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated' }

  const supabase = createServiceClient()

  // Get languages this user owns or has a share for, plus presets
  const { data, error } = await supabase
    .from('languages')
    .select(`
      id, name, description, is_preset, owner_id, invite_code,
      rules(id, rule_type, rule_config, sort_order)
    `)
    .or(
      `is_preset.eq.true,owner_id.eq.${session.user.id},id.in.(${
        // subquery workaround: get share IDs inline
        'select language_id from language_shares where user_id = ' + session.user.id
      })`
    )
    .order('is_preset', { ascending: false })
    .order('created_at', { ascending: false })

  // Supabase JS doesn't support subquery strings — do two queries instead
  const { data: myLangs } = await supabase
    .from('languages')
    .select('id, name, description, is_preset, owner_id, invite_code, rules(id, rule_type, rule_config, sort_order)')
    .or(`is_preset.eq.true,owner_id.eq.${session.user.id}`)
    .order('is_preset', { ascending: false })
    .order('created_at', { ascending: false })

  const { data: sharedIds } = await supabase
    .from('language_shares')
    .select('language_id')
    .eq('user_id', session.user.id)

  let sharedLangs = []
  if (sharedIds?.length > 0) {
    const ids = sharedIds.map(s => s.language_id)
    const { data: sl } = await supabase
      .from('languages')
      .select('id, name, description, is_preset, owner_id, invite_code, rules(id, rule_type, rule_config, sort_order)')
      .in('id', ids)
    sharedLangs = sl ?? []
  }

  const all = [...(myLangs ?? []), ...sharedLangs]
  // Deduplicate by id
  const unique = Array.from(new Map(all.map(l => [l.id, l])).values())

  return { languages: unique }
}
