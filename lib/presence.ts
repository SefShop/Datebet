// ─────────────────────────────────────────────────────────────────
// Presence Engine
//
// Simulates a real person's decision timeline.
// Key insight: humans are unpredictable in timing but
// predictable in emotional arc. We fake the arc.
// ─────────────────────────────────────────────────────────────────

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
  headline: string          // e.g. "Sofia is thinking..."
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
  headline: string
  sub: string
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
    headline: 'Sofia opened the app.',
    sub: 'she saw the notification.',
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.4)',
    tone: 'neutral',
  },
  {
    status: 'saw_bet',
    minDelay: 2000, maxDelay: 5000,
    headline: 'She saw your bet.',
    sub: "she's reading the terms.",
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.5)',
    tone: 'hopeful',
  },
  {
    status: 'thinking',
    minDelay: 3000, maxDelay: 7000,
    headline: 'Sofia is thinking...',
    sub: "she hasn't decided yet.",
    avatarPulse: 'soft', avatarGlow: 'rgba(255,140,66,0.35)',
    tone: 'uncertain',
  },
  {
    status: 'hesitating',
    minDelay: 4000, maxDelay: 9000,
    headline: 'She went quiet.',
    sub: 'interesting. she usually decides fast.',
    avatarPulse: 'none', avatarGlow: 'rgba(255,140,66,0.2)',
    tone: 'tense',
  },
  {
    status: 'typing',
    minDelay: 2000, maxDelay: 5000,
    headline: 'Sofia is typing...',
    sub: "she's about to make a move.",
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.5)',
    tone: 'hopeful',
  },
  {
    status: 'close',
    minDelay: 1500, maxDelay: 3500,
    headline: "she's deciding.",
    sub: '3... 2...',
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.7)',
    tone: 'relief',
  },
  {
    status: 'locked_in',
    minDelay: 800,  maxDelay: 2000,
    headline: "she locked in.",
    sub: "you're both in. no backing out.",
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.9)',
    tone: 'relief',
  },
]

// Slower, more doubt-inducing version
export const SCRIPT_SLOW: ScriptEntry[] = [
  {
    status: 'opened_app',
    minDelay: 3000, maxDelay: 7000,
    headline: 'Sofia opened the app.',
    sub: 'took her a moment.',
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.3)',
    tone: 'neutral',
  },
  {
    status: 'saw_bet',
    minDelay: 4000, maxDelay: 8000,
    headline: 'She saw the bet.',
    sub: "she's not saying anything.",
    avatarPulse: 'soft', avatarGlow: 'rgba(109,99,255,0.4)',
    tone: 'uncertain',
  },
  {
    status: 'thinking',
    minDelay: 5000, maxDelay: 11000,
    headline: 'Sofia is deciding...',
    sub: 'longer than expected.',
    avatarPulse: 'none', avatarGlow: 'rgba(255,140,66,0.25)',
    tone: 'tense',
  },
  {
    status: 'hesitating',
    minDelay: 5000, maxDelay: 10000,
    headline: 'She took longer than expected.',
    sub: 'either she\'s careful, or she\'s not sure.',
    avatarPulse: 'none', avatarGlow: 'rgba(255,140,66,0.2)',
    tone: 'tense',
  },
  {
    status: 'thinking',
    minDelay: 3000, maxDelay: 6000,
    headline: 'Still thinking...',
    sub: "the silence says something.",
    avatarPulse: 'soft', avatarGlow: 'rgba(255,140,66,0.3)',
    tone: 'tense',
  },
  {
    status: 'typing',
    minDelay: 2000, maxDelay: 4000,
    headline: 'Sofia is typing...',
    sub: 'finally.',
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.5)',
    tone: 'hopeful',
  },
  {
    status: 'close',
    minDelay: 1000, maxDelay: 2500,
    headline: "almost...",
    sub: "don't look away.",
    avatarPulse: 'strong', avatarGlow: 'rgba(253,41,123,0.7)',
    tone: 'relief',
  },
  {
    status: 'locked_in',
    minDelay: 600, maxDelay: 1400,
    headline: "she locked in.",
    sub: "you're both in. no backing out.",
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
