// Bio translation cache. Keyed by profile id + a hash of the exact bio text
// + the target language, so:
//   - the same translation is reused across mobile and desktop (it's a
//     Supabase table, not per-device storage)
//   - if the profile owner changes their bio, the hash changes and old
//     cached translations are simply never matched again (no explicit
//     "invalidation" step needed)
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

export function hashBio(bio: string): string {
  return createHash('sha256').update(bio.trim()).digest('hex')
}

export async function getCachedTranslation(
  profileId: string, bioHash: string, targetLang: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('bio_translations')
    .select('translated_text')
    .eq('profile_id', profileId)
    .eq('bio_hash', bioHash)
    .eq('target_lang', targetLang)
    .maybeSingle()

  if (error) {
    console.error('BIO TRANSLATION ERROR:', 'cache lookup failed', error.message)
    return null
  }
  return data?.translated_text || null
}

export async function saveCachedTranslation(
  profileId: string, bioHash: string, sourceLang: string, targetLang: string, translatedText: string
): Promise<void> {
  const { error } = await supabase.from('bio_translations').upsert({
    profile_id: profileId,
    bio_hash: bioHash,
    source_lang: sourceLang,
    target_lang: targetLang,
    translated_text: translatedText,
  }, { onConflict: 'profile_id,bio_hash,target_lang' })

  // Best-effort cache write — a failure here shouldn't fail the translation
  // request itself, since the translated text is already available to return.
  if (error) console.error('BIO TRANSLATION ERROR:', 'cache write failed', error.message)
}
