import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ── Feature detection & state ───────────────────────────────────────

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

// iOS Safari can only receive Web Push when the app has been added to
// the Home Screen and is running in standalone display mode — a plain
// Safari tab cannot subscribe at all, even with permission granted.
export function isIOSNonStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
  const isStandalone = (window.navigator as any).standalone === true
    || window.matchMedia?.('(display-mode: standalone)').matches
  return isIOS && !isStandalone
}

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied'

export function getPushPermissionState(): PushPermissionState {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission as PushPermissionState
}

// ── Existing subscription lookup ────────────────────────────────────

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return null
    return await reg.pushManager.getSubscription()
  } catch { return null }
}

// ── VAPID key conversion (standard utility) ─────────────────────────

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray as BufferSource
}

// ── Enable / disable ─────────────────────────────────────────────────
// enablePushForThisDevice() must only ever be called from an explicit
// user action (e.g. a button's onClick in Settings) — it calls
// Notification.requestPermission() directly, and browsers require that
// to originate from a user gesture. It is never called automatically on
// page load anywhere in this codebase.

export async function enablePushForThisDevice(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'unsupported' }
  if (isIOSNonStandalone()) return { ok: false, error: 'ios_not_installed' }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return { ok: false, error: 'missing_vapid_key' }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, error: permission }

    // Reuse an existing subscription if one is already present, rather
    // than creating a duplicate for the same device.
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return { ok: false, error: 'not_authenticated' }

    const subJson = sub.toJSON()
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: subJson.keys,
        deviceLabel: navigator.userAgent.slice(0, 120),
      }),
    })
    if (!res.ok) return { ok: false, error: 'server_error' }

    console.log('PUSH ENABLED FOR THIS DEVICE')
    return { ok: true }
  } catch (e: any) {
    console.error('enablePushForThisDevice:', e?.message)
    return { ok: false, error: 'exception' }
  }
}

export async function disablePushForThisDevice(): Promise<{ ok: boolean }> {
  try {
    const sub = await getExistingSubscription()
    if (!sub) return { ok: true }  // nothing to disable

    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {})
      }
    }

    await sub.unsubscribe()  // also unsubscribe at the browser level for this device
    console.log('PUSH DISABLED FOR THIS DEVICE')
    return { ok: true }
  } catch (e: any) {
    console.error('disablePushForThisDevice:', e?.message)
    return { ok: false }
  }
}
