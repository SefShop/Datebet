export type Screen =
  | 'splash' | 'home' | 'game' | 'suspense' | 'result'
  | 'bet' | 'bet_commit' | 'bet_locked'
  | 'activity'

export interface Profile {
  id: string; name: string; age: number
  location: string; distance: string; emoji: string; compatibility: number
}
export interface GameOption { id: string; emoji: string; text: string; sub: string }
export interface GameQuestion { id: string; type: string; category?: string; question: string; options: GameOption[] }

// Bilingual source shapes (live in data.ts, localized at render)
export interface LangStr { en: string; gr: string }
export interface BiOption { id: string; emoji: string; text: LangStr; sub: LangStr }
export interface BiQuestion { id: string; category: string; type: LangStr; question: LangStr; options: BiOption[] }
export interface GameState {
  userAnswer: string | null; opponentAnswer: string | null
  isMatch: boolean | null; compatibilityScore: number
}

export type BetStatus = 'idle' | 'committed' | 'waiting' | 'matched' | 'ghosted'
export interface BetState {
  amount: number
  status: BetStatus
  lockedAt: number | null     // timestamp ms
  expiresAt: number | null    // lockedAt + 24h
  userIn: boolean
  opponentIn: boolean
}

export type ActivityType =
  | 'played_your_vibe' | 'almost_match' | 'waiting_to_play'
  | 'answered_question' | 'pending_match' | 'incomplete_game' | 'new_player'

export interface ActivityEvent {
  id: string; type: ActivityType; name: string; emoji: string
  headline: string; sub: string; timestamp: string
  urgency: 'low' | 'mid' | 'high'; seen: boolean
}

// ── Personalization ────────────────────────────────────────────
export type AnswerBoldness = 'bold' | 'safe' | 'honest' | 'chaotic' | 'neutral'
export type SpeedTier      = 'instant' | 'fast' | 'normal' | 'slow' | 'very_slow'

export interface SessionProfile {
  answerSpeedMs: number | null       // how long they took on this answer
  speedTier: SpeedTier | null
  boldness: AnswerBoldness | null    // classification of their choice
  answerHistory: string[]            // option ids across questions
  boldnessHistory: AnswerBoldness[]  // pattern across rounds
  behaviorHistory: { speed: SpeedTier | null; boldness: AnswerBoldness }[]  // per-round behavior
  roundCount: number
}

// ── Re-engagement ──────────────────────────────────────────────
export type AbsenceTier = 'fresh' | 'short' | 'medium' | 'long' | 'very_long'

export interface ReturnState {
  isReturn: boolean
  absenceTier: AbsenceTier
  absenceMs: number
  headline: string
  sub: string
  cta: string
  event: string      // what "happened" while they were away
}
