import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const isSupabaseConfigured = () => !!url && !!key

// Guard: don't crash if env vars missing during build/prerender
export const supabase: SupabaseClient = url && key
  ? createClient(url, key)
  : createClient('https://placeholder.supabase.co', 'placeholder')
