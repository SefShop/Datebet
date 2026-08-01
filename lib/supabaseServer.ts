import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY. This file must only ever be imported from files under
// app/api/ (route.ts). Next.js's App Router already guarantees route
// handlers are compiled into a separate, server-only bundle — nothing
// imported exclusively from a route.ts file ever reaches the browser.
// The same guarantee the existing app/api/translate-bio/route.ts relies
// on. Do not import this file from any client component.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Service-role client — bypasses RLS. Used only after the caller has
// already been authenticated via verifyBearerToken() below, and only to
// act on that verified user's own id — never to fulfill a client-
// supplied user_id.
export function getServiceRoleClient() {
  if (!url || !serviceRoleKey) return null
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}

// Validates an Authorization: Bearer <token> header against Supabase
// Auth using the public anon key (this only verifies the token — it
// does not need or use the service-role key). Returns the authenticated
// user's id, or null if the token is missing/invalid/expired. This is
// the ONLY source of user_id for the push API routes — never accept an
// id supplied directly by the request body.
export async function verifyBearerToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ') || !url || !anonKey) return null
  const token = authHeader.slice('Bearer '.length)
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user?.id) return null
  return data.user.id
}
