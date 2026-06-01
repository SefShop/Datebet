// ─────────────────────────────────────────────────────────────────
// Personalization Engine — bilingual (EN / GR)
//
// Reads in-session behavior and generates observations that feel
// personal. No real tracking — derived from current session only:
// answer speed, option choice, pattern across rounds.
//
// Rule: say something TRUE about behavior, not a compliment.
// Truth feels human. Compliments feel fake.
// ─────────────────────────────────────────────────────────────────

import { AnswerBoldness, SpeedTier, SessionProfile } from '@/types'
import type { Lang } from '@/lib/copy'

// ── Speed classification ────────────────────────────────────────
export function classifySpeed(ms: number): SpeedTier {
  if (ms < 1800)  return 'instant'
  if (ms < 4000)  return 'fast'
  if (ms < 9000)  return 'normal'
  if (ms < 18000) return 'slow'
  return 'very_slow'
}

// ── Boldness classification — covers all 25 questions ───────────
export function classifyBoldness(optionId: string, questionId: string): AnswerBoldness {
  const MAP: Record<string, Record<string, AnswerBoldness>> = {
    q1:  { a: 'safe',  b: 'bold',    c: 'bold',    d: 'safe'    },
    q2:  { a: 'honest',b: 'honest',  c: 'bold',    d: 'safe'    },
    q3:  { a: 'honest',b: 'honest',  c: 'safe',    d: 'bold'    },
    q4:  { a: 'bold',  b: 'safe',    c: 'chaotic', d: 'honest'  },
    q5:  { a: 'bold',  b: 'safe',    c: 'honest',  d: 'safe'    },
    q6:  { a: 'safe',  b: 'honest',  c: 'safe',    d: 'honest'  },
    q7:  { a: 'chaotic',b:'safe',    c: 'bold',    d: 'honest'  },
    q8:  { a: 'honest',b: 'bold',    c: 'safe',    d: 'chaotic' },
    q9:  { a: 'chaotic',b:'safe',    c: 'bold',    d: 'safe'    },
    q10: { a: 'honest',b: 'safe',    c: 'honest',  d: 'chaotic' },
    q11: { a: 'honest',b: 'bold',    c: 'honest',  d: 'chaotic' },
    q12: { a: 'safe',  b: 'safe',    c: 'honest',  d: 'honest'  },
    q13: { a: 'safe',  b: 'bold',    c: 'honest',  d: 'safe'    },
    q14: { a: 'honest',b: 'honest',  c: 'bold',    d: 'honest'  },
    q15: { a: 'honest',b: 'safe',    c: 'honest',  d: 'safe'    },
    q16: { a: 'chaotic',b:'safe',    c: 'safe',    d: 'bold'    },
    q17: { a: 'honest',b: 'chaotic', c: 'chaotic', d: 'safe'    },
    q18: { a: 'safe',  b: 'bold',    c: 'chaotic', d: 'bold'    },
    q19: { a: 'bold',  b: 'honest',  c: 'chaotic', d: 'bold'    },
    q20: { a: 'bold',  b: 'honest',  c: 'bold',    d: 'chaotic' },
    q21: { a: 'safe',  b: 'honest',  c: 'bold',    d: 'chaotic' },
    q22: { a: 'honest',b: 'safe',    c: 'bold',    d: 'safe'    },
    q23: { a: 'chaotic',b:'safe',    c: 'bold',    d: 'safe'    },
    q24: { a: 'honest',b: 'honest',  c: 'bold',    d: 'safe'    },
    q25: { a: 'bold',  b: 'honest',  c: 'safe',    d: 'bold'    },
  }
  return MAP[questionId]?.[optionId] ?? 'neutral'
}

// ── Speed observations (suspense screen) ────────────────────────
const SPEED_OBSERVATIONS: Record<Lang, Record<SpeedTier, string[]>> = {
  en: {
    instant: ["you didn't hesitate. she noticed.", "that was fast. she clocked it.", "no second-guessing. interesting."],
    fast:    ["you knew. just like that.", "quick. she'll wonder why.", "no overthinking. she respects that."],
    normal:  ["you thought about it.", "took you a moment. she did too.", "considered your options. fair."],
    slow:    ["you took your time. she felt that.", "not an easy answer for you.", "careful. or conflicted. hard to tell."],
    very_slow:["you took longer than expected.", "something made you pause.", "that question got to you a little."],
  },
  gr: {
    instant: ["Δε δίστασες. Το πρόσεξε.", "Γρήγορα. Το κατέγραψε.", "Καμία αμφιβολία. Ενδιαφέρον."],
    fast:    ["Το ήξερες. Έτσι απλά.", "Γρήγορα. Θα αναρωτηθεί γιατί.", "Χωρίς υπερανάλυση. Το σέβεται."],
    normal:  ["Το σκέφτηκες.", "Πήρε λίγο. Το ίδιο κι εκείνη.", "Ζύγισες τις επιλογές σου. Δίκαιο."],
    slow:    ["Πήρες τον χρόνο σου. Το ένιωσε.", "Δεν ήταν εύκολη απάντηση για σένα.", "Προσεκτικά. Ή μπερδεμένα. Δύσκολο να πεις."],
    very_slow:["Άργησες πιο πολύ απ' όσο περίμενε.", "Κάτι σε έκανε να σταματήσεις.", "Αυτή η ερώτηση σε άγγιξε λίγο."],
  },
}

// ── Boldness observations (result screen) ───────────────────────
const BOLDNESS_OBSERVATIONS: Record<Lang, Record<AnswerBoldness, string[]>> = {
  en: {
    bold:    ["that says something about you.", "bold pick. most people don't go there.", "not the safe answer. good."],
    safe:    ["predictable. or just careful?", "the safe play. nothing wrong with that.", "she probably guessed you'd say that."],
    honest:  ["that took something.", "most people lie on this one.", "honest. harder than it looks."],
    chaotic: ["she didn't see that coming.", "chaotic pick. she's intrigued.", "hard to predict. she likes that."],
    neutral: ["hard to read from that one.", "she's still figuring you out."],
  },
  gr: {
    bold:    ["Αυτό λέει κάτι για σένα.", "Τολμηρή επιλογή. Οι περισσότεροι δεν πάνε εκεί.", "Όχι η ασφαλής απάντηση. Ωραία."],
    safe:    ["Προβλέψιμο. Ή απλώς προσεκτικό;", "Το ασφαλές παιχνίδι. Τίποτα κακό.", "Μάλλον το μάντεψε ότι θα το έλεγες."],
    honest:  ["Αυτό σου κόστισε κάτι.", "Οι περισσότεροι λένε ψέματα εδώ.", "Ειλικρινές. Πιο δύσκολο απ' ό,τι φαίνεται."],
    chaotic: ["Δεν το περίμενε αυτό.", "Χαοτική επιλογή. Της κίνησες το ενδιαφέρον.", "Δύσκολο να σε προβλέψει. Της αρέσει."],
    neutral: ["Δύσκολο να σε διαβάσει απ' αυτό.", "Ακόμα σε ψάχνει."],
  },
}

// ── Cross-round pattern (round 2+) ──────────────────────────────
function getPatternObservation(history: AnswerBoldness[], lang: Lang): string | null {
  if (history.length < 2) return null
  const allSame = history.every(b => b === history[0])
  const L = {
    en: {
      bold:   "you keep going bold. she's noticed the pattern.",
      safe:   "you're consistent. whether that's good, she's deciding.",
      honest: "you keep being honest. brave or reckless.",
      chaotic:"unpredictable. she doesn't know what to expect. good.",
    },
    gr: {
      bold:   "Συνέχεια το ρισκάρεις. Το πρόσεξε το μοτίβο.",
      safe:   "Είσαι σταθερός. Αν είναι καλό, το αποφασίζει εκείνη.",
      honest: "Συνέχεια ειλικρινής. Γενναίο ή απερίσκεπτο.",
      chaotic:"Απρόβλεπτος. Δεν ξέρει τι να περιμένει. Ωραία.",
    },
  }[lang]
  if (allSame && history[0] === 'bold')   return L.bold
  if (allSame && history[0] === 'safe')   return L.safe
  if (allSame && history[0] === 'honest') return L.honest
  if (history.slice(-2).includes('chaotic')) return L.chaotic
  return null
}

// ── Round-gated progression (the retention hook) ────────────────
// round 1: nothing
// round 2: "you're starting to show a pattern."
// round 3+: deeper personality read
// round 4+: slightly provocative
function getProgressionObs(
  round: number, history: AnswerBoldness[], speedTier: SpeedTier, lang: Lang
): string | null {
  if (round <= 1) return null

  // Dominant boldness trait so far
  const counts: Record<string, number> = {}
  history.forEach(b => { counts[b] = (counts[b] || 0) + 1 })
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as AnswerBoldness

  const T = {
    en: {
      r2: "you're starting to show a pattern.",
      fast: "you don't hesitate much.",
      slow: "you overthink more than you think.",
      bold: "you tend to go for the bold choice.",
      safe: "you keep playing it safe.",
      honest: "you keep choosing the honest answer.",
      chaotic: "you like keeping things unpredictable.",
      prov: ["you're getting predictable.", "she would notice that.", "i'm starting to call your moves.", "you're easier to read than you think."],
    },
    gr: {
      r2: "Αρχίζεις να δείχνεις ένα μοτίβο.",
      fast: "Δε διστάζεις και πολύ.",
      slow: "Το σκέφτεσαι πιο πολύ απ' όσο νομίζεις.",
      bold: "Τείνεις να διαλέγεις την τολμηρή επιλογή.",
      safe: "Συνέχεια το παίζεις ασφαλές.",
      honest: "Συνέχεια διαλέγεις την ειλικρινή απάντηση.",
      chaotic: "Σ' αρέσει να τα κρατάς απρόβλεπτα.",
      prov: ["Αρχίζεις να γίνεσαι προβλέψιμος.", "Αυτό θα το πρόσεχε.", "Αρχίζω να προβλέπω τις κινήσεις σου.", "Διαβάζεσαι πιο εύκολα απ' όσο νομίζεις."],
    },
  }[lang]

  // Round 2 — gentle pattern nudge
  if (round === 2) return T.r2

  // Round 4+ — occasionally go provocative
  if (round >= 4 && Math.random() < 0.55) {
    return T.prov[Math.floor(Math.random() * T.prov.length)]
  }

  // Round 3+ — deeper personality read (speed first, then boldness)
  if (speedTier === 'instant' || speedTier === 'fast') return T.fast
  if (speedTier === 'slow' || speedTier === 'very_slow') return T.slow
  if (dominant === 'bold')    return T.bold
  if (dominant === 'safe')    return T.safe
  if (dominant === 'honest')  return T.honest
  if (dominant === 'chaotic') return T.chaotic
  return T.r2
}

// ── Ego hooks ───────────────────────────────────────────────────
function getEgoHook(profile: SessionProfile, lang: Lang): string | null {
  const { speedTier, boldnessHistory, roundCount } = profile
  const allBold   = boldnessHistory.length > 0 && boldnessHistory.every(b => b === 'bold')
  const manyHonest= boldnessHistory.filter(b => b === 'honest').length >= 2
  const L = {
    en: {
      firstFast: "most people take longer on the first question.",
      allBold:   "you haven't played it safe once.",
      honest:    "you keep going for the honest answer. that's not common.",
      slowBold:  "you took a while, then went bold anyway. interesting.",
      fastSafe:  "fast, but safe. you know what you want — you just keep it close.",
    },
    gr: {
      firstFast: "Οι περισσότεροι αργούν στην πρώτη ερώτηση.",
      allBold:   "Δεν το έπαιξες ασφαλές ούτε μία φορά.",
      honest:    "Συνέχεια πας στην ειλικρινή απάντηση. Δεν είναι συνηθισμένο.",
      slowBold:  "Άργησες, αλλά το ρίσκαρες τελικά. Ενδιαφέρον.",
      fastSafe:  "Γρήγορα, αλλά ασφαλώς. Ξέρεις τι θες — απλώς το κρατάς κρυφό.",
    },
  }[lang]
  if (roundCount === 1 && speedTier === 'instant') return L.firstFast
  if (roundCount >= 2 && allBold)    return L.allBold
  if (roundCount >= 2 && manyHonest) return L.honest
  if (speedTier === 'very_slow' && profile.boldness === 'bold') return L.slowBold
  if (speedTier === 'instant' && profile.boldness === 'safe')   return L.fastSafe
  return null
}

// ── Main builder ────────────────────────────────────────────────
export function buildPersonalization(
  optionId: string,
  questionId: string,
  speedMs: number,
  prevHistory: AnswerBoldness[],
  lang: Lang = 'en'
) {
  const speedTier = classifySpeed(speedMs)
  const boldness  = classifyBoldness(optionId, questionId)
  const history   = [...prevHistory, boldness]
  const round     = history.length

  return {
    speedTier,
    boldness,
    speedObs:      pickRandom(SPEED_OBSERVATIONS[lang][speedTier]),
    boldObs:       pickRandom(BOLDNESS_OBSERVATIONS[lang][boldness]),
    patternObs:    getPatternObservation(history, lang),
    progressionObs:getProgressionObs(round, history, speedTier, lang),
    egoHook:       getEgoHook({
      answerSpeedMs: speedMs, speedTier, boldness,
      answerHistory: [optionId], boldnessHistory: history, roundCount: round,
    } as SessionProfile, lang),
    history,
  }
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
