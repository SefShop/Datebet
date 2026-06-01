// ─────────────────────────────────────────────────────────────────
// Anticipation + Social Presence Engine — bilingual (EN / GR)
//
// Simulates a real person on the other side. No backend.
// All perception: timing, memory illusion, tension, near-misses.
// ─────────────────────────────────────────────────────────────────

import type { Lang } from '@/lib/copy'
import type { SessionProfile, AnswerBoldness } from '@/types'

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }

// ── FEATURE 2 — "she's thinking" lines (suspense delay) ─────────
export const THINKING_LINES: Record<Lang, string[]> = {
  en: ["she's thinking", "she paused", "that took her a second", "she's deciding", "she went quiet for a moment"],
  gr: ["το σκέφτεται", "σταμάτησε για λίγο", "της πήρε ένα δευτερόλεπτο", "αποφασίζει", "έμεινε σιωπηλή μια στιγμή"],
}

// ── FEATURE 1 — "she remembers you" (round 2+) ──────────────────
const REMEMBERS_LINES: Record<Lang, string[]> = {
  en: [
    "she's starting to notice your patterns.",
    "she's figuring you out.",
    "you're becoming easier to read.",
    "she's seen this from you before.",
  ],
  gr: [
    "αρχίζει να προσέχει τα μοτίβα σου.",
    "αρχίζει να σε καταλαβαίνει.",
    "γίνεσαι πιο εύκολος στο διάβασμα.",
    "το έχει ξαναδεί αυτό από σένα.",
  ],
}
export function getRemembersLine(session: SessionProfile, lang: Lang): string | null {
  if (session.roundCount < 2) return null
  return pick(REMEMBERS_LINES[lang])
}

// ── FEATURE 3 — memory illusion (compares last rounds) ──────────
export function getMemoryLine(session: SessionProfile, lang: Lang): string | null {
  const h = session.boldnessHistory
  if (h.length < 2) return null
  const prev = h[h.length - 2]
  const now  = h[h.length - 1]

  const L = {
    en: {
      switchSafeBold:  "last time you went safe. now you switched.",
      switchBoldSafe:  "you were bold before. you pulled back this round.",
      consistent:      "you stayed consistent. interesting.",
      honestAgain:     "honest again. she's keeping count.",
      chaoticAgain:    "still unpredictable. she can't pin you down.",
      generic:         `last round you went ${prev}. this one, ${now}.`,
    },
    gr: {
      switchSafeBold:  "την προηγούμενη το έπαιξες ασφαλές. τώρα άλλαξες.",
      switchBoldSafe:  "πριν ήσουν τολμηρός. τώρα τραβήχτηκες πίσω.",
      consistent:      "έμεινες σταθερός. ενδιαφέρον.",
      honestAgain:     "ειλικρινής ξανά. το μετράει.",
      chaoticAgain:    "ακόμα απρόβλεπτος. δεν μπορεί να σε πιάσει.",
      generic:         "τον προηγούμενο γύρο πήγες αλλιώς. τώρα αλλιώς.",
    },
  }[lang]

  if (prev === now && now === 'honest')  return L.honestAgain
  if (prev === now && now === 'chaotic') return L.chaoticAgain
  if (prev === now)                      return L.consistent
  if (prev === 'safe' && now === 'bold') return L.switchSafeBold
  if (prev === 'bold' && now === 'safe') return L.switchBoldSafe
  return L.generic
}

// ── FEATURE 4 — light tension (round 3+) ────────────────────────
const TENSION_LINES: Record<Lang, string[]> = {
  en: [
    "you're getting predictable.",
    "she might expect this now.",
    "don't make it too easy.",
    "she's one step ahead of you.",
  ],
  gr: [
    "αρχίζεις να γίνεσαι προβλέψιμος.",
    "μπορεί να το περιμένει τώρα.",
    "μην το κάνεις πολύ εύκολο.",
    "είναι ένα βήμα μπροστά σου.",
  ],
}
export function getTensionLine(session: SessionProfile, lang: Lang): string | null {
  if (session.roundCount < 3) return null
  if (Math.random() > 0.6) return null   // not every round — keeps it special
  return pick(TENSION_LINES[lang])
}

// ── FEATURE 5 — almost-match illusion ───────────────────────────
const ALMOST_LINES: Record<Lang, string[]> = {
  en: ["you were close.", "one choice away.", "so close it stings.", "almost the same answer."],
  gr: ["ήσασταν κοντά.", "μία επιλογή μακριά.", "τόσο κοντά που πονάει.", "παραλίγο ίδια απάντηση."],
}
// Show on a near-miss: not a match, but compatibility was decent.
export function getAlmostMatchLine(isMatch: boolean, compat: number, lang: Lang): string | null {
  if (isMatch) return null
  if (compat < 45) return null
  if (Math.random() > 0.55) return null
  return pick(ALMOST_LINES[lang])
}

// ── FEATURE 6 — end hook (round 3-4+) ───────────────────────────
export function getEndHook(session: SessionProfile, lang: Lang): { line: string; cta: string } | null {
  if (session.roundCount < 3) return null
  return {
    en: { line: "this would feel different with a real person.", cta: "start a real duel →" },
    gr: { line: "με αληθινό άτομο θα ήταν τελείως αλλιώς.",       cta: "ξεκίνα ένα αληθινό duel →" },
  }[lang]
}

// "Coming soon" modal copy for the end-hook CTA (UI only, no backend)
export const REAL_DUEL_MODAL: Record<Lang, { title: string; body: string; close: string }> = {
  en: { title: "real duels are coming.", body: "real people. real stakes. you'll be first to know when it's live.", close: "got it" },
  gr: { title: "τα αληθινά duels έρχονται.", body: "αληθινοί άνθρωποι. αληθινά στοιχήματα. θα είσαι ο πρώτος που θα μάθει.", close: "οκ" },
}
