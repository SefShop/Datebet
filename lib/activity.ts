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
const TIMESTAMPS: { en: string; gr: string }[] = [
  { en: 'just now',    gr: 'μόλις τώρα' },
  { en: '1 min ago',   gr: 'πριν 1 λεπτό' },
  { en: '2 min ago',   gr: 'πριν 2 λεπτά' },
  { en: '4 min ago',   gr: 'πριν 4 λεπτά' },
  { en: '11 min ago',  gr: 'πριν 11 λεπτά' },
  { en: '23 min ago',  gr: 'πριν 23 λεπτά' },
  { en: '47 min ago',  gr: 'πριν 47 λεπτά' },
  { en: '1h ago',      gr: 'πριν 1 ώρα' },
  { en: '2h ago',      gr: 'πριν 2 ώρες' },
  { en: '3h ago',      gr: 'πριν 3 ώρες' },
  { en: '5h ago',      gr: 'πριν 5 ώρες' },
]

// ─────────────────────────────────────────────────────────────────
// Templates per type
// Each uses {name} as placeholder
// ─────────────────────────────────────────────────────────────────
const TEMPLATES: Record<ActivityType, { headline: { en:string; gr:string }; sub: { en:string; gr:string }; urgency: ActivityEvent['urgency'] }[]> = {
  played_your_vibe: [
    { headline: { en: '{name} played your vibe 👀', gr: 'η {name} έπαιξε το vibe σου 👀' }, sub: { en: 'see how they answered.', gr: 'δες πώς απάντησε.' }, urgency: 'high' },
    { headline: { en: '{name} checked you out.', gr: 'η {name} σε κοίταξε.' }, sub: { en: 'and answered the same question.', gr: 'και απάντησε την ίδια ερώτηση.' }, urgency: 'mid' },
    { headline: { en: '{name} is curious about you.', gr: 'η {name} είναι περίεργη για σένα.' }, sub: { en: 'they already played. your move.', gr: 'ήδη έπαιξε. σειρά σου.' }, urgency: 'high' },
  ],
  almost_match: [
    { headline: { en: 'you were this close with {name}.', gr: 'ήσουν τόσο κοντά με την {name}.' }, sub: { en: 'one answer apart. interesting.', gr: 'μία απάντηση μακριά. ενδιαφέρον.' }, urgency: 'high' },
    { headline: { en: '{name} almost matched you.', gr: 'η {name} παραλίγο να ταιριάξει.' }, sub: { en: 'different answer. same vibe.', gr: 'άλλη απάντηση. ίδιο vibe.' }, urgency: 'mid' },
    { headline: { en: 'so close. {name} went the other way.', gr: 'τόσο κοντά. η {name} πήγε αλλιώς.' }, sub: { en: 'still worth a conversation.', gr: 'αξίζει πάλι μια κουβέντα.' }, urgency: 'mid' },
  ],
  waiting_to_play: [
    { headline: { en: '{name} is waiting for you.', gr: 'η {name} σε περιμένει.' }, sub: { en: "she's ready. are you?", gr: 'είναι έτοιμη. εσύ;' }, urgency: 'high' },
    { headline: { en: 'someone is waiting to play.', gr: 'κάποια περιμένει να παίξει.' }, sub: { en: "don't leave them hanging.", gr: 'μην την αφήνεις να περιμένει.' }, urgency: 'high' },
    { headline: { en: '{name} sent a game challenge.', gr: 'η {name} σου έστειλε πρόκληση.' }, sub: { en: 'expires in 24h.', gr: 'λήγει σε 24 ώρες.' }, urgency: 'high' },
  ],
  answered_question: [
    { headline: { en: '{name} answered your question.', gr: 'η {name} απάντησε την ερώτησή σου.' }, sub: { en: 'her answer might surprise you.', gr: 'η απάντησή της ίσως σε εκπλήξει.' }, urgency: 'mid' },
    { headline: { en: '{name} played back.', gr: 'η {name} απάντησε.' }, sub: { en: 'see if you think alike.', gr: 'δες αν σκέφτεστε ίδια.' }, urgency: 'mid' },
    { headline: { en: '{name} has a response for you.', gr: 'η {name} έχει απάντηση για σένα.' }, sub: { en: 'tap to find out what she said.', gr: 'πάτα να δεις τι είπε.' }, urgency: 'mid' },
  ],
  pending_match: [
    { headline: { en: 'you have a pending match.', gr: 'έχεις ένα match σε εκκρεμότητα.' }, sub: { en: 'waiting for someone to make a move.', gr: 'περιμένει κάποιον να κάνει κίνηση.' }, urgency: 'mid' },
    { headline: { en: '2 people are ready to play.', gr: '2 άτομα είναι έτοιμα να παίξουν.' }, sub: { en: "they're not going to wait forever.", gr: 'δεν θα περιμένουν για πάντα.' }, urgency: 'high' },
    { headline: { en: 'matches are piling up.', gr: 'τα matches μαζεύονται.' }, sub: { en: "you're in demand right now.", gr: 'έχεις ζήτηση αυτή τη στιγμή.' }, urgency: 'low' },
  ],
  incomplete_game: [
    { headline: { en: 'you left a game unfinished.', gr: 'άφησες ένα παιχνίδι στη μέση.' }, sub: { en: '{name} is still waiting for your answer.', gr: 'η {name} περιμένει ακόμα την απάντησή σου.' }, urgency: 'high' },
    { headline: { en: 'finish what you started.', gr: 'τελείωσε αυτό που ξεκίνησες.' }, sub: { en: '{name} answered. you went quiet.', gr: 'η {name} απάντησε. εσύ σώπασες.' }, urgency: 'high' },
    { headline: { en: 'unfinished game with {name}.', gr: 'ημιτελές παιχνίδι με την {name}.' }, sub: { en: 'she answered 3 hours ago.', gr: 'απάντησε πριν 3 ώρες.' }, urgency: 'mid' },
  ],
  new_player: [
    { headline: { en: '{name} just signed up.', gr: 'η {name} μόλις έκανε εγγραφή.' }, sub: { en: 'and she matches your type.', gr: 'και ταιριάζει στον τύπο σου.' }, urgency: 'low' },
    { headline: { en: 'someone new just joined.', gr: 'κάποια νέα μόλις μπήκε.' }, sub: { en: 'be the first to play her.', gr: 'γίνε ο πρώτος που θα παίξει.' }, urgency: 'low' },
    { headline: { en: '{name} is new here.', gr: 'η {name} είναι καινούργια εδώ.' }, sub: { en: 'fresh face. your move.', gr: 'φρέσκο πρόσωπο. σειρά σου.' }, urgency: 'low' },
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
  const ts        = TIMESTAMPS[Math.min(index * 2, TIMESTAMPS.length - 1)]

  return {
    id:       `${type}-${index}`,
    type,
    name:     person.name,
    emoji:    person.emoji,
    headline: { en: template.headline.en.replace('{name}', person.name), gr: template.headline.gr.replace('{name}', person.name) },
    sub:      { en: template.sub.en.replace('{name}', person.name),      gr: template.sub.gr.replace('{name}', person.name) },
    timestamp: { en: ts.en, gr: ts.gr },
    urgency:   template.urgency,
    seen:      index > 2,
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
import type { Lang } from '@/lib/copy'

export const HOME_HOOKS: Record<Lang, { icon: string; text: string; cta: string; urgency: 'high'|'mid'|'low' }[]> = {
  en: [
    { icon: '👀', text: 'Someone played your vibe.',  cta: 'see who',    urgency: 'high' },
    { icon: '🎮', text: 'A game is waiting for you.', cta: 'play now',   urgency: 'high' },
    { icon: '💬', text: '2 people answered your Q.',  cta: 'check it',   urgency: 'mid'  },
    { icon: '🔥', text: "You're on someone's radar.", cta: 'find out',   urgency: 'mid'  },
    { icon: '⏳', text: 'Match expires in 24h.',      cta: "don't miss", urgency: 'high' },
    { icon: '✨', text: 'Someone new just joined.',   cta: 'go first',   urgency: 'low'  },
  ],
  gr: [
    { icon: '👀', text: 'Κάποιος έπαιξε το vibe σου.', cta: 'δες ποιος',   urgency: 'high' },
    { icon: '🎮', text: 'Σε περιμένει ένα παιχνίδι.',  cta: 'παίξε τώρα',  urgency: 'high' },
    { icon: '💬', text: '2 άτομα απάντησαν στην ερώτησή σου.', cta: 'δες το', urgency: 'mid' },
    { icon: '🔥', text: 'Είσαι στο ραντάρ κάποιου.',   cta: 'μάθε',        urgency: 'mid'  },
    { icon: '⏳', text: 'Το match λήγει σε 24 ώρες.',  cta: 'μη το χάσεις', urgency: 'high' },
    { icon: '✨', text: 'Κάποιος νέος μόλις μπήκε.',    cta: 'πρόλαβε',     urgency: 'low'  },
  ],
}

export const UNREAD_COUNT = ACTIVITY_FEED.filter(e => !e.seen).length
