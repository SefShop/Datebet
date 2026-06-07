// ─────────────────────────────────────────────────────────────────
// In-game chat engine v2 — premium, context-aware, bilingual.
// Sofia feels like a real presence, not a chatbot.
// ─────────────────────────────────────────────────────────────────
import type { Lang } from '@/lib/copy'

function pick<T>(a:T[]):T { return a[Math.floor(Math.random()*a.length)] }

export type GameEvent = 'user_move'|'ai_move'|'user_win'|'ai_win'|'draw'|'idle'|'near_win'|'streak'|'losing_bad'

// ── Quick tappable messages ─────────────────────────────────────
export const QUICK_MSGS: Record<Lang, string[]> = {
  en: ['your move 😏','that was lucky','don\'t choke','again?','too slow','watch this'],
  gr: ['σειρά σου 😏','τύχη ήταν','μη χαλάσεις','ξανά;','πολύ αργά','πρόσεχε'],
}

// ── Flirt options ───────────────────────────────────────────────
export const FLIRT_OPTIONS: Record<Lang, string[]> = {
  en: [
    'loser buys coffee ☕',
    'if I win, you owe me a date',
    'you\'re distracting me on purpose',
    'you play better than you talk?',
    'double or nothing 😏',
  ],
  gr: [
    'ο χαμένος κερνάει καφέ ☕',
    'αν κερδίσω, μου χρωστάς ραντεβού',
    'με αποσπάς επίτηδες',
    'παίζεις καλύτερα απ\' ό,τι μιλάς;',
    'διπλό ή τίποτα 😏',
  ],
}

// ── Smart prompts (context-aware suggestions above chat) ────────
export const PROMPTS: Record<Lang, Record<GameEvent, string[]>> = {
  en: {
    user_move: ['push her a bit','call that move out','don\'t stay quiet now','say something back'],
    ai_move:   ['react','let her know you noticed','don\'t let that slide'],
    user_win:  ['rub it in a little','be cool about it... or not','own it'],
    ai_win:    ['demand a rematch','play it off','don\'t give her the satisfaction'],
    draw:      ['break the tension','make it personal','raise the stakes'],
    idle:      ['say something first','break the ice','make the first move'],
    near_win:  ['this is it — say something','now or never','finish strong'],
    streak:    ['she\'s on a roll — say something','don\'t let her get comfortable'],
    losing_bad:['change the energy','distract her','pivot'],
  },
  gr: {
    user_move: ['πίεσέ την λίγο','σχολίασε αυτό','μη μείνεις σιωπηλός','πες κάτι πίσω'],
    ai_move:   ['αντίδρασε','δείξε ότι πρόσεξες','μην το αφήσεις'],
    user_win:  ['τρίψ\' το λίγο','μείνε cool... ή όχι','κέρδισέ το'],
    ai_win:    ['ζήτα ρεβάνς','πέρασέ το ψιλά','μη της δίνεις ικανοποίηση'],
    draw:      ['σπάσε την ένταση','κάν\' το προσωπικό','ανέβασε πόντους'],
    idle:      ['πες κάτι πρώτος','σπάσε τον πάγο','κάνε την πρώτη κίνηση'],
    near_win:  ['τώρα ή ποτέ','αυτό είναι — πες κάτι','τελείωσέ το'],
    streak:    ['πάει καλά — πες κάτι','μη τη βολεύεις'],
    losing_bad:['άλλαξε ενέργεια','αποσυντόνισέ την','αλλαγή τακτικής'],
  },
}

// ── Sofia responses — varied, playful, competitive, sometimes flirty ──
const OPPONENT_LINES: Record<Lang, Record<GameEvent, string[]>> = {
  en: {
    user_move: [
      'hmm… interesting move','you\'re thinking too much','I\'m watching how you play',
      'okay, I see you','is that confidence or recklessness?','noted.',
    ],
    ai_move: [
      'your turn 👀','beat that','watch and learn','try keeping up',
      'that\'s how it\'s done','you\'re welcome for the lesson',
    ],
    user_win: [
      'okay… that was actually good','didn\'t expect that from you',
      'you\'re getting confident','fine. you earned that.',
      'don\'t let it go to your head','respect. this time.',
    ],
    ai_win: [
      'you walked into that','I saw that coming 😏','you hesitated. I didn\'t.',
      'too predictable','maybe next time','that was too easy',
    ],
    draw: [
      'we\'re too evenly matched','this isn\'t over','again. right now.',
      'okay that\'s annoying','neither of us lost. yet.',
    ],
    idle: ['you\'re quiet…','still there?','waiting on you','say something'],
    near_win: [
      'don\'t mess this up','this is where people choke',
      'one more… can you handle it?','I can feel you panicking',
    ],
    streak: [
      'you got lucky… twice?','okay slow down',
      'someone\'s feeling themselves','don\'t get cocky',
    ],
    losing_bad: [
      'okay relax 😅','you\'re rushing now',
      'take a breath','you\'re playing angry',
    ],
  },
  gr: {
    user_move: [
      'χμμ… ενδιαφέρουσα κίνηση','το σκέφτεσαι πολύ','βλέπω πώς παίζεις',
      'οκ, σε βλέπω','αυτοπεποίθηση ή απερισκεψία;','σημειώθηκε.',
    ],
    ai_move: [
      'σειρά σου 👀','κάνε καλύτερα','πρόσεχε και μάθε','προσπάθησε να ακολουθήσεις',
      'έτσι γίνεται','παρακαλώ για το μάθημα',
    ],
    user_win: [
      'οκ… αυτό ήταν καλό','δεν το περίμενα από σένα',
      'παίρνεις θάρρος','εντάξει. το κέρδισες.',
      'μη σου ανέβει στο κεφάλι','σεβασμός. αυτή τη φορά.',
    ],
    ai_win: [
      'μπήκες μόνος σου','το έβλεπα 😏','δίστασες. εγώ όχι.',
      'πολύ προβλέψιμος','ίσως την επόμενη','πολύ εύκολο',
    ],
    draw: [
      'είμαστε πολύ ίσοι','δεν τελείωσε','ξανά. τώρα.',
      'οκ αυτό εκνευρίζει','κανείς δεν έχασε. ακόμα.',
    ],
    idle: ['σιωπηλός…','ακόμα εδώ;','σε περιμένω','πες κάτι'],
    near_win: [
      'μην τα κάνεις χειρότερα','εδώ χάνονται οι πιο πολλοί',
      'ακόμα μία… αντέχεις;','νιώθω τον πανικό σου',
    ],
    streak: [
      'τύχη ήταν… δύο φορές;','οκ σιγά',
      'κάποιος αισθάνεται ωραία','μη ξιπάζεσαι',
    ],
    losing_bad: [
      'οκ ηρέμησε 😅','βιάζεσαι τώρα',
      'πάρε μια ανάσα','παίζεις θυμωμένα',
    ],
  },
}

// ── Floating micro-reactions ────────────────────────────────────
export const TOAST_LINES: Record<Lang, string[]> = {
  en: ['clean move','risky','bold','sharp','unexpected','she noticed that'],
  gr: ['καθαρή κίνηση','ρίσκο','τολμηρό','κοφτερό','απρόσμενο','το πρόσεξε'],
}

// ── Exports ─────────────────────────────────────────────────────
export function getOpponentResponse(event:GameEvent, lang:Lang):string { return pick(OPPONENT_LINES[lang][event]) }
export function getPrompt(event:GameEvent, lang:Lang):string { return pick(PROMPTS[lang][event]) }
export function getToast(lang:Lang):string { return pick(TOAST_LINES[lang]) }

// Should Sofia respond? ~60% for moves, 100% for wins/draws/context
export function shouldRespond(event:GameEvent):boolean {
  if(['user_win','ai_win','draw','near_win','streak','losing_bad'].includes(event)) return true
  return Math.random() < 0.6
}
