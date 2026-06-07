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

import type { LangStr } from '@/types'
interface CopySet { headline: LangStr; sub: LangStr; cta: LangStr; event: LangStr }

const COPY: Record<AbsenceTier, CopySet[]> = {
  fresh: [],
  short: [
    { headline:{en:"you left at an interesting moment.",gr:"έφυγες σε ενδιαφέρουσα στιγμή."}, sub:{en:"things moved without you.",gr:"τα πράγματα κινήθηκαν χωρίς εσένα."}, cta:{en:"see what happened →",gr:"δες τι έγινε →"}, event:{en:"Someone checked the app.",gr:"Κάποιος μπήκε στο app."} },
    { headline:{en:"a player returned.",gr:"ένας παίκτης γύρισε."}, sub:{en:"for a few minutes, at least.",gr:"για λίγα λεπτά, τουλάχιστον."}, cta:{en:"pick up where it left off →",gr:"συνέχισε από εκεί που έμεινες →"}, event:{en:"A player came back online.",gr:"Ένας παίκτης γύρισε online."} },
    { headline:{en:"something shifted while you were gone.",gr:"κάτι άλλαξε όσο έλειπες."}, sub:{en:"brief absence. still noticed.",gr:"σύντομη απουσία. το πρόσεξε όμως."}, cta:{en:"find out →",gr:"μάθε →"}, event:{en:"A new match appeared in your queue.",gr:"Ένα νέο match εμφανίστηκε στη λίστα σου."} },
  ],
  medium: [
    { headline:{en:"you've been gone a while.",gr:"έλειψες αρκετή ώρα."}, sub:{en:"she noticed. not in a bad way. maybe.",gr:"το πρόσεξε. όχι αρνητικά. ίσως."}, cta:{en:"come back and find out →",gr:"γύρνα και μάθε →"}, event:{en:"A player made a move.",gr:"Ένας παίκτης έκανε κίνηση."} },
    { headline:{en:"things don't pause here.",gr:"εδώ τίποτα δεν σταματάει."}, sub:{en:"a few hours is a long time.",gr:"λίγες ώρες είναι πολύς χρόνος."}, cta:{en:"see what you missed →",gr:"δες τι έχασες →"}, event:{en:"Two people played your profile.",gr:"Δύο άτομα έπαιξαν το προφίλ σου."} },
    { headline:{en:"the duel is still open.",gr:"το duel είναι ακόμα ανοιχτό."}, sub:{en:"it expires soon.",gr:"λήγει σύντομα."}, cta:{en:"don't let it expire →",gr:"μην το αφήσεις να λήξει →"}, event:{en:"A player committed. You haven't.",gr:"Ένας παίκτης δεσμεύτηκε. Εσύ όχι."} },
    { headline:{en:"your queue got busy while you were out.",gr:"η λίστα σου γέμισε όσο έλειπες."}, sub:{en:"that's either good news or pressure.",gr:"ή καλά νέα ή πίεση."}, cta:{en:"check it →",gr:"δες την →"}, event:{en:"3 people are ready to play.",gr:"3 άτομα είναι έτοιμα να παίξουν."} },
  ],
  long: [
    { headline:{en:"it's been a few hours.",gr:"πέρασαν κάποιες ώρες."}, sub:{en:"she stopped waiting at some point.",gr:"κάποια στιγμή σταμάτησε να περιμένει."}, cta:{en:"see if it's too late →",gr:"δες αν είναι αργά →"}, event:{en:"A player moved on.",gr:"Ένας παίκτης προχώρησε."} },
    { headline:{en:"a lot can happen in a few hours.",gr:"πολλά γίνονται σε λίγες ώρες."}, sub:{en:"most of it did.",gr:"τα περισσότερα έγιναν."}, cta:{en:"pick up the pieces →",gr:"μάζεψε τα κομμάτια →"}, event:{en:"Your stake expired. Hers didn't.",gr:"Το στοίχημά σου έληξε. Το δικό της όχι."} },
    { headline:{en:"you were gone longer than you think.",gr:"έλειψες πιο πολύ απ' όσο νομίζεις."}, sub:{en:"the app kept moving. so did she.",gr:"το app συνέχισε. το ίδιο κι εκείνη."}, cta:{en:"find out what you missed →",gr:"μάθε τι έχασες →"}, event:{en:"Someone new matched with you.",gr:"Κάποιος νέος έκανε match μαζί σου."} },
    { headline:{en:"the match you left? still there.",gr:"το match που άφησες; ακόμα εκεί."}, sub:{en:"for now.",gr:"προς το παρόν."}, cta:{en:"don't waste it →",gr:"μην το σπαταλήσεις →"}, event:{en:"A player is still waiting.",gr:"Ένας παίκτης ακόμα περιμένει."} },
  ],
  very_long: [
    { headline:{en:"you were gone for a day.",gr:"έλειψες μια ολόκληρη μέρα."}, sub:{en:"the question is whether anything waited.",gr:"το θέμα είναι αν περίμενε κάτι."}, cta:{en:"find out →",gr:"μάθε →"}, event:{en:"Someone else connected.",gr:"Κάποιος άλλος συνδέθηκε."} },
    { headline:{en:"absence either builds tension or breaks it.",gr:"η απουσία ή χτίζει ένταση ή τη σπάει."}, sub:{en:"you're about to find out which.",gr:"σε λίγο θα μάθεις ποιο."}, cta:{en:"see what's left →",gr:"δες τι έμεινε →"}, event:{en:"Your streak broke. Start a new one.",gr:"Το σερί σου έσπασε. Ξεκίνα νέο."} },
    { headline:{en:"a day is a long time here.",gr:"μια μέρα είναι πολλή εδώ."}, sub:{en:"things expired. new things appeared.",gr:"κάποια έληξαν. νέα εμφανίστηκαν."}, cta:{en:"see what survived →",gr:"δες τι επέζησε →"}, event:{en:"New profiles. New questions. New bets.",gr:"Νέα προφίλ. Νέες ερωτήσεις. Νέα duels."} },
    { headline:{en:"you missed a full cycle.",gr:"έχασες έναν ολόκληρο κύκλο."}, sub:{en:"the world didn't stop.",gr:"ο κόσμος δεν σταμάτησε."}, cta:{en:"step back in →",gr:"ξαναμπές →"}, event:{en:"Someone is waiting on your answer.",gr:"Κάποιος περιμένει την απάντησή σου."} },
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
      const betSpecific = pool.find(c => c.event.en.toLowerCase().includes('bet') || c.event.en.toLowerCase().includes('stake'))
      if (betSpecific) chosen = betSpecific
    } else if (snapshot.hadActiveGame) {
      const gameSpecific = pool.find(c => c.event.en.toLowerCase().includes('answer'))
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
