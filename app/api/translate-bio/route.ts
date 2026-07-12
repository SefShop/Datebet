import { NextRequest, NextResponse } from 'next/server'
import { hashBio, getCachedTranslation, saveCachedTranslation } from '@/lib/translation/cache'
import { getTranslationProvider } from '@/lib/translation/provider'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profileId: string | undefined = body?.profileId
    const bio: string | undefined = body?.bio
    const sourceLang: string | undefined = body?.sourceLang
    const targetLang: string | undefined = body?.targetLang

    if (!profileId || !bio || !targetLang) {
      return NextResponse.json({ error: 'Missing profileId, bio, or targetLang' }, { status: 400 })
    }

    // Same language — nothing to translate, return as-is.
    if (sourceLang && sourceLang === targetLang) {
      return NextResponse.json({ translated: bio, cached: false })
    }

    console.log('BIO TRANSLATION REQUESTED:', profileId, sourceLang || 'und', '->', targetLang)

    const bioHash = hashBio(bio)

    const cached = await getCachedTranslation(profileId, bioHash, targetLang)
    if (cached) {
      console.log('BIO TRANSLATION CACHE HIT:', profileId, targetLang)
      return NextResponse.json({ translated: cached, cached: true })
    }

    const provider = getTranslationProvider()
    const translated = await provider.translate(bio, sourceLang || 'auto', targetLang)

    await saveCachedTranslation(profileId, bioHash, sourceLang || 'und', targetLang, translated)

    console.log('BIO TRANSLATION SUCCESS:', profileId, targetLang)
    return NextResponse.json({ translated, cached: false })
  } catch (e: any) {
    console.error('BIO TRANSLATION ERROR:', e?.message)
    return NextResponse.json({ error: 'Translation is unavailable right now.' }, { status: 500 })
  }
}
