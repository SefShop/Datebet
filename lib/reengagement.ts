// ─────────────────────────────────────────────────────────────────
// Re-engagement Engine
//
// Detects how long the user was away and crafts a return experience
// that makes them feel like something happened in their absence.
//
// Key design rule: the messages are TRUE in the sense that they
// reference real session state (did they start a game? place a bet?).
// We layer fake "world events" on top to create tension.
// ─────────────────────────────────────────────────────────────────

import { AbsenceTier, ReturnState } from '@/types'

const STORAGE_KEY = 'dateduel_last_seen'
const SESSION_KEY = 'dateduel_session_state'

// ── Time tiers ─────────────────────────────────────────────────
// fresh     = < 2 min (same session, page refresh)
// short     = 2–30 min
// medium    = 30 min – 6 hours
// long      = 6–24 hours
// very_long = 24h+

export function classifyAbsence(ms: number): AbsenceTier {
  if (ms < 2 * 60_000)        return 'fresh'
  if (ms < 30 * 60_000)       return 'short'
  if (ms < 6 * 3_600_000)     return 'medium'
  if (ms < 24 * 3_600_000)    return 'long'
  return 'very_long'
}

function fmt(ms: number): string {
  const m = Math.floor(ms / 60_000)
  const h = Math.floor(ms / 3_600_000)
  if (m < 60)  return `${m} min`
  if (h < 24)  return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Copy pools per tier ────────────────────────────────────────

interface CopySet { headline: string; sub: string; cta: string; event: string }

const COPY: Record<AbsenceTier, CopySet[]> = {
  fresh: [
    // Not shown — too soon, don't interrupt
  ],
  short: [
    {
      headline: "you left at an interesting moment.",
      sub:      "things moved without you.",
      cta:      "see what happened →",
      event:    "Sofia checked her phone twice.",
    },
    {
      headline: "she came back. you didn't.",
      sub:      "for a few minutes, at least.",
      cta:      "pick up where it left off →",
      event:    "Sofia reopened the app.",
    },
    {
      headline: "something shifted while you were gone.",
      sub:      "brief absence. still noticed.",
      cta:      "find out →",
      event:    "A new match appeared in your queue.",
    },
  ],
  medium: [
    {
      headline: "you've been gone a while.",
      sub:      "she noticed. not in a bad way. maybe.",
      cta:      "come back and find out →",
      event:    "Sofia answered a question without you.",
    },
    {
      headline: "things don't pause here.",
      sub:      "a few hours is a long time.",
      cta:      "see what you missed →",
      event:    "Two people played your profile.",
    },
    {
      headline: "the duel is still open.",
      sub:      "it expires soon.",
      cta:      "don't let it expire →",
      event:    "Sofia committed. You haven't..",
    },
    {
      headline: "your queue got busy while you were out.",
      sub:      "that's either good news or pressure.",
      cta:      "check it →",
      event:    "3 people are ready to play.",
    },
  ],
  long: [
    {
      headline: "it's been a few hours.",
      sub:      "she stopped waiting at some point.",
      cta:      "see if it's too late →",
      event:    "Sofia moved on to someone else.",
    },
    {
      headline: "a lot can happen in a few hours.",
      sub:      "most of it did.",
      cta:      "pick up the pieces →",
      event:    "Your stake expired. Hers didn't..",
    },
    {
      headline: "you were gone longer than you think.",
      sub:      "the app kept moving. so did she.",
      cta:      "find out what you missed →",
      event:    "Someone new matched with you.",
    },
    {
      headline: "the match you left? still there.",
      sub:      "for now.",
      cta:      "don't waste it →",
      event:    "Sofia is still in your queue.",
    },
  ],
  very_long: [
    {
      headline: "you were gone for a day.",
      sub:      "the question is whether anything waited.",
      cta:      "find out →",
      event:    "Sofia matched with someone else.",
    },
    {
      headline: "absence either builds tension or breaks it.",
      sub:      "you're about to find out which.",
      cta:      "see what's left →",
      event:    "Your streak broke. Start a new one.",
    },
    {
      headline: "a day is a long time here.",
      sub:      "things expired. new things appeared.",
      cta:      "see what survived →",
      event:    "New profiles. New questions. New bets.",
    },
    {
      headline: "you missed a full cycle.",
      sub:      "the world didn't stop.",
      cta:      "step back in →",
      event:    "Someone is waiting on your answer.",
    },
  ],
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Persistent session snapshot (what they left mid-doing) ────
export interface SessionSnapshot {
  lastScreen: string
  hadActiveGame: boolean
  hadActiveBet:  boolean
  roundCount:    number
}

export function saveSession(snapshot: SessionSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot))
  } catch { /* SSR / private mode */ }
}

export function loadReturn(): ReturnState | null {
  try {
    const rawTs       = localStorage.getItem(STORAGE_KEY)
    const rawSession  = localStorage.getItem(SESSION_KEY)
    if (!rawTs) return null

    const lastSeen    = parseInt(rawTs, 10)
    const absenceMs   = Date.now() - lastSeen
    const tier        = classifyAbsence(absenceMs)

    if (tier === 'fresh') return null    // don't interrupt same-session reload

    const pool = COPY[tier]
    if (!pool.length) return null

    const snapshot: SessionSnapshot = rawSession
      ? JSON.parse(rawSession)
      : { lastScreen:'home', hadActiveGame:false, hadActiveBet:false, roundCount:0 }

    // Pick copy — bias toward context-aware messages when we know their state
    let chosen = pick(pool)

    // Override with more specific copy if we know what they left mid-doing
    if (snapshot.hadActiveBet) {
      const betSpecific = pool.find(c => c.event.toLowerCase().includes('bet'))
      if (betSpecific) chosen = betSpecific
    } else if (snapshot.hadActiveGame) {
      const gameSpecific = pool.find(c => c.event.toLowerCase().includes('answer'))
      if (gameSpecific) chosen = gameSpecific
    }

    return {
      isReturn:    true,
      absenceTier: tier,
      absenceMs,
      headline:    chosen.headline,
      sub:         chosen.sub,
      cta:         chosen.cta,
      event:       chosen.event,
    }
  } catch {
    return null
  }
}

export function clearReturn() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export function formatAbsence(ms: number): string {
  return fmt(ms)
}
