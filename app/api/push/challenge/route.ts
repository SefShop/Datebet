import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'
import { sendPushToSubscription, PushPayload } from '@/lib/webPush'

export const runtime = 'nodejs'

// Mirrors the exact, existing name map from components/screens/ActivityScreen.tsx
// (gameLabel()) — not invented here, just duplicated since that file is a
// client component and can't be imported into a server route.
const SUPPORTED_GAME_TYPES = ['tic_tac_toe', 'connect_4', 'mystery_choice']
function gameDisplayName(gameType: string): string {
  if (gameType === 'connect_4') return 'Connect 4'
  if (gameType === 'mystery_choice') return 'Mystery Choice'
  return 'Tic Tac Toe'
}

function buildPayload(senderName: string, gameType: string, lang: 'en' | 'gr', inviteId: string): PushPayload {
  const game = gameDisplayName(gameType)
  const title = lang === 'gr' ? 'Νέα πρόκληση 🎮' : 'New challenge 🎮'
  const body = lang === 'gr' ? `Ο/Η ${senderName} σε προκάλεσε σε ${game}.` : `${senderName} challenged you to ${game}.`
  return { title, body, data: { type: 'challenge', target: '/app', inviteId } }
}

export async function POST(req: NextRequest) {
  try {
    // Same authentication pattern as Phase 1/2 — the sender's identity
    // comes ONLY from the verified token, never from the request body.
    const senderId = await verifyBearerToken(req.headers.get('authorization'))
    if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // The browser may send only inviteId and an optional lang selector —
    // nothing else is read from the body at all.
    const body = await req.json().catch(() => ({}))
    const inviteId: string | undefined = body?.inviteId
    const lang: 'en' | 'gr' = body?.lang === 'gr' ? 'gr' : 'en'
    if (!inviteId || typeof inviteId !== 'string') {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    if (!client) {
      console.error('PUSH CHALLENGE: service-role client unavailable (missing env var)')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // ── Server-side invite verification — every fact re-checked against
    // the database, nothing taken on the browser's word beyond which
    // inviteId to look up. ──
    const { data: invite, error: inviteError } = await client
      .from('game_invites')
      .select('id, sender_id, receiver_id, game_type, status, original_session_id')
      .eq('id', inviteId)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    if (invite.sender_id !== senderId) {
      // The authenticated caller is not this invite's sender — never
      // allow submitting a push trigger for someone else's invite.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!invite.receiver_id || invite.receiver_id === invite.sender_id) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Invite is not pending' }, { status: 400 })
    }
    if (invite.original_session_id) {
      // This is a Play Again / rematch invite, not a brand-new
      // challenge — Phase 3 explicitly excludes these.
      return NextResponse.json({ error: 'Not a new challenge' }, { status: 400 })
    }
    if (!SUPPORTED_GAME_TYPES.includes(invite.game_type)) {
      return NextResponse.json({ error: 'Unsupported game type' }, { status: 400 })
    }

    const { data: senderProfile } = await client.from('profiles').select('name').eq('id', senderId).maybeSingle()
    const senderName = senderProfile?.name || 'Someone'

    // ── Idempotency: the unique constraint on push_notification_log is
    // the actual mechanism, not an in-memory or pre-check flag. Whoever
    // wins this insert is the only caller that proceeds to send. ──
    const { error: logError } = await client.from('push_notification_log').insert({
      event_type: 'new_challenge',
      event_id: invite.id,
      recipient_id: invite.receiver_id,
    })
    if (logError) {
      if (logError.code === '23505') {
        console.log('PUSH CHALLENGE: duplicate event, already sent:', invite.id)
        return NextResponse.json({ sent: 0, failed: 0, removed: 0, duplicate: true })
      }
      console.error('PUSH CHALLENGE log error:', logError.message)
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
    }

    const payload = buildPayload(senderName, invite.game_type, lang, invite.id)

    const { data: subs, error: subsError } = await client
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', invite.receiver_id)
      .eq('enabled', true)

    if (subsError) {
      console.error('PUSH CHALLENGE subs fetch error:', subsError.message)
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

    console.log('PUSH CHALLENGE SENT:', invite.id, { sent, failed, removed })
    return NextResponse.json({ sent, failed, removed, duplicate: false })
  } catch (e: any) {
    console.error('PUSH CHALLENGE error:', e?.message)
    return NextResponse.json({ error: 'Challenge push failed' }, { status: 500 })
  }
}
