'use client'
import Image from 'next/image'

import { useEffect, useRef, useState } from 'react'
import { COPY, Lang } from '@/lib/copy'

// ── Typewriter ──────────────────────────────────────────────────
function useTypewriter(words: string[], speed = 75, pause = 2400) {
  const [display, setDisplay] = useState('')
  const [wi, setWi] = useState(0)
  const [ci, setCi] = useState(0)
  const [del, setDel] = useState(false)
  useEffect(() => {
    const word = words[wi]
    const delay = del ? speed / 2 : ci === word.length ? pause : speed
    const t = setTimeout(() => {
      if (!del && ci < word.length)        { setDisplay(word.slice(0, ci + 1)); setCi(c => c + 1) }
      else if (!del && ci === word.length) { setDel(true) }
      else if (del && ci > 0)              { setDisplay(word.slice(0, ci - 1)); setCi(c => c - 1) }
      else                                 { setDel(false); setWi(i => (i + 1) % words.length) }
    }, delay)
    return () => clearTimeout(t)
  })
  return display
}

// ── Scroll fade-in ──────────────────────────────────────────────
function useFadeIn(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.12 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [])
  return {
    ref,
    style: {
      opacity:   vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    },
  }
}

// ── Counter ─────────────────────────────────────────────────────
function Count({ n, suffix = '' }: { n: number; suffix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ob = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      ob.disconnect()
      let i = 0
      const t = setInterval(() => { i++; setV(Math.round((i / 50) * n)); if (i >= 50) clearInterval(t) }, 1400 / 50)
    }, { threshold: 0.5 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [n])
  return <span ref={ref}>{v}{suffix}</span>
}

// ── Scenario line ───────────────────────────────────────────────
// ── Language dropdown ───────────────────────────────────────────
// English/Ελληνικά reuse the app's one existing lang state and
// localStorage persistence (via the setLang prop, same as before) — no
// second translation or persistence system. The other 8 entries are
// listed for the eventual dropdown structure but are intentionally
// disabled/non-functional until real translation dictionaries exist —
// selecting them does nothing and never silently shows English while
// claiming another language is active.
const ALL_LANGUAGES: { code: Lang | string; native: string; active: boolean }[] = [
  { code: 'en', native: 'English',  active: true },
  { code: 'es', native: 'Español',  active: false },
  { code: 'fr', native: 'Français', active: false },
  { code: 'de', native: 'Deutsch',  active: false },
  { code: 'it', native: 'Italiano', active: false },
  { code: 'pt', native: 'Português', active: false },
  { code: 'gr', native: 'Ελληνικά', active: true },
  { code: 'tr', native: 'Türkçe',   active: false },
  { code: 'pl', native: 'Polski',   active: false },
  { code: 'ro', native: 'Română',   active: false },
]

function LanguageDropdown({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const t = { label: lang === 'gr' ? 'Γλώσσα' : 'Language', comingSoon: lang === 'gr' ? 'Σύντομα' : 'Coming soon' }

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', outline: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.075)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.12)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}>
        <span style={{ fontSize: 13, lineHeight: 1 }}>🌐</span>
        {t.label}
        <span style={{ fontSize: 9, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 180, maxWidth: '80vw', background: 'rgba(14,13,18,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 6, boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(253,41,123,0.06)', zIndex: 200 }}>
          {ALL_LANGUAGES.map(l => {
            const selected = l.active && l.code === lang
            return (
              <button key={l.code as string}
                role="option" aria-selected={selected} disabled={!l.active}
                onClick={() => { if (l.active) { setLang(l.code as Lang); setOpen(false) } }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  padding: '9px 12px', borderRadius: 8, border: 'none', fontSize: 13, fontFamily: 'inherit',
                  textAlign: 'left' as const, transition: 'background 0.15s',
                  background: selected ? 'rgba(253,41,123,0.16)' : 'transparent',
                  color: l.active ? (selected ? '#fff' : 'rgba(255,255,255,0.8)') : 'rgba(255,255,255,0.3)',
                  cursor: l.active ? 'pointer' : 'default',
                  outline: 'none',
                }}
                onMouseEnter={e => { if (l.active && !selected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (l.active && !selected) e.currentTarget.style.background = 'transparent' }}
                onFocus={e => { if (l.active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onBlur={e => { if (l.active && !selected) e.currentTarget.style.background = 'transparent' }}>
                <span>{l.native}</span>
                {selected && <span style={{ fontSize: 11, color: '#fd297b' }}>✓</span>}
                {!l.active && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{t.comingSoon}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function Landing() {
  const [lang, setLang] = useState<Lang>('en')

  // 1. First visit: detect browser language if nothing saved
  useEffect(() => {
    if (!localStorage.getItem('lang') && navigator.language.startsWith('el'))
      setLang('gr')
  }, [])

  // 2. Restore saved preference
  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved) setLang(saved)
  }, [])

  // 3. Persist on every change
  useEffect(() => {
    localStorage.setItem('lang', lang)
  }, [lang])
  const c = COPY[lang]

  // Reset typewriter when language changes
  const tw = useTypewriter(c.hero.typewriter)

  const f = {
    s0:   useFadeIn(0),
    why0: useFadeIn(0),   why1: useFadeIn(100), why2: useFadeIn(200), why3: useFadeIn(300),
    st0:  useFadeIn(0),   st1:  useFadeIn(100), st2:  useFadeIn(200),
    q0:   useFadeIn(0),   q1:   useFadeIn(120),
    fil:  useFadeIn(0),
    cta:  useFadeIn(0),
  }

  const STAT_VALS = [91, 3, 0]

  return (
    <main style={{ background: '#070709', color: '#f0eff5', fontFamily: "'Plus Jakarta Sans',sans-serif", overflowX: 'hidden', minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Grain */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`, backgroundSize: '200px', mixBlendMode: 'overlay' as const }} />

      {/* ── NAV ── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', background: 'rgba(7,7,9,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>
          Date<span style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Duel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageDropdown lang={lang} setLang={setLang} />
          <a href="/app" style={{ display: 'inline-flex', alignItems: 'center', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 100, background: 'rgba(255,255,255,0.045)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(253,41,123,0.28)', boxShadow: '0 2px 12px rgba(253,41,123,0.1)', transition: 'all 0.2s ease', outline: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(253,41,123,0.5)'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(253,41,123,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.045)'; e.currentTarget.style.borderColor = 'rgba(253,41,123,0.28)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(253,41,123,0.1)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(253,41,123,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,41,123,0.25), 0 2px 16px rgba(253,41,123,0.22)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(253,41,123,0.28)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(253,41,123,0.1)' }}>
            {c.nav.login}
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', textAlign: 'center' as const, position: 'relative', overflow: 'hidden' }}>

        {/* Neon glow orbs */}
        <div style={{ position: 'absolute', width: 500, height: 500, top: -100, left: -150, borderRadius: '50%', background: 'radial-gradient(circle,rgba(253,41,123,0.18) 0%,transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'drift1 14s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, bottom: -80, right: -100, borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,99,255,0.15) 0%,transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none', animation: 'drift2 18s ease-in-out infinite alternate' }} />

        <div style={{ maxWidth: 640, width: '100%', position: 'relative', zIndex: 2 }}>

          {/* Logo */}
          <div style={{ marginBottom: 16, animation: 'fadeUp 0.6s ease both' }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
              <span style={{ color: '#fff' }}>Date</span><span style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Duel</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fd297b', boxShadow: '0 0 12px rgba(253,41,123,0.9)', animation: 'dotPulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.8)' }}>
                {c.hero.eyebrow}
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(32px,7vw,56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', color: '#fff', marginBottom: 18, animation: 'fadeUp 0.7s 0.1s ease both' }}>
            {c.hero.h1[0]}<br />{c.hero.h1[1]}{' '}
            <em style={{ background: 'linear-gradient(135deg,#fd297b,#c850c0,#6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>{c.hero.accentWord}</em>
            {c.hero.h1[2]}
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 'clamp(16px,3vw,20px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 32, animation: 'fadeUp 0.7s 0.2s ease both' }}>
            {c.hero.sub}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 32, animation: 'fadeUp 0.7s 0.4s ease both' }}>
            <a style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#fd297b,#c850c0,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: 16, fontWeight: 700, padding: '17px 36px', borderRadius: 100, boxShadow: '0 8px 36px rgba(253,41,123,0.4), 0 2px 10px rgba(108,99,255,0.25)', transition: 'transform 0.15s,box-shadow 0.15s', outline: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 48px rgba(253,41,123,0.55), 0 4px 18px rgba(108,99,255,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(253,41,123,0.4), 0 2px 10px rgba(108,99,255,0.25)' }}
              onFocus={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,41,123,0.4), 0 14px 48px rgba(253,41,123,0.55), 0 4px 18px rgba(108,99,255,0.35)' }}
              onBlur={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(253,41,123,0.4), 0 2px 10px rgba(108,99,255,0.25)' }}>
              {c.hero.ctaPrimary}
            </a>
            <a href="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,rgba(253,41,123,0.14),rgba(108,99,255,0.14))', color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 600, padding: '17px 30px', borderRadius: 100, border: '1px solid rgba(253,41,123,0.32)', boxShadow: '0 4px 20px rgba(108,99,255,0.18)', transition: 'all 0.2s', outline: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(253,41,123,0.55)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(108,99,255,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(253,41,123,0.32)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.18)' }}
              onFocus={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(253,41,123,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(253,41,123,0.3), 0 8px 28px rgba(108,99,255,0.3)' }}
              onBlur={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(253,41,123,0.32)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.18)' }}>
              {c.hero.ctaSecond}
            </a>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap' as const, animation: 'fadeUp 0.7s 0.5s ease both' }}>
            {[
              { n: 91, suf: '%', label: c.proof.showUpRate },
              { n: 4800, suf: '+', label: c.proof.betsPlaced },
              { n: 0, suf: '%', label: c.proof.ghosting },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                {i > 0 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-1px', background: 'linear-gradient(135deg,#fff,rgba(255,255,255,0.65))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <Count n={stat.n} suffix={stat.suf} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY DATEDUEL ── */}
      <section style={{ padding: '60px 24px', maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(22px,5vw,32px)', fontWeight: 900, textAlign: 'center' as const, color: '#fff', letterSpacing: '-1px', marginBottom: 32 }}>
          {lang === 'gr' ? 'Γιατί DateDuel;' : 'Why DateDuel?'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {[
            { emoji: '❤️', en: 'Personality before appearance', gr: 'Προσωπικότητα πριν την εμφάνιση' },
            { emoji: '🎮', en: 'Play instead of endless swiping', gr: 'Παιχνίδι αντί για ατελείωτο swipe' },
            { emoji: '💬', en: 'Real conversations', gr: 'Αληθινές συζητήσεις' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 18, backdropFilter: 'blur(12px)',
            }}>
              <span style={{ fontSize: 24 }}>{item.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                {lang === 'gr' ? item.gr : item.en}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY ── */}
      <section style={{ padding: '110px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg,transparent,rgba(253,41,123,0.03) 50%,transparent)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.65)', marginBottom: 14, textAlign: 'center' as const }}>
            {c.why.label}
          </div>
          <h2 ref={f.s0.ref} style={{ ...f.s0.style, fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', textAlign: 'center' as const, marginBottom: 52, lineHeight: 1.1, whiteSpace: 'pre-line' as const }}>
            {c.why.headline}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
            {c.why.cards.map((card, i) => {
              const fade = [f.why0, f.why1, f.why2, f.why3][i] || f.why0
              return (
                <div key={i} ref={fade.ref} style={{ ...fade.style, padding: '36px 32px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, cursor: 'default', transition: `${fade.style.transition}, background 0.25s` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}>
                  <div style={{ fontSize: 30, marginBottom: 16 }}>{card.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10, letterSpacing: '-0.3px' }}>{card.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.38)' }}>{card.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 40, textAlign: 'center' as const }}>
          {c.stats.items.map((s, i) => {
            const fade = [f.st0, f.st1, f.st2][i]
            return (
              <div key={i} ref={fade.ref} style={fade.style}>
                <div style={{ fontSize: 'clamp(52px,9vw,72px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1, background: 'linear-gradient(135deg,#fff,rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 12 }}>
                  <Count n={STAT_VALS[i]} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.32)', lineHeight: 1.55, maxWidth: 180, margin: '0 auto' }}>{s.label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── COMMUNITY REACTIONS ── */}
      <section style={{ padding: '90px 24px 40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.65)', marginBottom: 28, textAlign: 'center' as const }}>
            {lang === 'gr' ? 'Αντιδράσεις κοινότητας' : 'Community Reactions'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10, justifyContent: 'center' }}>
            {[
              { e: '💬', en: 'This feels different.', gr: 'Αυτό είναι διαφορετικό.' },
              { e: '🎭', en: 'Finally, personality first.', gr: 'Επιτέλους, η προσωπικότητα πρώτα.' },
              { e: '❤️', en: 'Curiosity makes everything more exciting.', gr: 'Η περιέργεια κάνει τα πάντα πιο συναρπαστικά.' },
              { e: '🎮', en: 'Games make starting conversations easier.', gr: 'Τα παιχνίδια κάνουν πιο εύκολη την αρχή.' },
            ].map((r, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 100,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)',
              }}>
                <span style={{ fontSize: 15 }}>{r.e}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>"{lang === 'gr' ? r.gr : r.en}"</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT PLAYERS SAY ── */}
      <section style={{ padding: '40px 24px 100px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 900, textAlign: 'center' as const, color: '#fff', letterSpacing: '-1px', marginBottom: 36 }}>
            {lang === 'gr' ? 'Τι λένε οι παίκτες' : 'What Players Say'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {[
              { en: 'For the first time, I cared more about the conversation than the photo.', gr: 'Για πρώτη φορά, με ένοιαζε πιο πολύ η κουβέντα παρά η φωτογραφία.', label_en: 'Early Beta Tester', label_gr: 'Early Beta Tester' },
              { en: 'The mystery makes every interaction more exciting.', gr: 'Το μυστήριο κάνει κάθε αλληλεπίδραση πιο συναρπαστική.', label_en: 'Beta User', label_gr: 'Beta User' },
              { en: 'It feels like meeting people, not collecting matches.', gr: 'Νιώθεις ότι γνωρίζεις ανθρώπους, όχι ότι μαζεύεις matches.', label_en: 'Early Access Member', label_gr: 'Early Access Member' },
            ].map((t, i) => (
              <div key={i} style={{
                padding: '28px 26px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
                display: 'flex', flexDirection: 'column' as const,
              }}>
                <div style={{ fontSize: 28, color: 'rgba(253,41,123,0.3)', lineHeight: 1, marginBottom: 8, fontFamily: 'Georgia, serif' }}>"</div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginBottom: 16, flex: 1 }}>
                  {lang === 'gr' ? t.gr : t.en}
                </p>
                <p style={{ fontSize: 12, color: 'rgba(253,41,123,0.6)', fontWeight: 600, letterSpacing: '0.3px' }}>
                  — {lang === 'gr' ? t.label_gr : t.label_en}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FILTER ── */}
      <section style={{ padding: '80px 24px', textAlign: 'center' as const, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div ref={f.fil.ref} style={{ ...f.fil.style, maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 16 }}>{c.filter.headline}</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 6 }}>{c.filter.line1}</p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{c.filter.line2}</p>
        </div>
      </section>


      {/* ── DATING MOMENTS STRIP ── */}
      <section style={{ padding:'60px 0', borderTop:'1px solid rgba(255,255,255,0.05)', overflow:'hidden' }}>
        <div style={{ display:'flex', gap:16, padding:'0 24px', overflowX:'auto', scrollbarWidth:'none',
          WebkitOverflowScrolling:'touch', scrollSnapType:'x mandatory' }}>
          {[
            { src:'https://images.pexels.com/photos/6537108/pexels-photo-6537108.jpeg?auto=compress&cs=tinysrgb&w=500&h=340&fit=crop', alt:'date' },
            { src:'https://images.pexels.com/photos/17746292/pexels-photo-17746292.jpeg?auto=compress&cs=tinysrgb&w=500&h=340&fit=crop', alt:'walk' },
            { src:'https://images.pexels.com/photos/31585127/pexels-photo-31585127.jpeg?auto=compress&cs=tinysrgb&w=500&h=340&fit=crop', alt:'laugh' },
            { src:'https://images.pexels.com/photos/30871557/pexels-photo-30871557.jpeg?auto=compress&cs=tinysrgb&w=500&h=340&fit=crop', alt:'moment' },
          ].map((img, i) => (
            <div key={i} style={{ flex:'0 0 260px', scrollSnapAlign:'center', borderRadius:20, overflow:'hidden',
              position:'relative', animation:`fadeUp 0.6s ease ${i*100}ms both` }}>
              <Image src={img.src} alt={img.alt} width={500} height={340} loading="lazy"
                style={{ width:'100%', height:180, objectFit:'cover', filter:'saturate(0.8) brightness(0.85)',
                  transition:'transform 0.4s ease, filter 0.4s ease' }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, transparent 40%, rgba(10,8,18,0.7) 100%)', pointerEvents:'none' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" style={{ padding: '120px 24px 100px', textAlign: 'center' as const, position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle,rgba(253,41,123,0.1) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', borderRadius: '50%' }} />
        {/* Emotional background image */}
        <Image src="https://images.pexels.com/photos/5933357/pexels-photo-5933357.jpeg?auto=compress&cs=tinysrgb&w=1200&h=800&fit=crop"
          alt="Romantic moment" width={1200} height={800} loading="lazy"
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
          opacity:0.12, filter:'blur(4px) saturate(0.5)', pointerEvents:'none' }} />

        <div ref={f.cta.ref} style={{ ...f.cta.style, maxWidth: 520, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.65)', marginBottom: 16 }}>{c.cta.label}</div>
          <h2 style={{ fontSize: 'clamp(32px,6vw,62px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.0, marginBottom: 16, whiteSpace: 'pre-line' as const }}>{c.cta.headline}</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 36, whiteSpace: 'pre-line' as const }}>{c.cta.sub}</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <button onClick={() => window.location.href='/app'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#fd297b,#c850c0,#6c63ff)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', padding: '18px 52px', borderRadius: 100, boxShadow: '0 10px 40px rgba(253,41,123,0.45), 0 3px 14px rgba(108,99,255,0.3)', transition: 'transform 0.2s ease,box-shadow 0.2s ease', outline: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 52px rgba(253,41,123,0.6), 0 5px 20px rgba(108,99,255,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(253,41,123,0.45), 0 3px 14px rgba(108,99,255,0.3)' }}
              onFocus={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(253,41,123,0.35), 0 16px 52px rgba(253,41,123,0.6), 0 5px 20px rgba(108,99,255,0.4)' }}
              onBlur={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(253,41,123,0.45), 0 3px 14px rgba(108,99,255,0.3)' }}>
              {c.cta.button}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>{c.cta.fine}</p>
        </div>
      </section>

      {/* ── FINAL HOOK ── */}
      <section style={{ textAlign: 'center' as const, padding: '0 24px 80px' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginBottom: 12 }}>{c.hook.line}</p>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            Date<span style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Duel</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', fontStyle: 'italic' }}>{c.footer.tagline}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>{c.footer.copy}</div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotPulse{ 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes phoneFloat { from{transform:translateY(0)} to{transform:translateY(-8px)} }
        @keyframes cellPop { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        @keyframes heartDrift { from{transform:translate(0,0)} to{transform:translate(3px,-5px)} }
        @keyframes driftImg1 { from{transform:translate(0,0) scale(1)} to{transform:translate(-12px,8px) scale(1.03)} }
        @keyframes driftImg2 { from{transform:translate(0,0) scale(1)} to{transform:translate(8px,-6px) scale(1.02)} }
        @keyframes drift1  { to{transform:translate(70px,90px)} }
        @keyframes drift2  { to{transform:translate(-60px,-70px)} }
        *{box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.25)}
        @media(max-width:640px){ nav{padding:14px 16px} }
      `}</style>
    </main>
  )
}
