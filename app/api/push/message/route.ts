import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'
import { sendPushToSubscription, PushPayload } from '@/lib/webPush'
import { deriveUnlockState, sortPair } from '@/lib/pairProgress'

export const runtime = 'nodejs'

function buildPayload(senderName: string, lang: 'en' | 'gr', senderId: string, messageId: string): PushPayload {
  const title = lang === 'gr' ? 'Νέο μήνυμα 💬' : 'New message 💬'
  const body = lang === 'gr' ? `Ο/Η ${senderName} σου έστειλε μήνυμα.` : `${senderName} sent you a message.`
  return { title, body, data: { type: 'message', target: '/app', senderId, messageId } }
}

export async function POST(req: NextRequest) {
  try {
    const senderId = await verifyBearerToken(req.headers.get('authorization'))
    if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const messageId: string | undefined = body?.messageId
    const lang: 'en' | 'gr' = body?.lang === 'gr' ? 'gr' : 'en'
    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    if (!client) {
      console.error('PUSH MESSAGE: service-role client unavailable (missing env var)')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // ── Server-side message verification — every fact re-checked
    // against the database, nothing taken on the browser's word beyond
    // which messageId to look up. ──
    const { data: message, error: messageError } = await client
      .from('messages')
      .select('id, sender_id, receiver_id')
      .eq('id', messageId)
      .maybeSingle()

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }
    if (message.sender_id !== senderId) {
      // The authenticated caller is not this message's sender — never
      // allow triggering a push for someone else's message.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!message.receiver_id || message.receiver_id === message.sender_id) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 400 })
    }

    // ── Chat-unlock verification — the exact existing rule, imported
    // directly rather than re-implemented, so there is no second/parallel
    // unlock rule to drift out of sync with the real one. Reads directly
    // from pair_progress, the same table getPairProgress() itself reads. ──
    const [one, two] = sortPair(message.sender_id, message.receiver_id)
    const { data: pairRows } = await client
      .from('pair_progress')
      .select('games_completed')
      .eq('user_one_id', one)
      .eq('user_two_id', two)
      .order('games_completed', { ascending: false })
    const gamesCompleted = pairRows && pairRows.length > 0 ? pairRows[0].games_completed : 0
    const { chat_unlocked } = deriveUnlockState(gamesCompleted)
    if (!chat_unlocked) {
      // Do not reveal *why* — just that this can't proceed. No pair
      // count, no unlock state, no private data in the response.
      return NextResponse.json({ error: 'Chat is not unlocked for this pair' }, { status: 403 })
    }

    const { data: senderProfile } = await client.from('profiles').select('name').eq('id', senderId).maybeSingle()
    const senderName = senderProfile?.name || 'Someone'

    // ── Idempotency — the existing push_notification_log table, a
    // distinct event_type from Phase 3/4's rows. ──
    const { error: logError } = await client.from('push_notification_log').insert({
      event_type: 'new_message',
      event_id: message.id,
      recipient_id: message.receiver_id,
    })
    if (logError) {
      if (logError.code === '23505') {
        console.log('PUSH MESSAGE: duplicate event, already sent:', message.id)
        return NextResponse.json({ sent: 0, failed: 0, removed: 0, duplicate: true })
      }
      console.error('PUSH MESSAGE log error:', logError.message)
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
    }

    const payload = buildPayload(senderName, lang, senderId, message.id)

    const { data: subs, error: subsError } = await client
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', message.receiver_id)
      .eq('enabled', true)

    if (subsError) {
      console.error('PUSH MESSAGE subs fetch error:', subsError.message)
      return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 })
    }

    let sent = 0, failed = 0, removed = 0
    for (const sub of subs || []) {
      const result = await sendPushToSubscription(sub, payload)
      if (result === 'sent') {
        sent++
      } else if (result === 'expired') {
        await client.from('push_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() }).eq('id', sub.id)
        removed++
      } else {
        failed++
      }
    }

    console.log('PUSH MESSAGE SENT:', message.id, { sent, failed, removed })
    return NextResponse.json({ sent, failed, removed, duplicate: false })
  } catch (e: any) {
    console.error('PUSH MESSAGE error:', e?.message)
    return NextResponse.json({ error: 'Message push failed' }, { status: 500 })
  }
}
