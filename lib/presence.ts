// ─────────────────────────────────────────────────────────────────
// Presence Engine
//
// Simulates a real person's decision timeline.
// Key insight: humans are unpredictable in timing but
// predictable in emotional arc. We fake the arc.
// ─────────────────────────────────────────────────────────────────

import type { LangStr } from '@/types'

export type PresenceStatus =
  | 'idle'
  | 'opened_app'
  | 'saw_bet'
  | 'typing'
  | 'thinking'
  | 'hesitating'
  | 'close'
  | 'locked_in'
  | 'ghosted'   // only fires if demo mode triggers it

export interface PresenceEvent {
  id: string
  status: PresenceStatus
  // What the UI shows
  headline: string          // e.g. "Opponent is thinking..."
  sub: string               // e.g. "she opened the app 2 min ago"
  // Avatar behavior
  avatarPulse: 'none' | 'soft' | 'strong'
  avatarGlow: string        // css color or 'none'
  // Emotional tone for the observer
  tone: 'neutral' | 'hopeful' | 'uncertain' | 'tense' | 'relief'
}

// ─────────────────────────────────────────────────────────────────
// The script — ordered events with variable delays
// delay = ms from previous event (randomised within range)
// ─────────────────────────────────────────────────────────────────
export interface ScriptEntry {
  status: PresenceStatus
  minDelay: number    // ms
  maxDelay: number
  headline: LangStr
  sub: LangStr
  avatarPulse: PresenceEvent['avatarPulse']
  avatarGlow: string
  tone: PresenceEvent['tone']
}

// Two possible scripts — matched (she locks in) or ghost (demo only)
// In the real app, the backend would drive this.
// Here we pick a script on mount and run it.

export const SCRIPT_LOCKS_IN: ScriptEntry[] = [
  {
    status: 'opened_app',
    minDelay: 1800, maxDelay: 4200,
    headline: { en: 'Someone opened the app.', gr: 'Κάποιος άνοιξε το app.' },
    sub: { en: 'she saw the notification.', gr: 'είδε την ειδοποίηση.' },
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.4)',
    tone: 'neutral',
  },
  {
    status: 'saw_bet',
    minDelay: 2000, maxDelay: 5000,
    headline: { en: 'She saw your bet.', gr: 'Είδε το στοίχημά σου.' },
    sub: { en: "she's reading the terms.", gr: "διαβάζει τους όρους." },
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.5)',
    tone: 'hopeful',
  },
  {
    status: 'thinking',
    minDelay: 3000, maxDelay: 7000,
    headline: { en: 'Opponent is thinking...', gr: 'Αντίπαλος σκέφτεται...' },
    sub: { en: "she hasn't decided yet.", gr: "δεν έχει αποφασίσει ακόμα." },
    avatarPulse: 'soft', avatarGlow: 'rgba(255,140,66,0.35)',
    tone: 'uncertain',
  },
  {
    status: 'hesitating',
    minDelay: 4000, maxDelay: 9000,
    headline: { en: 'She went quiet.', gr: 'Σώπασε.' },
    sub: { en: 'interesting. she usually decides fast.', gr: 'περίεργο. συνήθως αποφασίζει γρήγορα.' },
    avatarPulse: 'none', avatarGlow: 'rgba(255,140,66,0.2)',
    tone: 'tense',
  },
  {
    status: 'typing',
    minDelay: 2000, maxDelay: 5000,
    headline: { en: 'Someone is typing...', gr: 'Κάποιος γράφει...' },
    sub: { en: "she's about to make a move.", gr: "ετοιμάζεται να κάνει κίνηση." },
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.5)',
    tone: 'hopeful',
  },
  {
    status: 'close',
    minDelay: 1500, maxDelay: 3500,
    headline: { en: "she's deciding.", gr: "αποφασίζει." },
    sub: { en: '3... 2...', gr: '3... 2...' },
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.7)',
    tone: 'relief',
  },
  {
    status: 'locked_in',
    minDelay: 800,  maxDelay: 2000,
    headline: { en: "she locked in.", gr: "κλείδωσε." },
    sub: { en: "you're both in. no backing out.", gr: "είστε κι οι δύο μέσα. πίσω γυρισμός δεν υπάρχει." },
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.9)',
    tone: 'relief',
  },
]

// Slower, more doubt-inducing version
export const SCRIPT_SLOW: ScriptEntry[] = [
  {
    status: 'opened_app',
    minDelay: 3000, maxDelay: 7000,
    headline: { en: 'Someone opened the app.', gr: 'Κάποιος άνοιξε το app.' },
    sub: { en: 'took her a moment.', gr: 'της πήρε μια στιγμή.' },
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.3)',
    tone: 'neutral',
  },
  {
    status: 'saw_bet',
    minDelay: 4000, maxDelay: 8000,
    headline: { en: 'She saw the bet.', gr: 'Είδε το στοίχημα.' },
    sub: { en: "she's not saying anything.", gr: "δεν λέει τίποτα." },
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.4)',
    tone: 'uncertain',
  },
  {
    status: 'thinking',
    minDelay: 5000, maxDelay: 11000,
    headline: { en: 'Someone is deciding...', gr: 'Κάποιος αποφασίζει...' },
    sub: { en: 'longer than expected.', gr: 'πιο πολύ απ\' όσο περίμενες.' },
    avatarPulse: 'none', avatarGlow: 'rgba(255,140,66,0.25)',
    tone: 'tense',
  },
  {
    status: 'hesitating',
    minDelay: 5000, maxDelay: 10000,
    headline: { en: 'She took longer than expected.', gr: 'Άργησε πιο πολύ απ\' όσο περίμενες.' },
    sub: { en: 'either she\'s careful, or she\'s not sure.', gr: 'ή είναι προσεκτική, ή δεν είναι σίγουρη.' },
    avatarPulse: 'none', avatarGlow: 'rgba(255,140,66,0.2)',
    tone: 'tense',
  },
  {
    status: 'thinking',
    minDelay: 3000, maxDelay: 6000,
    headline: { en: 'Still thinking...', gr: 'Ακόμα σκέφτεται...' },
    sub: { en: "the silence says something.", gr: "η σιωπή λέει κάτι." },
    avatarPulse: 'soft', avatarGlow: 'rgba(255,140,66,0.3)',
    tone: 'tense',
  },
  {
    status: 'typing',
    minDelay: 2000, maxDelay: 4000,
    headline: { en: 'Someone is typing...', gr: 'Κάποιος γράφει...' },
    sub: { en: 'finally.', gr: 'επιτέλους.' },
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.5)',
    tone: 'hopeful',
  },
  {
    status: 'close',
    minDelay: 1000, maxDelay: 2500,
    headline: { en: "almost...", gr: "σχεδόν..." },
    sub: { en: "don't look away.", gr: "μην κοιτάς αλλού." },
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.7)',
    tone: 'relief',
  },
  {
    status: 'locked_in',
    minDelay: 600, maxDelay: 1400,
    headline: { en: "she locked in.", gr: "κλείδωσε." },
    sub: { en: "you're both in. no backing out.", gr: "είστε κι οι δύο μέσα. πίσω γυρισμός δεν υπάρχει." },
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.9)',
    tone: 'relief',
  },
]

// Pick script randomly — 60% fast, 40% slow
export function pickScript(): ScriptEntry[] {
  return Math.random() < 0.6 ? SCRIPT_LOCKS_IN : SCRIPT_SLOW
}

// Resolve a random delay within range
export function resolveDelay(entry: ScriptEntry): number {
  return entry.minDelay + Math.random() * (entry.maxDelay - entry.minDelay)
}

// Tone → color mapping for UI hints
export const TONE_COLOR: Record<PresenceEvent['tone'], string> = {
  neutral:   'rgba(255,255,255,0.3)',
  hopeful:   'rgba(109,99,255,0.8)',
  uncertain: 'rgba(255,140,66,0.8)',
  tense:     'rgba(255,80,80,0.7)',
  relief:    'rgba(253,41,123,0.9)',
}
