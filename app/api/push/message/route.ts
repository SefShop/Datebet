import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'
import { sendPushToSubscription, PushPayload } from '@/lib/webPush'
import { deriveUnlockState, sortPair } from '@/lib/pairProgress'

export const runtime = 'nodejs'

// Active-chat rows older than this are no longer trusted as "currently
// viewing" — the shortest safe value above the 12s client heartbeat
// interval, within the requested 20-30s range.
const ACTIVE_CHAT_STALE_MS = 25 * 1000

function buildPayload(senderName: string, lang: 'en' | 'gr', senderId: string, messageId: string, conversationKey: string, unreadCount: number | null): PushPayload {
  let title: string
  let body: string
  if (unreadCount !== null && unreadCount > 1) {
    title = lang === 'gr' ? `${unreadCount} νέα μηνύματα 💬` : `${unreadCount} new messages 💬`
    body = lang === 'gr' ? `Από τον/την ${senderName}.` : `From ${senderName}.`
  } else {
    title = lang === 'gr' ? 'Νέο μήνυμα 💬' : 'New message 💬'
    body = lang === 'gr' ? `Ο/Η ${senderName} σου έστειλε μήνυμα.` : `${senderName} sent you a message.`
  }
  return {
    title, body,
    tag: `message-${conversationKey}`,
    renotify: true,
    data: { type: 'message', target: '/app', senderId, messageId },
  }
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
    // distinct event_type from Phase 3/4's rows. Claimed BEFORE the
    // active-chat suppression check below, so a retry for this exact
    // messageId always correctly returns duplicate: true, regardless of
    // whether the first attempt sent or was suppressed. ──
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

    // ── Active-chat suppression — a trustworthy, server-visible check.
    // The recipient's own client (never the sender's) writes this row
    // about itself; nothing here is taken on the sender's word.
    //
    // LIMITATION: this is logical (all-device), not per-device.
    // Mapping a specific push_subscriptions row to the specific device
    // currently viewing the chat would require associating each
    // subscription with the same stable device_key used here — a
    // schema/route change to the existing, already-working
    // subscribe/unsubscribe flow. That wasn't made in this change; if
    // the recipient is actively viewing this exact conversation on ANY
    // of their currently-active sessions, the push is withheld from
    // ALL of their enabled devices, not just the one currently looking
    // at it. For the common case (one active device at a time) this
    // behaves identically to true per-device suppression. ──
    const staleCutoff = new Date(Date.now() - ACTIVE_CHAT_STALE_MS).toISOString()
    const { data: activeChatRows } = await client
      .from('active_chat_presence')
      .select('id')
      .eq('user_id', message.receiver_id)
      .eq('other_user_id', senderId)
      .eq('active', true)
      .gte('last_seen', staleCutoff)
      .limit(1)

    if (activeChatRows && activeChatRows.length > 0) {
      console.log('PUSH MESSAGE: suppressed — recipient actively viewing this chat:', message.id)
      return NextResponse.json({ sent: 0, failed: 0, removed: 0, duplicate: false, suppressed: true })
    }

    // ── Unread count — derived from the database, never trusted from
    // the client. Used only to choose between the singular/grouped
    // templates above; the read-receipt field and logic themselves are
    // completely unchanged. ──
    const { count: unreadCount } = await client
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', message.receiver_id)
      .is('read_at', null)

    const conversationKey = `${one}-${two}`
    const payload = buildPayload(senderName, lang, senderId, message.id, conversationKey, unreadCount ?? null)

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
