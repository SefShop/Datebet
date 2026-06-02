// ─────────────────────────────────────────────────────────────────
// Games data — action-based, not quiz-based. Bilingual (EN / GR).
// Every card/tile = something you DO together, not answer alone.
// ─────────────────────────────────────────────────────────────────
import type { LangStr } from '@/types'
import type { Lang } from '@/lib/copy'

// ── CARD GAME — action cards ────────────────────────────────────
export type CardType = 'action' | 'dare' | 'choice' | 'confess'

export interface GameCard {
  type: CardType
  text: LangStr
}

export const CARD_STYLE: Record<CardType, { glow: string; label: LangStr; emoji: string }> = {
  action:  { glow: '#38bdf8', emoji: '⚡', label: { en: 'action',  gr: 'ενέργεια'   } },
  dare:    { glow: '#fd297b', emoji: '🔥', label: { en: 'dare',    gr: 'πρόκληση'   } },
  choice:  { glow: '#a78bfa', emoji: '🎯', label: { en: 'choice',  gr: 'επιλογή'    } },
  confess: { glow: '#ff8c42', emoji: '💬', label: { en: 'confess', gr: 'ομολογία'   } },
}

export const CARD_DECK: GameCard[] = [
  // action — do something
  { type: 'action',  text: { en: "Say something you normally wouldn't.",     gr: "Πες κάτι που δεν θα έλεγες κανονικά." } },
  { type: 'action',  text: { en: "Share the last photo on your phone.",      gr: "Δείξε την τελευταία φωτογραφία στο κινητό σου." } },
  { type: 'action',  text: { en: "Tell a story in exactly 10 words.",        gr: "Πες μια ιστορία σε ακριβώς 10 λέξεις." } },
  { type: 'action',  text: { en: "Send a voice message. Right now.",         gr: "Στείλε ένα φωνητικό. Τώρα αμέσως." } },

  // dare — small challenges
  { type: 'dare',    text: { en: "Give a real compliment. Mean it.",         gr: "Κάνε ένα αληθινό κομπλιμέντο. Εννόησέ το." } },
  { type: 'dare',    text: { en: "Admit your worst habit out loud.",         gr: "Παραδέξου τη χειρότερη συνήθειά σου." } },
  { type: 'dare',    text: { en: "Say the first thing that comes to mind.",  gr: "Πες το πρώτο πράγμα που σου έρχεται." } },
  { type: 'dare',    text: { en: "Make a promise you'll actually keep.",     gr: "Κάνε μια υπόσχεση που θα κρατήσεις." } },

  // choice — pick one, reveal yourself
  { type: 'choice',  text: { en: "Pick: coffee date or night drive.",        gr: "Διάλεξε: καφές ή νυχτερινή βόλτα." } },
  { type: 'choice',  text: { en: "Pick: text first or wait for them.",       gr: "Διάλεξε: γράφεις πρώτος ή περιμένεις." } },
  { type: 'choice',  text: { en: "Pick: stay in tonight or go out.",         gr: "Διάλεξε: μέσα απόψε ή έξω." } },
  { type: 'choice',  text: { en: "Pick: honesty or mystery.",               gr: "Διάλεξε: ειλικρίνεια ή μυστήριο." } },

  // confess — say something real
  { type: 'confess', text: { en: "What are you actually thinking right now?", gr: "Τι σκέφτεσαι πραγματικά αυτή τη στιγμή;" } },
  { type: 'confess', text: { en: "Confess: what made you interested.",       gr: "Ομολόγησε: τι σε τράβηξε." } },
  { type: 'confess', text: { en: "One thing you'd never post online.",       gr: "Κάτι που δεν θα ανέβαζες ποτέ online." } },
  { type: 'confess', text: { en: "Say something honest. No filter.",         gr: "Πες κάτι ειλικρινές. Χωρίς φίλτρο." } },
]

// ── BOARD GAME — interactive tiles ──────────────────────────────
export type TileType = 'talk' | 'dare' | 'fast' | 'bonus' | 'penalty'

export interface BoardTile {
  type: TileType
  text: LangStr
}

export const TILE_STYLE: Record<TileType, { color: string; emoji: string; label: LangStr }> = {
  talk:    { color: '#38bdf8', emoji: '💬', label: { en: 'talk',    gr: 'μίλα'       } },
  dare:    { color: '#fd297b', emoji: '🔥', label: { en: 'dare',    gr: 'πρόκληση'   } },
  fast:    { color: '#a78bfa', emoji: '⚡', label: { en: 'fast',    gr: 'γρήγορα'    } },
  bonus:   { color: '#4ade80', emoji: '✨', label: { en: 'bonus',   gr: 'μπόνους'    } },
  penalty: { color: '#ff8c42', emoji: '🌀', label: { en: 'penalty', gr: 'ποινή'      } },
}

export const BOARD_TILES: BoardTile[] = [
  { type: 'bonus',   text: { en: "Start. You're both in.",                  gr: "Αρχή. Είστε μέσα." } },
  { type: 'talk',    text: { en: "Share one real thing about your day.",     gr: "Πες κάτι αληθινό για τη μέρα σου." } },
  { type: 'dare',    text: { en: "Give a compliment. Mean it.",             gr: "Κάνε ένα κομπλιμέντο. Αληθινό." } },
  { type: 'fast',    text: { en: "Coffee or wine? 3 seconds.",              gr: "Καφές ή κρασί; 3 δευτερόλεπτα." } },
  { type: 'talk',    text: { en: "What's on your mind right now?",          gr: "Τι σκέφτεσαι τώρα;" } },
  { type: 'penalty', text: { en: "Awkward pause. Go back 1.",               gr: "Άβολη παύση. Πίσω 1." } },
  { type: 'dare',    text: { en: "Say something bold. No take-backs.",      gr: "Πες κάτι τολμηρό. Χωρίς πισωγύρισμα." } },
  { type: 'fast',    text: { en: "Text or call? Now.",                      gr: "Μήνυμα ή κλήση; Τώρα." } },
  { type: 'bonus',   text: { en: "Good energy. Move forward 1.",            gr: "Καλή ενέργεια. Προχώρα 1." } },
  { type: 'talk',    text: { en: "Something you've never told anyone.",     gr: "Κάτι που δεν έχεις πει σε κανέναν." } },
  { type: 'dare',    text: { en: "Look up and hold eye contact 5s.",        gr: "Κοιτάξτε ο ένας τον άλλον 5 δεύτερα." } },
  { type: 'fast',    text: { en: "Stay in or go out? Pick now.",            gr: "Μέσα ή έξω; Τώρα." } },
  { type: 'penalty', text: { en: "Played it safe. Back 1.",                 gr: "Το έπαιξες safe. Πίσω 1." } },
  { type: 'talk',    text: { en: "Best thing that happened this week.",     gr: "Το καλύτερο της εβδομάδας." } },
  { type: 'bonus',   text: { en: "Spark. Move forward 1.",                  gr: "Σπίθα. Προχώρα 1." } },
  { type: 'bonus',   text: { en: "Finish. You made it together.",           gr: "Τέλος. Τα καταφέρατε μαζί." } },
]

export const BOARD_SIZE = BOARD_TILES.length

// ── Psychological lines (bilingual) ─────────────────────────────

// Pressure — shown after a card reveal / tile landing (randomly)
export const CARD_PRESSURE: Record<Lang, string[]> = {
  en: ["you can't skip this one.", "this says something about you.", "she's watching how you answer.", "no wrong answer. only honest ones.", "she'll remember this."],
  gr: ["αυτό δεν το προσπερνάς.", "αυτό λέει κάτι για σένα.", "σε παρακολουθεί πώς απαντάς.", "δεν υπάρχει λάθος. μόνο ειλικρινές.", "αυτό θα το θυμάται."],
}
export const TILE_PRESSURE: Record<Lang, string[]> = {
  en: ["this one matters.", "don't play it safe.", "she noticed that move.", "everything counts here.", "she's reading you."],
  gr: ["αυτό μετράει.", "μην το παίξεις safe.", "το πρόσεξε αυτό.", "όλα μετράνε εδώ.", "σε διαβάζει."],
}

// Micro-feedback — after every action (fades out)
export const CARD_FEEDBACK: Record<Lang, string[]> = {
  en: ["interesting choice.", "bold move.", "safe... but safe doesn't win.", "she didn't expect that.", "now we're talking."],
  gr: ["ενδιαφέρουσα επιλογή.", "δυνατή κίνηση.", "safe... αλλά δεν κερδίζει.", "δεν το περίμενε αυτό.", "τώρα μάλιστα."],
}
export const BOARD_FEEDBACK: Record<Lang, string[]> = {
  en: ["nice move.", "that changes things.", "you're getting ahead.", "she felt that.", "momentum."],
  gr: ["καλή κίνηση.", "αυτό αλλάζει τα πράγματα.", "παίρνεις προβάδισμα.", "το ένιωσε.", "φόρα."],
}

export function pickLine(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Sofia reactions after a move (bilingual)
export const REACTIONS: Record<Lang, string[]> = {
  en: ["that was bold.", "she didn't expect that.", "interesting choice.", "she's reading you.", "she noticed that.", "bold."],
  gr: ["αυτό ήταν τολμηρό.", "δεν το περίμενε.", "ενδιαφέρουσα επιλογή.", "σε διαβάζει.", "το πρόσεξε αυτό.", "θάρρος."],
}
