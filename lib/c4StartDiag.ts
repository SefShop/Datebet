/**
 * TEMPORARY DIAGNOSTIC MODULE — Connect 4 game-start handshake only.
 *
 * Phase A: diagnose-only. This module has ZERO effect on game behavior —
 * every call site is purely additive logging. Nothing here reads a
 * value, makes a decision, or returns something that any existing logic
 * branches on.
 *
 * Enabled when:
 *   - process.env.NODE_ENV !== 'production', OR
 *   - NEXT_PUBLIC_C4_DIAGNOSTICS=true is explicitly set (for reproducing
 *     the issue against a real Vercel production build, where it's
 *     otherwise off by default).
 *
 * Collect logs after a freeze via:
 *   window.__dateduelC4Diagnostics()
 * — returns the buffered entries (newest last), safe to copy out of the
 * console. Also every entry is still individually console.log'd as it
 * happens, for live tailing.
 *
 * Never logs access/refresh tokens, emails, the service role key, VAPID
 * keys, message contents, or any other secret — only session/user UUIDs,
 * game status strings, and readiness-related booleans/arrays of UUIDs.
 */

export const C4_DIAGNOSTICS_ENABLED =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_C4_DIAGNOSTICS === 'true'

const MAX_BUFFER_SIZE = 200

interface C4DiagEntry {
  timestamp: string
  event: string
  data: Record<string, unknown>
}

const buffer: C4DiagEntry[] = []
let windowExposureAttached = false

// TEMPORARY DIAGNOSTIC — logs once, unconditionally (deliberately NOT
// gated by C4_DIAGNOSTICS_ENABLED), the very first time this module is
// evaluated on the client. Its whole purpose is to make the actual,
// resolved value of the flag directly visible in the console — so it's
// possible to tell, empirically, whether NEXT_PUBLIC_C4_DIAGNOSTICS was
// genuinely inlined as "true" by the build that's currently serving
// production traffic, rather than guessing. Logs no secrets — only the
// flag's own name/value.
if (typeof window !== 'undefined') {
  console.log('[C4_DIAGNOSTICS_MODULE_LOADED]', JSON.stringify({
    resolvedEnabled: C4_DIAGNOSTICS_ENABLED,
    nodeEnv: process.env.NODE_ENV,
    rawFlagValue: process.env.NEXT_PUBLIC_C4_DIAGNOSTICS ?? null,
  }))
}

// Attaches window.__dateduelC4Diagnostics lazily, the first time any
// diagnostic actually fires on the client — rather than relying on this
// module's own top-level code running at the right time/place (a
// module-load-order side effect is more fragile than doing the
// attachment at the moment it's actually needed). Idempotent — safe to
// call on every c4StartDiag() invocation.
function ensureWindowExposure() {
  if (windowExposureAttached || typeof window === 'undefined') return
  windowExposureAttached = true
  ;(window as any).__dateduelC4Diagnostics = () => buffer.slice()
  console.log('[C4_DIAGNOSTICS_WINDOW_EXPOSED]', JSON.stringify({ bufferSizeAtAttach: buffer.length }))
}

export function c4StartDiag(event: string, data: Record<string, unknown> = {}) {
  if (!C4_DIAGNOSTICS_ENABLED) return
  ensureWindowExposure()

  const entry: C4DiagEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
  }

  buffer.push(entry)
  if (buffer.length > MAX_BUFFER_SIZE) buffer.shift()

  console.log(`[${event}]`, JSON.stringify({ timestamp: entry.timestamp, ...data }))
}
