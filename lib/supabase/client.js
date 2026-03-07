'use client'

import { createBrowserClient } from '@supabase/ssr'

// Singleton pattern — one client instance for the whole browser session
let client

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return client
}
