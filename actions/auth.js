'use server'

import { signIn } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export async function signUpAction(formData) {
  const username = formData.get('username')?.toString().toLowerCase().trim()
  const password = formData.get('password')?.toString()

  if (!username || !password) {
    return { error: 'Username and password are required' }
  }

  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 characters (letters, numbers, _ -)' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const supabase = createServiceClient()

  // Check username taken
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existing) {
    return { error: 'Username already taken' }
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { error } = await supabase.from('profiles').insert({
    username,
    password_hash,
  })

  if (error) {
    console.error('Signup error:', error)
    return { error: 'Failed to create account' }
  }

  // Auto sign in after signup
  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: '/dashboard',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Account created but sign-in failed. Please sign in manually.' }
    }
    throw err
  }
}

export async function signInAction(formData) {
  const username = formData.get('username')?.toString().toLowerCase().trim()
  const password = formData.get('password')?.toString()

  if (!username || !password) {
    return { error: 'Username and password are required' }
  }

  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: '/dashboard',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Invalid username or password' }
    }
    throw err
  }
}
