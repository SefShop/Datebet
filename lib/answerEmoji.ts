// Mystery Choice — answer emoji helper
// Maps an answer's TEXT (and optional trait tags) to a relevant, consistent
// emoji. Replaces the old approach of showing a fixed theme emoji-pair by
// position, which could show an unrelated icon (e.g. "Water" showing a
// Christmas tree) because it ignored the actual answer text.

const NEUTRAL_FALLBACK = '✨'

// Tier 1 — trait tags with unambiguous, safe iconography only.
// Traits without a clean single icon are intentionally omitted so we never
// force a misleading emoji; those fall through to text matching instead.
const TAG_EMOJI: Record<string, string> = {
  likes_travel: '✈️',
  outdoor_person: '🌿',
  homebody: '🏠',
  adventurous: '🧭',
  relaxed: '😌',
  romantic: '❤️',
  deep_talker: '💬',
  dependable: '🤝',
  planner: '📅',
  spontaneous: '⚡',
  career_focused: '💼',
  likes_family: '👨‍👩‍👧',
  creative: '🎨',
  pet_lover: '🐾',
  playful: '😂',
  active: '🏋️',
  balanced: '⚖️',
  casual: '😊',
  city_person: '🌆',
  confident: '💪',
  creature_of_habit: '📅',
  curious: '🔍',
  early_riser: '🌅',
  night_owl: '🌙',
  extrovert: '🧑‍🤝‍🧑',
  introvert: '📖',
  growth_minded: '🌱',
  independent: '🕊️',
  kind: '🙌',
  optimist: '🌤️',
  realist: '🧭',
  sentimental: '💗',
  social: '🧑‍🤝‍🧑',
  storyteller: '📖',
  witty: '😏',
}

// Tier 2 — exact full-phrase matches (checked before keyword matches),
// English and Greek. Keys are normalized (lowercase, trimmed).
const EXACT_PHRASE_EMOJI: Record<string, string> = {
  // Food & drink
  'coffee': '☕', 'tea': '🍵', 'wine': '🍷', 'water': '💧', 'cocktail': '🍹',
  'pizza': '🍕', 'sushi': '🍣', 'cooking': '🍳', 'restaurant': '🍽️', 'dinner out': '🍽️',
  'καφές': '☕', 'τσάι': '🍵', 'κρασί': '🍷', 'νερό': '💧',
  // Places & travel
  'beach': '🏖️', 'sea': '🏖️', 'mountains': '⛰️', 'travel': '✈️', 'road trip': '🚗',
  'city': '🌆', 'nature': '🌿', 'home': '🏠',
  'παραλία': '🏖️', 'θάλασσα': '🏖️', 'βουνό': '⛰️', 'ταξίδι': '✈️',
  // Entertainment & hobbies
  'movies': '🎬', 'netflix': '🎬', 'music': '🎵', 'books': '📚', 'reading': '📚',
  'gaming': '🎮', 'sports': '⚽', 'gym': '🏋️', 'workout': '🏋️', 'dancing': '💃',
  'art': '🎨', 'creative project': '🎨',
  'ταινίες': '🎬', 'μουσική': '🎵', 'βιβλία': '📚', 'γυμναστήριο': '🏋️',
  // People
  'friends': '🧑‍🤝‍🧑', 'family': '👨‍👩‍👧', 'pets': '🐾', 'dog': '🐶', 'cat': '🐱',
  'φίλοι': '🧑‍🤝‍🧑', 'οικογένεια': '👨‍👩‍👧',
  // Relationship values
  'trust': '🤝', 'communication': '💬', 'honesty': '🗣️', 'loyalty': '🛡️',
  'respect': '🙌', 'romance': '❤️', 'affection': '🤗', 'quality time': '⏳', 'humor': '😂',
  'εμπιστοσύνη': '🤝', 'επικοινωνία': '💬', 'ειλικρίνεια': '🗣️', 'ρομαντισμός': '❤️',
  // Lifestyle & future
  'planning': '📅', 'spontaneous': '⚡', 'relaxing': '😌', 'adventure': '🧭',
  'career': '💼', 'future': '🔮', 'children': '👶', 'marriage': '💍',
  'σχεδιασμός': '📅', 'αυθορμητισμός': '⚡',
}

// Tier 3 — keyword substring matches, checked in order (first match wins).
// Covers the natural variety of phrasing in real answer options
// (e.g. "Trying new restaurants", "A close friend", "Cooking at home").
const KEYWORD_EMOJI: [string, string][] = [
  ['coffee', '☕'], ['καφ', '☕'],
  ['tea', '🍵'], ['τσάι', '🍵'],
  ['wine', '🍷'], ['κρασ', '🍷'],
  ['water', '💧'], ['νερ', '💧'],
  ['cocktail', '🍹'],
  ['pizza', '🍕'],
  ['sushi', '🍣'],
  ['cook', '🍳'], ['μαγειρ', '🍳'],
  ['restaurant', '🍽️'], ['dinner', '🍽️'], ['δείπνο', '🍽️'],
  ['beach', '🏖️'], ['sea', '🏖️'], ['παραλ', '🏖️'], ['θάλασσ', '🏖️'],
  ['mountain', '⛰️'], ['βουν', '⛰️'], ['hik', '⛰️'],
  ['road trip', '🚗'], ['drive', '🚗'],
  ['city', '🌆'], ['πόλ', '🌆'], ['urban', '🌆'],
  ['nature', '🌿'], ['outdoor', '🌿'], ['φύσ', '🌿'],
  ['travel', '✈️'], ['ταξίδ', '✈️'], ['destination', '✈️'], ['abroad', '✈️'], ['explor', '🧭'],
  ['home', '🏠'], ['σπίτι', '🏠'], ['cozy', '🏠'],
  ['movie', '🎬'], ['film', '🎬'], ['netflix', '🎬'], ['show', '🎬'], ['ταιν', '🎬'], ['series', '🎬'], ['σειρ', '🎬'],
  ['music', '🎵'], ['song', '🎵'], ['μουσικ', '🎵'], ['τραγούδ', '🎵'], ['concert', '🎵'],
  ['book', '📚'], ['read', '📚'], ['βιβλί', '📚'], ['διαβάζ', '📚'], ['learning', '📚'], ['μαθαίν', '📚'],
  ['game', '🎮'], ['gaming', '🎮'],
  ['sport', '⚽'], ['football', '⚽'],
  ['gym', '🏋️'], ['workout', '🏋️'], ['fitness', '🏋️'], ['exercise', '🏋️'], ['active', '🏋️'], ['γυμναστήρ', '🏋️'], ['run', '🏃'],
  ['danc', '💃'], ['χορ', '💃'],
  ['art', '🎨'], ['creativ', '🎨'], ['paint', '🎨'], ['δημιουργ', '🎨'],
  ['friend', '🧑‍🤝‍🧑'], ['φίλ', '🧑‍🤝‍🧑'], ['social', '🧑‍🤝‍🧑'], ['group', '🧑‍🤝‍🧑'], ['crowd', '🧑‍🤝‍🧑'], ['party', '🎉'],
  ['family', '👨‍👩‍👧'], ['οικογέν', '👨‍👩‍👧'], ['sibling', '👨‍👩‍👧'],
  ['pet', '🐾'],
  ['dog', '🐶'], ['σκύλ', '🐶'],
  ['cat', '🐱'], ['γάτ', '🐱'],
  ['trust', '🤝'], ['εμπιστοσύν', '🤝'], ['consistent', '🤝'], ['dependable', '🤝'], ['loyal', '🛡️'], ['αφοσίωσ', '🛡️'],
  ['communicat', '💬'], ['επικοινων', '💬'], ['talk', '💬'], ['conversation', '💬'], ['συζήτησ', '💬'],
  ['honest', '🗣️'], ['ειλικρίν', '🗣️'],
  ['respect', '🙌'], ['σεβασμ', '🙌'],
  ['romanc', '❤️'], ['ρομαντ', '❤️'], ['love', '❤️'], ['αγάπ', '❤️'], ['heart', '❤️'], ['καρδι', '❤️'],
  ['affection', '🤗'], ['τρυφερότητ', '🤗'], ['hug', '🤗'], ['touch', '🤗'],
  ['quality time', '⏳'], ['ποιοτικός χρόνος', '⏳'],
  ['humor', '😂'], ['funny', '😂'], ['χιούμορ', '😂'], ['laugh', '😂'], ['γελ', '😂'], ['joke', '😂'],
  ['plan', '📅'], ['σχεδι', '📅'], ['structure', '📅'], ['routine', '📅'], ['ρουτίν', '📅'],
  ['spontan', '⚡'], ['αυθόρμητ', '⚡'], ['impulsiv', '⚡'],
  ['relax', '😌'], ['calm', '😌'], ['quiet', '😌'], ['χαλαρ', '😌'], ['peace', '😌'], ['ήσυχ', '😌'],
  ['adventur', '🧭'], ['περιπέτει', '🧭'], ['bold', '🧭'], ['thrill', '🧭'],
  ['career', '💼'], ['job', '💼'], ['work', '💼'], ['καριέρ', '💼'], ['δουλει', '💼'], ['business', '💼'], ['ambition', '💼'],
  ['future', '🔮'], ['μέλλον', '🔮'], ['dream', '🔮'], ['vision', '🔮'],
  ['child', '👶'], ['kid', '👶'], ['baby', '👶'], ['παιδ', '👶'],
  ['marriage', '💍'], ['wedding', '💍'], ['γάμ', '💍'], ['engage', '💍'],
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'()]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Return a relevant, consistent emoji for an answer option.
 *
 * Priority order:
 *   1. Trait tags (when provided and mapped)
 *   2. Exact full-phrase match (English or Greek)
 *   3. Keyword substring match
 *   4. Neutral fallback (✨) — logged in development so mismatches are visible
 */
export function getAnswerEmoji(answerText: string, tags?: string[]): string {
  // If the answer text already contains an explicit emoji, preserve it as-is.
  const existingEmoji = answerText.match(/\p{Extended_Pictographic}/u)
  if (existingEmoji) return existingEmoji[0]

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      if (TAG_EMOJI[tag]) return TAG_EMOJI[tag]
    }
  }

  const normalized = normalize(answerText)

  if (EXACT_PHRASE_EMOJI[normalized]) return EXACT_PHRASE_EMOJI[normalized]

  for (const [keyword, emoji] of KEYWORD_EMOJI) {
    if (normalized.includes(keyword)) return emoji
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('MYSTERY EMOJI FALLBACK:', answerText, tags && tags.length ? `(tags: ${tags.join(', ')})` : '')
  }
  return NEUTRAL_FALLBACK
}
