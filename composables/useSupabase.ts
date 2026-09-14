import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function useSupabase() {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const key = config.public.supabaseKey as string

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY in runtime config')
  }

  client = createClient(url, key)
  return client
}
