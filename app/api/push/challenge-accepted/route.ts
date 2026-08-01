import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken, getServiceRoleClient } from '@/lib/supabaseServer'
import { sendPushToSubscription, PushPayload } from '@/lib/webPush'

export const runtime = 'nodejs'

// Mirrors the exact, existing name map from components/screens/ActivityScreen.tsx
// (gameLabel()) — duplicated here since that file is a client component
// and can't be imported into a server route. Same list as Phase 3.
const SUPPORTED_GAME_TYPES = ['tic_tac_toe', 'connect_4', 'mystery_choice']
function gameDisplayName(gameType: string): string {
  if (gameType === 'connect_4') return 'Connect 4'
  if (gameType === 'mystery_choice') return 'Mystery Choice'
  return 'Tic Tac Toe'
}

function buildPayload(receiverName: string, gameType: string, lang: 'en' | 'gr', inviteId: string): PushPayload {
  const game = gameDisplayName(gameType)
  const title = lang === 'gr' ? 'Η πρόκληση έγινε αποδεκτή! ✅' : 'Challenge accepted! ✅'
  const body = lang === 'gr'
    ? `Ο/Η ${receiverName} αποδέχτηκε την πρόκλησή σου για ${game}.`
    : `${receiverName} accepted your ${game} challenge.`
  return { title, body, data: { type: 'challenge_accepted', target: '/app', inviteId } }
}

export async function POST(req: NextRequest) {
  try {
    // The authenticated caller must be the invite's RECEIVER — the
    // person who just accepted — never the sender, and never a
    // client-supplied id.
    const receiverId = await verifyBearerToken(req.headers.get('authorization'))
    if (!receiverId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const inviteId: string | undefined = body?.inviteId
    const lang: 'en' | 'gr' = body?.lang === 'gr' ? 'gr' : 'en'
    if (!inviteId || typeof inviteId !== 'string') {
      return NextResponse.json({ error: 'Missing inviteId' }, { status: 400 })
    }

    const client = getServiceRoleClient()
    if (!client) {
      console.error('PUSH CHALLENGE-ACCEPTED: service-role client unavailable (missing env var)')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // ── Server-side validation — every fact re-checked against the
    // database, nothing taken on the browser's word beyond which
    // inviteId to look up. ──
    const { data: invite, error: inviteError } = await client
      .from('game_invites')
      .select('id, sender_id, receiver_id, game_type, status, original_session_id')
      .eq('id', inviteId)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }
    if (invite.receiver_id !== receiverId) {
      // The authenticated caller is not this invite's receiver — never
      // let the original sender (or anyone else) trigger this on
      // someone else's acceptance.
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!invite.sender_id || invite.sender_id === invite.receiver_id) {
      return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
    }
    if (invite.status !== 'accepted') {
      return NextResponse.json({ error: 'Invite is not accepted' }, { status: 400 })
    }
    if (invite.original_session_id) {
      // Rematch/Play Again — Phase 4 explicitly excludes these, same as
      // Phase 3 excludes them for the new-challenge push.
      return NextResponse.json({ error: 'Not a new challenge' }, { status: 400 })
    }
    if (!SUPPORTED_GAME_TYPES.includes(invite.game_type)) {
      return NextResponse.json({ error: 'Unsupported game type' }, { status: 400 })
    }

    const { data: receiverProfile } = await client.from('profiles').select('name').eq('id', receiverId).maybeSingle()
    const receiverName = receiverProfile?.name || 'Someone'

    // ── Idempotency — same push_notification_log table as Phase 3, a
    // distinct event_type is what keeps this independent from the
    // new-challenge event for the same invite, per the task's explicit
    // instruction not to create a second table. ──
    const { error: logError } = await client.from('push_notification_log').insert({
      event_type: 'challenge_accepted',
      event_id: invite.id,
      recipient_id: invite.sender_id,
    })
    if (logError) {
      if (logError.code === '23505') {
        console.log('PUSH CHALLENGE-ACCEPTED: duplicate event, already sent:', invite.id)
        return NextResponse.json({ sent: 0, failed: 0, removed: 0, duplicate: true })
      }
      console.error('PUSH CHALLENGE-ACCEPTED log error:', logError.message)
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
    }

    const payload = buildPayload(receiverName, invite.game_type, lang, invite.id)

    // Recipient is exclusively invite.sender_id — the original sender.
    const { data: subs, error: subsError } = await client
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', invite.sender_id)
      .eq('enabled', true)

    if (subsError) {
      console.error('PUSH CHALLENGE-ACCEPTED subs fetch error:', subsError.message)
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

    console.log('PUSH CHALLENGE-ACCEPTED SENT:', invite.id, { sent, failed, removed })
    return NextResponse.json({ sent, failed, removed, duplicate: false })
  } catch (e: any) {
    console.error('PUSH CHALLENGE-ACCEPTED error:', e?.message)
    return NextResponse.json({ error: 'Challenge-accepted push failed' }, { status: 500 })
  }
}
