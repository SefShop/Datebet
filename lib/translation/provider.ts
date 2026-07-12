// Translation provider abstraction. The concrete provider (DeepL) is only
// ever called from a server-side API route (app/api/translate-bio/route.ts)
// — this file must never be imported from a client component, so the API
// key is never bundled into client JS.

export interface TranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>
}

// DeepL free/pro REST API. Requires DEEPL_API_KEY (server-only env var, no
// NEXT_PUBLIC_ prefix). Free-tier keys end in ":fx" and use the free API
// host automatically; paid keys use the standard host.
class DeepLProvider implements TranslationProvider {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const apiKey = process.env.DEEPL_API_KEY
    if (!apiKey) {
      throw new Error('DEEPL_API_KEY is not configured on the server')
    }
    const isFreeTier = apiKey.trim().endsWith(':fx')
    const base = isFreeTier ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

    const res = await fetch(`${base}/v2/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: sourceLang.toUpperCase(),
        target_lang: targetLang.toUpperCase(),
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`DeepL request failed (${res.status}): ${detail.slice(0, 200)}`)
    }

    const data = await res.json()
    const translated = data?.translations?.[0]?.text
    if (!translated) throw new Error('DeepL returned no translation')
    return translated
  }
}

// Swap providers here if needed — the rest of the app only depends on the
// TranslationProvider interface, never on DeepL specifically.
export function getTranslationProvider(): TranslationProvider {
  return new DeepLProvider()
}
