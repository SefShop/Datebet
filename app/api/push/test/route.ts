import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'
import { sendPushToSubscription, PushPayload } from '@/lib/webPush'

export const runtime = 'nodejs'

// Fixed, server-owned copy — the client can only select which of these
// two entries to use (via `lang`), never supply its own title/body text.
const TEST_PAYLOADS: Record<'en' | 'gr', PushPayload> = {
  en: { title: 'DateDuel', body: 'Push notifications are working.', data: { type: 'test', target: '/app' } },
  gr: { title: 'DateDuel', body: 'Οι ειδοποιήσεις λειτουργούν σωστά.', data: { type: 'test', target: '/app' } },
}

export async function POST(req: NextRequest) {
  try {
    // Same authentication pattern as Phase 1's subscribe/unsubscribe
    // routes — user_id comes ONLY from the verified token, never from
    // the request body.
    const userId = await verifyBearerToken(req.headers.get('authorization'))
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // `lang` is the only client-supplied input this route accepts, and
    // it only ever selects between two fixed, server-defined payloads
    // above — it is never interpolated into notification content.
    let lang: 'en' | 'gr' = 'en'
    try {
      const body = await req.json()
      if (body?.lang === 'gr') lang = 'gr'
    } catch { /* no body is fine — defaults to 'en' */ }

    const payload = TEST_PAYLOADS[lang]

    const client = getServiceRoleClient()
    if (!client) {
      console.error('PUSH TEST: service-role client unavailable (missing env var)')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Scoped to exactly this authenticated user's enabled subscriptions
    // — never any other user's, and never a disabled/previously-expired
    // device.
    const { data: subs, error: fetchError } = await client
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId)
      .eq('enabled', true)

    if (fetchError) {
      console.error('PUSH TEST fetch error:', fetchError.message)
      return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
    }

    let sent = 0, failed = 0, removed = 0

    for (const sub of subs || []) {
      const result = await sendPushToSubscription(sub, payload)
      if (result === 'sent') {
        sent++
      } else if (result === 'expired') {
        // Disable (not delete) — same soft-removal pattern Phase 1's
        // unsubscribe route uses, so a re-subscribe later can reuse the
        // row rather than accumulating stale duplicates.
        await client.from('push_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() }).eq('id', sub.id)
        removed++
      } else {
        // Temporary/unknown failure — do not delete, do not retry here.
        // One failed device must not block delivery to the user's
        // other devices, which the loop already guarantees by continuing.
        failed++
      }
    }

    console.log('PUSH TEST SENT:', userId, { sent, failed, removed })
    return NextResponse.json({ sent, failed, removed })
  } catch (e: any) {
    console.error('PUSH TEST error:', e?.message)
    return NextResponse.json({ error: 'Test send failed' }, { status: 500 })
  }
}
