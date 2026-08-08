/**
 * TEMPORARY DIAGNOSTIC MODULE — shared invite/session-resolution tracing.
 *
 * This module has ZERO effect on session-resolution behavior — every
 * call site is purely additive logging around the EXISTING
 * setCurrentSession() calls in lib/gameInvites.ts. Nothing here changes
 * which session gets published or when.
 *
 * Gated behind the same NEXT_PUBLIC_C4_DIAGNOSTICS flag already used for
 * the Connect 4 startup trace (see lib/c4StartDiag.ts) — reused here
 * rather than adding a second flag, since both exist for the same
 * upstream investigation.
 *
 * A separate, larger buffer (1000 entries vs the existing 200) — the
 * previous shared buffer evicted the critical [C4_START_SESSION] events
 * before a freeze could be captured, since session/invite transitions
 * are much lower-frequency than the per-poll startup events, so a
 * dedicated buffer for them alone can hold a much longer history without
 * needing a larger cap for the noisier per-poll trace too.
 *
 * Collect via: window.__dateduelSessionResolutionDiagnostics()
 *
 * Never logs access/refresh tokens, emails, the service role key, or any
 * other secret — only session/user/invite UUIDs and game-type strings.
 */

import { C4_DIAGNOSTICS_ENABLED } from './c4StartDiag'

const MAX_BUFFER_SIZE = 1000

interface SessionResolutionDiagEntry {
  timestamp: string
  data: Record<string, unknown>
}

const buffer: SessionResolutionDiagEntry[] = []
let windowExposureAttached = false

function ensureWindowExposure() {
  if (windowExposureAttached || typeof window === 'undefined') return
  windowExposureAttached = true
  ;(window as any).__dateduelSessionResolutionDiagnostics = () => buffer.slice()
}

export function sessionResolutionDiag(data: Record<string, unknown>) {
  if (!C4_DIAGNOSTICS_ENABLED) return
  ensureWindowExposure()

  const entry: SessionResolutionDiagEntry = {
    timestamp: new Date().toISOString(),
    data,
  }
  buffer.push(entry)
  if (buffer.length > MAX_BUFFER_SIZE) buffer.shift()

  console.log('[SESSION_RESOLUTION_DIAG]', JSON.stringify({ timestamp: entry.timestamp, ...data }))
}
