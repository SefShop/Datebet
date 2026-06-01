// ─────────────────────────────────────────────────────────────
// DateDuel Voice Engine — bilingual (EN / GR)
// EN: cool, minimal.  GR: human, direct, λίγο πιο μέσα στο συναίσθημα.
// Greek is NOT literal — it's adapted for tone.
// ─────────────────────────────────────────────────────────────
import type { Lang } from '@/lib/copy'

type Line = { top: string; bottom: string }

// ── Suspense ──────────────────────────────────────────────────
export const SUSPENSE_LINES: Record<Lang, Line[]> = {
  en: [
    { top: "she answered in 3 seconds.",    bottom: "you took longer. noted."              },
    { top: "her answer? already locked.",   bottom: "no take-backs. for either of you."    },
    { top: "she didn't even hesitate.",     bottom: "did you?"                             },
    { top: "checking if you're her match.", bottom: "spoiler: it's complicated."           },
    { top: "the tension is real.",          bottom: "just saying."                         },
    { top: "she went bold.",                bottom: "let's see if you kept up."            },
    { top: "comparing answers.",            bottom: "one of you is about to feel smug."    },
    { top: "this is the good part.",        bottom: "don't look away."                     },
  ],
  gr: [
    { top: "Απάντησε σε 3 δευτερόλεπτα.",    bottom: "Εσύ άργησες. Το κρατάμε."             },
    { top: "Η απάντησή της; Ήδη κλειδωμένη.", bottom: "Πίσω γυρισμός δεν υπάρχει. Για κανέναν." },
    { top: "Δε δίστασε καθόλου.",            bottom: "Εσύ;"                                 },
    { top: "Βλέπουμε αν ταιριάζετε.",        bottom: "Σπόιλερ: είναι περίπλοκο."            },
    { top: "Η ένταση είναι αληθινή.",        bottom: "Απλώς λέω."                           },
    { top: "Αυτή το ρίσκαρε.",               bottom: "Για να δούμε αν την πρόλαβες."        },
    { top: "Συγκρίνουμε απαντήσεις.",        bottom: "Κάποιος θα νιώσει πολλή σιγουριά."    },
    { top: "Εδώ είναι το ωραίο.",            bottom: "Μην κοιτάς αλλού."                    },
  ],
}

// ── Match headlines ────────────────────────────────────────────
export const MATCH_HEADLINES: Record<Lang, string[]> = {
  en: [
    "you think alike.\nthat's either chemistry or a problem.",
    "same answer.\nstop pretending that's a coincidence.",
    "the algorithm didn't expect this.\nneither did you.",
    "okay fine.\nyou two have something.",
    "she picked the same.\nnow what are you going to do about it?",
    "identical.\nthe universe is being obvious right now.",
  ],
  gr: [
    "Σκέφτεστε ίδια.\nΉ είναι χημεία, ή μπελάς.",
    "Ίδια απάντηση.\nΜην κάνεις πως είναι σύμπτωση.",
    "Ούτε ο αλγόριθμος το περίμενε.\nΟύτε εσύ.",
    "Εντάξει, καλά.\nΚάτι παίζει μεταξύ σας.",
    "Διάλεξε το ίδιο.\nΚαι τώρα τι θα κάνεις;",
    "Πανομοιότυπα.\nΤο σύμπαν το λέει ξεκάθαρα.",
  ],
}

// ── No-match headlines ─────────────────────────────────────────
export const NO_MATCH_HEADLINES: Record<Lang, string[]> = {
  en: [
    "different answers.\nbetter conversation.",
    "she'd argue with you about this.\nand she'd win.",
    "opposites.\nchaos, actually.",
    "you went one way.\nshe went somewhere more interesting.",
    "not the same.\nstill worth finding out why.",
    "the gap between your answers\nis basically a first date.",
  ],
  gr: [
    "Διαφορετικές απαντήσεις.\nΠιο ενδιαφέρουσα κουβέντα.",
    "Θα τσακωνόσασταν γι' αυτό.\nΚαι θα κέρδιζε εκείνη.",
    "Τελείως αντίθετοι.\nΚαι κάπως… δουλεύει.",
    "Εσύ πήγες αλλού.\nΑυτή πήγε κάπου πιο ενδιαφέρον.",
    "Όχι ίδια.\nΑξίζει όμως να μάθεις γιατί.",
    "Η διαφορά στις απαντήσεις σας\nείναι ήδη ένα πρώτο ραντεβού.",
  ],
}

// ── Subtext ────────────────────────────────────────────────────
export const MATCH_SUBTEXT: Record<Lang, string[]> = {
  en: [
    "Chemistry or coincidence — you won't know until you show up.",
    "Most people would overthink this. Don't be most people.",
    "The app noticed. The question is whether you'll do anything about it.",
    "Two strangers. Same answer. That's rarer than you'd think.",
  ],
  gr: [
    "Χημεία ή σύμπτωση — θα το μάθεις μόνο αν εμφανιστείς.",
    "Οι περισσότεροι θα το σκέφτονταν πολύ. Μην είσαι σαν τους περισσότερους.",
    "Το app το πρόσεξε. Το θέμα είναι αν θα κάνεις κάτι.",
    "Δύο άγνωστοι. Ίδια απάντηση. Σπανίζει πιο πολύ απ' όσο νομίζεις.",
  ],
}

export const NO_MATCH_SUBTEXT: Record<Lang, string[]> = {
  en: [
    "She'll want to know why you picked that. Have an answer ready.",
    "The best first dates start with a disagreement. Science, probably.",
    "Different takes, same room. Either a disaster or a great story.",
    "Agreeing on everything is for people who are afraid of each other.",
  ],
  gr: [
    "Θα θελήσει να μάθει γιατί διάλεξες αυτό. Έχε έτοιμη απάντηση.",
    "Τα καλύτερα πρώτα ραντεβού ξεκινούν με μια διαφωνία. Επιστήμη, μάλλον.",
    "Διαφορετικές απόψεις, ίδιος χώρος. Ή καταστροφή ή σπουδαία ιστορία.",
    "Το να συμφωνείς σε όλα είναι για όσους φοβούνται ο ένας τον άλλον.",
  ],
}

// ── Compatibility labels ───────────────────────────────────────
type CompatLabel = { label: string; color: string }
const COMPAT_HIGH: Record<Lang, CompatLabel[]> = {
  en: [
    { label: "dangerously aligned",             color: "#fd297b" },
    { label: "suspicious similarity",           color: "#fd297b" },
    { label: "finishing each other's thoughts", color: "#fd297b" },
    { label: "almost too compatible",           color: "#fd297b" },
  ],
  gr: [
    { label: "επικίνδυνα συντονισμένοι",         color: "#fd297b" },
    { label: "ύποπτη ομοιότητα",                 color: "#fd297b" },
    { label: "ίδιο μυαλό, σχεδόν",               color: "#fd297b" },
    { label: "σχεδόν υπερβολικά ταιριαστοί",     color: "#fd297b" },
  ],
}
const COMPAT_MID: Record<Lang, CompatLabel[]> = {
  en: [
    { label: "intriguing tension",  color: "#ff8c42" },
    { label: "worth investigating", color: "#ff8c42" },
    { label: "charged overlap",     color: "#ff8c42" },
    { label: "interesting friction",color: "#ff8c42" },
  ],
  gr: [
    { label: "ενδιαφέρουσα ένταση",  color: "#ff8c42" },
    { label: "αξίζει να το ψάξεις",  color: "#ff8c42" },
    { label: "φορτισμένη σύνδεση",   color: "#ff8c42" },
    { label: "ενδιαφέρουσα τριβή",   color: "#ff8c42" },
  ],
}
const COMPAT_LOW: Record<Lang, CompatLabel[]> = {
  en: [
    { label: "creatively incompatible", color: "#a78bfa" },
    { label: "beautifully opposite",    color: "#a78bfa" },
    { label: "spicy contrast",          color: "#a78bfa" },
    { label: "refreshingly different",  color: "#a78bfa" },
  ],
  gr: [
    { label: "δημιουργικά ασύμβατοι",   color: "#a78bfa" },
    { label: "όμορφα αντίθετοι",        color: "#a78bfa" },
    { label: "πικάντικη αντίθεση",      color: "#a78bfa" },
    { label: "ευχάριστα διαφορετικοί",  color: "#a78bfa" },
  ],
}

// ── Result CTA ─────────────────────────────────────────────────
export const DUEL_CTA: Record<Lang, { match: string; noMatch: string }> = {
  en: { match: "lock in the duel →", noMatch: "argue about it in person →" },
  gr: { match: "κλείδωσε το duel →",  noMatch: "τσακωθείτε από κοντά →" },
}

// ── No-show warning lines ──────────────────────────────────────
export const NO_GHOST_LINES: Record<Lang, string[]> = {
  en: [
    "bail and lose your credits. your call.",
    "your {amt} credits vanish if you no-show.",
    "back out? there go {amt} credits.",
    "no-shows settle the tab. always.",
  ],
  gr: [
    "κάνε πίσω και χάνεις τα credits σου. δική σου επιλογή.",
    "τα {amt} credits σου εξαφανίζονται αν δεν εμφανιστείς.",
    "το σκας; φεύγουν {amt} credits.",
    "όποιος δεν έρχεται, πληρώνει. πάντα.",
  ],
}

// ── Helpers ────────────────────────────────────────────────────
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
export function getCompatLabel(score: number, lang: Lang = 'en'): CompatLabel {
  if (score >= 80) return pickRandom(COMPAT_HIGH[lang])
  if (score >= 50) return pickRandom(COMPAT_MID[lang])
  return pickRandom(COMPAT_LOW[lang])
}
export function formatNoGhost(amt: number, lang: Lang = 'en'): string {
  return pickRandom(NO_GHOST_LINES[lang]).replace('{amt}', String(amt))
}
