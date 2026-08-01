import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const userId = await verifyBearerToken(req.headers.get('authorization'))
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const endpoint: string | undefined = body?.endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    if (!client) {
      console.error('PUSH UNSUBSCRIBE: service-role client unavailable (missing env var)')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Disable (not delete) — preserves the row in case of re-enabling
    // later, using the existing `enabled` column exactly for this.
    // Scoped by endpoint AND user_id together: the service-role client
    // bypasses RLS, so this explicit match is what guarantees a request
    // can only ever affect the CALLING user's own device row, never
    // another user's — even though endpoint alone is already unique.
    const { error, count } = await client
      .from('push_subscriptions')
      .update({ enabled: false, updated_at: new Date().toISOString() }, { count: 'exact' })
      .eq('endpoint', endpoint)
      .eq('user_id', userId)

    if (error) {
      console.error('PUSH UNSUBSCRIBE error:', error.message)
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }

    console.log('PUSH UNSUBSCRIBED:', userId, 'rows affected:', count)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('PUSH UNSUBSCRIBE error:', e?.message)
    return NextResponse.json({ error: 'Unsubscribe failed' }, { status: 500 })
  }
}
