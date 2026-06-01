'use client'

import { useApp } from '@/lib/AppContext'
import { Lang } from '@/lib/copy'

export default function LangToggle() {
  const { lang, setLang } = useApp()

  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 100, padding: 3,
    }}>
      {(['en', 'gr'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '5px 11px', borderRadius: 100, border: 'none',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
            textTransform: 'uppercase', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'all 0.25s ease',
            background: lang === l ? 'linear-gradient(135deg,#fd297b,#ff655b)' : 'transparent',
            color: lang === l ? '#fff' : 'rgba(255,255,255,0.4)',
            boxShadow: lang === l ? '0 2px 12px rgba(253,41,123,0.4)' : 'none',
          }}>
          {l}
        </button>
      ))}
    </div>
  )
}
