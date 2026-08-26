// Shared device classification for the desktop-vs-mobile experience gate
// used by app/app/page.tsx and app/landing/page.tsx.
//
// This is intentionally device classification, NOT responsive/viewport
// detection: resizing a real desktop/laptop browser window — even to a
// very narrow width — must never switch it into the mobile experience.
// Only an actual mobile phone browser should ever receive the mobile UI.
// Do not reintroduce a matchMedia/innerWidth width check here.
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  // Preferred signal: the User-Agent Client Hints API tells us directly
  // whether the browser identifies its underlying platform as mobile.
  // Supported in Chromium-based browsers (desktop Chrome/Edge on
  // Windows/macOS/Linux report `mobile: false` regardless of window size).
  const uaData = (navigator as any).userAgentData
  if (uaData && typeof uaData.mobile === 'boolean') {
    return uaData.mobile
  }

  // Conservative fallback for browsers without userAgentData (Safari,
  // Firefox, older browsers): match known phone/mobile browser user
  // agents only. Deliberately does NOT match generic desktop UAs, and
  // iPadOS Safari (which reports itself as "Macintosh") correctly falls
  // through to desktop here, same as any other desktop browser.
  const ua = navigator.userAgent || ''
  return /Android.+Mobile|iPhone|iPod|Windows Phone|BlackBerry|BB10|IEMobile|Opera Mini/i.test(ua)
}
