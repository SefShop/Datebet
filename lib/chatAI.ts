// ─────────────────────────────────────────────────────────────────
// Chat AI v2 — unpredictable, moody, human. Not a bot.
// ─────────────────────────────────────────────────────────────────
import type { Lang } from '@/lib/copy'

function pick<T>(a:T[]):T { return a[Math.floor(Math.random()*a.length)] }

export type Mood = 'playful' | 'cold' | 'flirty'

// ── Response pools by mood ──────────────────────────────────────
const POOL: Record<Lang, Record<Mood, string[]>> = {
  en: {
    playful: [
      "okay relax 😅","you got lucky","don't let it go to your head","oh you think you're good now?",
      "that was bold","not bad","hmmm","show me that again","you're full of surprises today",
      "wait what","okay fine 😂","sure sure","keep going","you're funny I'll give you that",
    ],
    cold: [
      "okay","cool","mhm","sure","interesting","k","noted","…","right","I see","if you say so",
      "wow","okay then","whatever you say","not sure about that",
    ],
    flirty: [
      "careful 😏","you're smooth","is that your move?","it's working btw","stop that",
      "I might actually like you","say that again","you're trouble","don't tempt me",
      "okay that was cute","you always like this?","hmm bold",
    ],
  },
  gr: {
    playful: [
      "οκ ηρέμησε 😅","τύχη ήταν","μη σου ανέβει","α νομίζεις είσαι καλός;",
      "τολμηρό","όχι άσχημα","χμμμ","ξανά αυτό","είσαι γεμάτος εκπλήξεις",
      "τι","οκ εντάξει 😂","ναι ναι","συνέχισε","γελάω ρε",
    ],
    cold: [
      "οκ","κουλ","μμ","ναι","ενδιαφέρον","κ","σημειώθηκε","…","σωστά","βλέπω","αν λες",
      "ουάου","οκ τότε","ό,τι πεις","δεν ξέρω",
    ],
    flirty: [
      "πρόσεχε 😏","είσαι smooth","αυτή είναι η κίνησή σου;","δουλεύει btw","σταμάτα",
      "μπορεί να μου αρέσεις","ξαναπές το","είσαι μπελάς","μη με δελεάζεις",
      "οκ αυτό ήταν γλυκό","πάντα έτσι;","χμμ τολμηρό",
    ],
  },
}

// ── Corrections (15%) ───────────────────────────────────────────
const CORRECTIONS: Record<Lang, string[]> = {
  en: ["I mean…","ok wait—","actually no,","hmm wait,","let me rethink that—"],
  gr: ["δηλαδή…","περίμενε—","τελικά όχι,","χμμ περίμενε,","ας το ξανασκεφτώ—"],
}

// ── Micro reactions (filler) ────────────────────────────────────
const MICRO: Record<Lang, string[]> = {
  en: ["…","hmm","okay","lol","sure","wait","oh","right","hah","interesting"],
  gr: ["…","χμμ","οκ","χαχα","ναι","περίμενε","ω","σωστά","χα","ενδιαφέρον"],
}

// ── First messages ──────────────────────────────────────────────
const FIRST: Record<Lang, string[]> = {
  en: ["so…","took you long enough 😏","oh you actually messaged","hey","hmm hi","well well well"],
  gr: ["λοιπόν…","αργήσες 😏","α μου μίλησες τελικά","hey","χμμ γεια","νάτος νάτος"],
}

// ── Context: game result ────────────────────────────────────────
const GAME_WIN: Record<Lang, string[]> = {
  en: ["okay you got lucky","don't get comfortable","fine. you won. barely.","that won't happen again"],
  gr: ["οκ τύχη ήταν","μη βολεύεσαι","εντάξει κέρδισες. μόλις.","δε θα ξαναγίνει"],
}
const GAME_LOSE: Record<Lang, string[]> = {
  en: ["I expected more 😏","you had potential","want some tips?","that was too easy"],
  gr: ["περίμενα περισσότερα 😏","είχες δυναμικό","θες tips;","πολύ εύκολο ήταν"],
}

// ── Memory lines (3+ msgs) ──────────────────────────────────────
const MEMORY: Record<Lang, string[]> = {
  en: ["you play aggressive. noticed.","I see your strategy","you're competitive. I like that.","you always this stubborn?"],
  gr: ["παίζεις επιθετικά. το είδα.","βλέπω τη στρατηγική σου","ανταγωνιστικός. μου αρέσει.","πάντα τόσο πεισματάρης;"],
}

// ── Exit hook ───────────────────────────────────────────────────
const EXIT: Record<Lang, string[]> = {
  en: ["this is fun… imagine this irl","okay I'll admit it. this is better than swiping.","we should do this somewhere real"],
  gr: ["αυτό είναι ωραίο… φαντάσου irl","οκ το παραδέχομαι. καλύτερο από swipe.","πρέπει να το κάνουμε αληθινά"],
}

// ── Quick + Flirt pills ─────────────────────────────────────────
export const QUICK: Record<Lang, string[]> = {
  en: ['your move 😏','rematch?','you got lucky','what\'s the prize?','miss me?','not bad'],
  gr: ['σειρά σου 😏','ρεβάνς;','τύχη ήταν','τι κερδίζω;','μου έλειψες;','όχι άσχημα'],
}
export const FLIRT_QUICK: Record<Lang, string[]> = {
  en: ['loser buys coffee ☕','you owe me a date','you\'re distracting me','double or nothing 😏','you play better in person?'],
  gr: ['ο χαμένος κερνάει ☕','μου χρωστάς ραντεβού','με αποσπάς','διπλό ή τίποτα 😏','παίζεις καλύτερα από κοντά;'],
}

// ── Game result tracker ─────────────────────────────────────────
let _lastResult: 'won'|'lost'|'none' = 'none'
export function setLastGameResult(r: 'won'|'lost'|'none') { _lastResult = r }
export function getLastGameResult() { return _lastResult }

// ── Mood state ──────────────────────────────────────────────────
let _mood: Mood = 'playful'
let _moodCounter = 0
function advanceMood() {
  _moodCounter++
  if (_moodCounter >= 4 + Math.floor(Math.random() * 3)) {
    _moodCounter = 0
    const moods: Mood[] = ['playful','cold','flirty']
    _mood = pick(moods.filter(m => m !== _mood))
  }
}
export function getMood(): Mood { return _mood }
export function resetMood() { _mood = 'playful'; _moodCounter = 0 }

// ── Response result ─────────────────────────────────────────────
export interface ChatResponse {
  messages: string[]     // 1 or 2 messages
  delay: number          // ms before first typing
  behavior: 'normal' | 'ignore' | 'delayed'
  correction: string | null  // prefix if self-correcting
}

export function generateResponse(msgCount: number, userText: string, lang: Lang): ChatResponse {
  advanceMood()

  // 20% chance: ignore (just "read")
  if (msgCount > 1 && Math.random() < 0.20) {
    return { messages: [], delay: 0, behavior: 'ignore', correction: null }
  }

  // 8% chance: delayed reply (8-15s)
  const isDelayed = msgCount > 2 && Math.random() < 0.08
  const baseDelay = isDelayed ? 8000 + Math.random() * 7000 : 1200 + Math.random() * 2300
  // 20% chance of LONG delay (4-6s) even on normal
  const delay = (!isDelayed && Math.random() < 0.20) ? 4000 + Math.random() * 2000 : baseDelay

  // Pick main response
  let text: string
  if (msgCount === 0) {
    text = pick(FIRST[lang])
  } else if (msgCount <= 2 && _lastResult === 'won') {
    text = pick(GAME_WIN[lang])
  } else if (msgCount <= 2 && _lastResult === 'lost') {
    text = pick(GAME_LOSE[lang])
  } else if (msgCount >= 6 && Math.random() < 0.25) {
    text = pick(EXIT[lang])
  } else if (msgCount >= 3 && Math.random() < 0.20) {
    text = pick(MEMORY[lang])
  } else if (Math.random() < 0.18) {
    text = pick(MICRO[lang])  // short filler
  } else {
    text = pick(POOL[lang][_mood])
  }

  // 15% chance: self-correction prefix
  const correction = Math.random() < 0.15 ? pick(CORRECTIONS[lang]) : null

  // 25% chance: double message
  const msgs = [text]
  if (Math.random() < 0.25 && msgCount > 0) {
    const second = pick(POOL[lang][_mood].filter(m => m !== text))
    msgs.push(second)
  }

  // Delayed reply gets a prefix
  if (isDelayed && msgs[0]) {
    const prefix = lang === 'en' ? 'had to think about that one 😅' : 'έπρεπε να το σκεφτώ 😅'
    msgs.unshift(prefix)
  }

  return { messages: msgs, delay, behavior: isDelayed ? 'delayed' : 'normal', correction }
}
