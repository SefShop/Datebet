import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    // Authenticate the caller via their existing Supabase session token —
    // user_id is derived ONLY from this, never accepted from the request
    // body. An unauthenticated or invalid token is rejected outright.
    const userId = await verifyBearerToken(req.headers.get('authorization'))
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const endpoint: string | undefined = body?.endpoint
    const p256dh: string | undefined = body?.keys?.p256dh ?? body?.p256dh
    const authKey: string | undefined = body?.keys?.auth ?? body?.auth
    const deviceLabel: string | null = typeof body?.deviceLabel === 'string' ? body.deviceLabel : null

    if (!endpoint || typeof endpoint !== 'string' || !p256dh || typeof p256dh !== 'string' || !authKey || typeof authKey !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid endpoint, p256dh, or auth' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    if (!client) {
      console.error('PUSH SUBSCRIBE: service-role client unavailable (missing env var)')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Upsert by endpoint (unique) — re-subscribing the same device updates
    // its row rather than creating a duplicate. A DIFFERENT device/browser
    // has a different endpoint, so it always creates its own additional
    // row for the same user_id — multi-device subscriptions are preserved
    // by construction, not by any special-case logic here.
    const { error } = await client.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint,
      p256dh,
      auth: authKey,
      device_label: deviceLabel,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

    if (error) {
      console.error('PUSH SUBSCRIBE error:', error.message)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    console.log('PUSH SUBSCRIBED:', userId)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('PUSH SUBSCRIBE error:', e?.message)
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
  }
}
