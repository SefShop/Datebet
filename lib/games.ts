// ─────────────────────────────────────────────────────────────────
// Games data — bilingual (EN / GR). No backend. Opponent simulated.
// ─────────────────────────────────────────────────────────────────
import type { LangStr } from '@/types'

// ── CARD GAME ───────────────────────────────────────────────────
export type CardType = 'deep' | 'risk' | 'quick' | 'personal'

export interface GameCard {
  type: CardType
  text: LangStr
}

// Glow + label per card type
export const CARD_STYLE: Record<CardType, { glow: string; label: LangStr; emoji: string }> = {
  deep:     { glow: '#a78bfa', emoji: '🌊', label: { en: 'deep',     gr: 'βαθύ'        } },
  risk:     { glow: '#fd297b', emoji: '🔥', label: { en: 'risk',     gr: 'ρίσκο'       } },
  quick:    { glow: '#38bdf8', emoji: '⚡', label: { en: 'quick',    gr: 'γρήγορο'     } },
  personal: { glow: '#ff8c42', emoji: '💭', label: { en: 'personal', gr: 'προσωπικό'   } },
}

export const CARD_DECK: GameCard[] = [
  { type: 'deep',     text: { en: "What's something you'd never admit on a first date?", gr: "Τι δεν θα παραδεχόσουν ποτέ σε πρώτο ραντεβού;" } },
  { type: 'risk',     text: { en: "Rate my vibe so far. Be honest.",                    gr: "Βαθμολόγησε το vibe μου μέχρι τώρα. Ειλικρινά." } },
  { type: 'quick',    text: { en: "Beach or mountains? One word. Go.",                  gr: "Θάλασσα ή βουνό; Μία λέξη. Πάμε." } },
  { type: 'personal', text: { en: "What's the last thing that made you smile?",         gr: "Τι ήταν το τελευταίο που σε έκανε να χαμογελάσεις;" } },
  { type: 'deep',     text: { en: "Do you believe people really change?",               gr: "Πιστεύεις ότι οι άνθρωποι αλλάζουν στ' αλήθεια;" } },
  { type: 'risk',     text: { en: "Text your last ex right now — would you?",           gr: "Θα έγραφες στον/στην τελευταίο/α σου τώρα;" } },
  { type: 'quick',    text: { en: "Coffee or wine? No thinking.",                        gr: "Καφές ή κρασί; Χωρίς σκέψη." } },
  { type: 'personal', text: { en: "Who knows you best in the world?",                    gr: "Ποιος σε ξέρει καλύτερα στον κόσμο;" } },
  { type: 'deep',     text: { en: "What do you want that you're scared to say out loud?", gr: "Τι θες που φοβάσαι να πεις δυνατά;" } },
  { type: 'risk',     text: { en: "Most attractive thing about me right now?",           gr: "Το πιο ελκυστικό σε μένα αυτή τη στιγμή;" } },
  { type: 'quick',    text: { en: "Early bird or night owl? Pick.",                          gr: "Πρωινός τύπος ή νυχτοπούλι; Διάλεξε." } },
  { type: 'personal', text: { en: "What's a small thing that instantly wins you over?",  gr: "Ποιο μικρό πράγμα σε κερδίζει αμέσως;" } },
  { type: 'deep',     text: { en: "When did you last surprise yourself?",                gr: "Πότε ήταν η τελευταία φορά που εξέπληξες τον εαυτό σου;" } },
  { type: 'risk',     text: { en: "Truth: are you into this, or just curious?",          gr: "Αλήθεια: σου αρέσει αυτό, ή απλώς περιέργεια;" } },
  { type: 'quick',    text: { en: "Dogs or cats? Final answer.",                         gr: "Σκύλοι ή γάτες; Τελική απάντηση." } },
  { type: 'personal', text: { en: "What's your most-played song lately?",                gr: "Ποιο τραγούδι ακούς πιο πολύ τελευταία;" } },
]

// ── BOARD GAME ──────────────────────────────────────────────────
export type TileType = 'question' | 'dare' | 'bonus' | 'penalty'

export interface BoardTile {
  type: TileType
  text: LangStr
}

export const TILE_STYLE: Record<TileType, { color: string; emoji: string; label: LangStr }> = {
  question: { color: '#38bdf8', emoji: '❓', label: { en: 'question', gr: 'ερώτηση'  } },
  dare:     { color: '#fd297b', emoji: '🔥', label: { en: 'dare',     gr: 'πρόκληση' } },
  bonus:    { color: '#4ade80', emoji: '✨', label: { en: 'bonus',    gr: 'μπόνους'  } },
  penalty:  { color: '#ff8c42', emoji: '🌀', label: { en: 'penalty',  gr: 'ποινή'    } },
}

// 16 tiles (index 0 = start, 15 = finish)
export const BOARD_TILES: BoardTile[] = [
  { type: 'bonus',    text: { en: "Start. You're both in.",                  gr: "Αρχή. Είστε κι οι δύο μέσα." } },
  { type: 'question', text: { en: "Say one true thing about your day.",      gr: "Πες κάτι αληθινό για τη μέρα σου." } },
  { type: 'dare',     text: { en: "Give a genuine compliment. Now.",         gr: "Κάνε ένα ειλικρινές κομπλιμέντο. Τώρα." } },
  { type: 'bonus',    text: { en: "Lucky tile. Roll again.",                 gr: "Τυχερό πλακίδιο. Ρίξε ξανά." } },
  { type: 'question', text: { en: "What's your green flag?",                 gr: "Ποιο είναι το green flag σου;" } },
  { type: 'penalty',  text: { en: "Overthought it. Skip a turn.",            gr: "Το σκέφτηκες πολύ. Χάνεις σειρά." } },
  { type: 'dare',     text: { en: "Send a voice note vibe — say it out loud.", gr: "Πες το δυνατά, σαν φωνητικό." } },
  { type: 'question', text: { en: "Best trip you've ever taken?",            gr: "Το καλύτερο ταξίδι που έχεις κάνει;" } },
  { type: 'bonus',    text: { en: "Chemistry +1. Move forward 1.",          gr: "Χημεία +1. Προχώρα 1." } },
  { type: 'penalty',  text: { en: "Awkward silence. Back 1 tile.",          gr: "Άβολη σιωπή. Πίσω 1 πλακίδιο." } },
  { type: 'question', text: { en: "What makes you feel alive?",              gr: "Τι σε κάνει να νιώθεις ζωντανός;" } },
  { type: 'dare',     text: { en: "Confess one tiny secret.",               gr: "Ομολόγησε ένα μικρό μυστικό." } },
  { type: 'question', text: { en: "Dream first date — describe it.",         gr: "Ιδανικό πρώτο ραντεβού — περίγραψέ το." } },
  { type: 'bonus',    text: { en: "Spark. Move forward 1.",                 gr: "Σπίθα. Προχώρα 1." } },
  { type: 'dare',     text: { en: "Look up and hold eye contact 5s.",       gr: "Κοιτάξτε ο ένας τον άλλον για 5 δευτερόλεπτα." } },
  { type: 'bonus',    text: { en: "Finish. You made it together.",          gr: "Τέλος. Τα καταφέρατε μαζί." } },
]

export const BOARD_SIZE = BOARD_TILES.length

// ── Psychological lines (bilingual) ─────────────────────────────
import type { Lang } from '@/lib/copy'

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
