import { ActivityEvent, ActivityType } from '@/types'

// ─────────────────────────────────────────────────────────────────
// Cast of fake profiles — varied enough to feel real
// ─────────────────────────────────────────────────────────────────
const CAST = [
  { name: 'Lena',   emoji: '👩‍🦰', age: 24 },
  { name: 'Mia',    emoji: '👩',   age: 27 },
  { name: 'Zoe',    emoji: '🧕',   age: 25 },
  { name: 'Alex',   emoji: '🧑',   age: 29 },
  { name: 'Nina',   emoji: '👩‍🦱', age: 23 },
  { name: 'Chloe',  emoji: '👱‍♀️', age: 26 },
]

// ─────────────────────────────────────────────────────────────────
// Timestamp pool — feels organic, not algorithmic
// ─────────────────────────────────────────────────────────────────
const TIMESTAMPS = [
  'just now',
  '1 min ago',
  '2 min ago',
  '4 min ago',
  '11 min ago',
  '23 min ago',
  '47 min ago',
  '1h ago',
  '2h ago',
  '3h ago',
  '5h ago',
]

// ─────────────────────────────────────────────────────────────────
// Templates per type
// Each uses {name} as placeholder
// ─────────────────────────────────────────────────────────────────
const TEMPLATES: Record<ActivityType, { headline: string; sub: string; urgency: ActivityEvent['urgency'] }[]> = {
  played_your_vibe: [
    { headline: '{name} played your vibe 👀',        sub: 'see how they answered.',                urgency: 'high' },
    { headline: '{name} checked you out.',            sub: 'and answered the same question.',        urgency: 'mid'  },
    { headline: '{name} is curious about you.',       sub: 'they already played. your move.',        urgency: 'high' },
  ],
  almost_match: [
    { headline: 'you were this close with {name}.',   sub: 'one answer apart. interesting.',         urgency: 'high' },
    { headline: '{name} almost matched you.',         sub: 'different answer. same vibe.',           urgency: 'mid'  },
    { headline: 'so close. {name} went the other way.', sub: 'still worth a conversation.',          urgency: 'mid'  },
  ],
  waiting_to_play: [
    { headline: '{name} is waiting for you.',         sub: "she's ready. are you?",                  urgency: 'high' },
    { headline: 'someone is waiting to play.',        sub: "don't leave them hanging.",               urgency: 'high' },
    { headline: '{name} sent a game challenge.',      sub: 'expires in 24h.',                         urgency: 'high' },
  ],
  answered_question: [
    { headline: '{name} answered your question.',     sub: 'her answer might surprise you.',         urgency: 'mid'  },
    { headline: '{name} played back.',                sub: 'see if you think alike.',                 urgency: 'mid'  },
    { headline: '{name} has a response for you.',     sub: "tap to find out what she said.",          urgency: 'mid'  },
  ],
  pending_match: [
    { headline: 'you have a pending match.',          sub: 'waiting for someone to make a move.',    urgency: 'mid'  },
    { headline: '2 people are ready to play.',        sub: "they're not going to wait forever.",     urgency: 'high' },
    { headline: 'matches are piling up.',             sub: "you're in demand right now.",             urgency: 'low'  },
  ],
  incomplete_game: [
    { headline: 'you left a game unfinished.',        sub: '{name} is still waiting for your answer.', urgency: 'high' },
    { headline: 'finish what you started.',           sub: '{name} answered. you went quiet.',        urgency: 'high' },
    { headline: 'unfinished game with {name}.',       sub: 'she answered 3 hours ago.',               urgency: 'mid'  },
  ],
  new_player: [
    { headline: 'someone new just joined.',           sub: 'and their first game is ready.',         urgency: 'low'  },
    { headline: 'fresh profile. ready to play.',      sub: 'get there before someone else does.',    urgency: 'mid'  },
    { headline: '{name} just signed up.',             sub: 'and she matches your type.',             urgency: 'low'  },
  ],
}

// ─────────────────────────────────────────────────────────────────
// Generator
// ─────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildEvent(type: ActivityType, index: number): ActivityEvent {
  const person    = CAST[index % CAST.length]
  const templates = TEMPLATES[type]
  const template  = pick(templates)

  const headline = template.headline.replace('{name}', person.name)
  const sub      = template.sub.replace('{name}', person.name)

  return {
    id:       `${type}-${index}`,
    type,
    name:     person.name,
    emoji:    person.emoji,
    headline,
    sub,
    timestamp: TIMESTAMPS[Math.min(index * 2, TIMESTAMPS.length - 1)],
    urgency:   template.urgency,
    seen:      index > 2,   // first 3 appear unseen (creates unread badge)
  }
}

// ─────────────────────────────────────────────────────────────────
// The feed — ordered by psychological impact
// High urgency first, then taper off
// ─────────────────────────────────────────────────────────────────
const FEED_ORDER: ActivityType[] = [
  'waiting_to_play',    // 0 — someone needs you NOW
  'almost_match',       // 1 — curiosity hook: "you were close"
  'played_your_vibe',   // 2 — social proof: someone noticed you
  'answered_question',  // 3 — incomplete action: she responded
  'incomplete_game',    // 4 — guilt hook: you went quiet
  'pending_match',      // 5 — FOMO: others are moving
  'new_player',         // 6 — novelty
  'almost_match',       // 7 — second curiosity hit
  'played_your_vibe',   // 8
  'new_player',         // 9
]

export const ACTIVITY_FEED: ActivityEvent[] = FEED_ORDER.map(buildEvent)

// ─────────────────────────────────────────────────────────────────
// Home screen hooks — 3 rotating banners
// ─────────────────────────────────────────────────────────────────
export const HOME_HOOKS = [
  { icon: '👀', text: 'Someone played your vibe.',    cta: 'see who',      urgency: 'high' as const },
  { icon: '🎮', text: 'A game is waiting for you.',   cta: 'play now',     urgency: 'high' as const },
  { icon: '💬', text: '2 people answered your Q.',    cta: 'check it',     urgency: 'mid'  as const },
  { icon: '🔥', text: "You're on someone's radar.",   cta: 'find out',     urgency: 'mid'  as const },
  { icon: '⏳', text: 'Match expires in 24h.',        cta: 'don\'t miss',  urgency: 'high' as const },
  { icon: '✨', text: 'Someone new just joined.',     cta: 'go first',     urgency: 'low'  as const },
]

export const UNREAD_COUNT = ACTIVITY_FEED.filter(e => !e.seen).length
