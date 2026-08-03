// DateDuel Service Worker — Web Push Phase 1 only.
//
// Scope, deliberately: receive a push payload, display a notification,
// and handle clicking it (focus an existing DateDuel window, or open a
// new one). No offline caching, no asset precaching, no broader PWA
// behavior — that is explicitly out of scope for this phase.

self.addEventListener('install', () => {
  // Activate this worker as soon as it finishes installing, without
  // waiting for old tabs to close — safe here since there is no cache
  // versioning to worry about (no caching happens at all in this phase).
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = { title: 'DateDuel', body: 'Test notification', data: { type: 'test', target: '/app' }, tag: undefined, renotify: undefined }
  try {
    if (event.data) {
      const parsed = event.data.json()
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        data: parsed.data || payload.data,
        tag: parsed.tag,
        renotify: parsed.renotify,
      }
    }
  } catch (e) {
    // Payload wasn't valid JSON — fall back to the generic test payload
    // above rather than failing to show anything at all.
  }

  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data,
  }
  // Only set when present (message pushes) — an undefined tag/renotify
  // is simply omitted, leaving test/challenge/challenge-accepted
  // notifications completely unaffected (each still gets its own,
  // untagged notification, exactly as before).
  if (payload.tag) options.tag = payload.tag
  if (payload.renotify !== undefined) options.renotify = payload.renotify

  event.waitUntil(self.registration.showNotification(payload.title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const target = data.target || '/app'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Prefer an already-open DateDuel window if one exists, focusing
      // it instead of opening a duplicate tab — and pass along the
      // routing data via postMessage so the running app can navigate
      // without a reload.
      for (const client of clientList) {
        if (client.url.includes('/app') && 'focus' in client) {
          client.postMessage({ type: 'push-click', data })
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        // No existing window — postMessage isn't available before the
        // page exists, so the routing signal travels as a one-time
        // query parameter instead, read once on app load and then
        // cleared (see app/app/page.tsx).
        const url = new URL(target, self.location.origin)
        if (data.type) url.searchParams.set('push_type', data.type)
        if (data.inviteId) url.searchParams.set('push_invite', data.inviteId)
        if (data.senderId) url.searchParams.set('push_sender', data.senderId)
        return self.clients.openWindow(url.pathname + url.search)
      }
    })
  )
})
