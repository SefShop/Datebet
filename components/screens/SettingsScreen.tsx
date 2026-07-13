'use client'
import { useApp } from '@/lib/AppContext'
import { Lang } from '@/lib/copy'

export default function SettingsScreen() {
  const { navigate, lang, setLang } = useApp()

  const t = {
    title:    lang === 'gr' ? 'Ρυθμίσεις' : 'Settings',
    back:     lang === 'gr' ? '← Πίσω' : '← Back',
    language: lang === 'gr' ? 'Γλώσσα' : 'Language',
    hint:     lang === 'gr'
      ? 'Αλλάζει αμέσως τη γλώσσα σε όλη την εφαρμογή.'
      : 'Changes the language across the whole app immediately.',
  }

  function choose(l: Lang) {
    // Reuses the existing app-wide language state and persistence
    // (lib/AppContext.tsx) — no new storage or detection logic added here.
    setLang(l)
    console.log('SETTINGS LANG:', l)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#0a0a10', scrollbarWidth: 'none' as any }}>

      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={() => navigate('profile')}
          className="text-white/40 text-[14px] active:opacity-60 cursor-pointer">{t.back}</button>
        <h1 className="text-[18px] font-extrabold text-white flex-1"
          style={{ fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t.title}</h1>
      </div>

      <div className="px-5 pb-10">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-[13px] font-bold text-white mb-1 flex items-center gap-2">
            🌐 {t.language}
          </div>
          <div className="text-[11.5px] mb-3.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t.hint}
          </div>

          <div className="flex flex-col gap-2">
            <button onClick={() => choose('gr')}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: lang === 'gr' ? 'linear-gradient(135deg,rgba(253,41,123,0.18),rgba(216,77,216,0.12))' : 'rgba(255,255,255,0.03)',
                border: lang === 'gr' ? '1px solid rgba(253,41,123,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <span className="text-[14px] font-semibold text-white">Ελληνικά</span>
              {lang === 'gr' && <span className="text-[14px]" style={{ color: '#ff3384' }}>✓</span>}
            </button>

            <button onClick={() => choose('en')}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer active:scale-[0.98] transition-transform"
              style={{
                background: lang === 'en' ? 'linear-gradient(135deg,rgba(253,41,123,0.18),rgba(216,77,216,0.12))' : 'rgba(255,255,255,0.03)',
                border: lang === 'en' ? '1px solid rgba(253,41,123,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              <span className="text-[14px] font-semibold text-white">English</span>
              {lang === 'en' && <span className="text-[14px]" style={{ color: '#ff3384' }}>✓</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
