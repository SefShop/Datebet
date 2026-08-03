import webPush from 'web-push'

// SERVER-ONLY. Only ever imported from files under app/api/. Next.js's
// App Router already guarantees route.ts-only imports never reach the
// browser bundle — the same guarantee lib/supabaseServer.ts relies on.

let _configured = false

function ensureConfigured(): boolean {
  if (_configured) return true
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) {
    // Deliberately do not log the values themselves — only whether
    // configuration is present.
    console.error('WEB PUSH: not configured — one or more VAPID env vars are missing')
    return false
  }
  webPush.setVapidDetails(subject, publicKey, privateKey)
  _configured = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, any>
  // Optional — used for notification grouping (message pushes). When
  // set, the service worker uses these to replace/update a prior
  // notification for the same conversation instead of stacking a new
  // one. Unused by test/challenge/challenge-accepted pushes.
  tag?: string
  renotify?: boolean
}

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export type SendResult = 'sent' | 'expired' | 'failed'

// Sends to exactly one subscription and classifies the outcome — the
// caller (the send route) is responsible for iterating a user's
// subscriptions and acting on each result (disabling expired ones,
// counting failures without blocking other devices).
export async function sendPushToSubscription(sub: PushSubscriptionRow, payload: PushPayload): Promise<SendResult> {
  if (!ensureConfigured()) return 'failed'
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return 'sent'
  } catch (e: any) {
    const statusCode = e?.statusCode
    if (statusCode === 404 || statusCode === 410) return 'expired'
    // Never log endpoint/keys — only the error message and which
    // subscription id failed, for operational visibility without
    // exposing anything sensitive.
    console.error('WEB PUSH send failed for subscription', sub.id, ':', e?.message)
    return 'failed'
  }
}
