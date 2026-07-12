// Bio language detection — runs once, at save time, never on every render.
// Uses franc-min (lightweight, dependency-light n-gram detector, no external
// API call, no network request) so this never depends on the translation
// provider being configured.
import { franc } from 'franc-min'

// franc returns ISO 639-3 codes; the rest of the app (and the translation
// provider) works with the more common ISO 639-1 codes.
const ISO_639_3_TO_1: Record<string, string> = {
  ell: 'el', // Greek
  eng: 'en', // English
  fra: 'fr', // French
  spa: 'es', // Spanish
  deu: 'de', // German
  ita: 'it', // Italian
}

// Below this length, detection is unreliable enough that we'd rather say
// "unknown" than guess wrong — matches the product requirement directly.
const MIN_RELIABLE_LENGTH = 12

/**
 * Detect the language of a bio. Returns a standard ISO 639-1 code
 * ("el", "en", "fr", "es", "de", "it") or "und" if detection isn't
 * reliable (too short, or an unsupported/ambiguous language).
 */
export function detectBioLanguage(bio: string): string {
  const trimmed = (bio || '').trim()
  if (trimmed.length < MIN_RELIABLE_LENGTH) {
    console.log('BIO LANGUAGE DETECTED:', 'und', '(too short to detect reliably)')
    return 'und'
  }

  const code3 = franc(trimmed, { minLength: MIN_RELIABLE_LENGTH })
  const code1 = ISO_639_3_TO_1[code3] || 'und'
  console.log('BIO LANGUAGE DETECTED:', code1, `(raw: ${code3})`)
  return code1
}

// App language ('en' | 'gr') <-> ISO 639-1 mapping. The app uses 'gr' for
// Greek internally (existing convention), but the correct ISO code is 'el'.
export function appLangToIso(lang: 'en' | 'gr'): string {
  return lang === 'gr' ? 'el' : 'en'
}

export function isoToAppLang(iso: string): 'en' | 'gr' | null {
  if (iso === 'el') return 'gr'
  if (iso === 'en') return 'en'
  return null
}
