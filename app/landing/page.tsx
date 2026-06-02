'use client'

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

// ── Mini Flow — cinematic step preview ─────────────────────────
const FLOW_STEPS = [
  { text: 'Answer a question',         small: false, accent: false },
  { text: '↓',                         small: true,  accent: false },
  { text: 'Match',                      small: false, accent: false },
  { text: '↓',                         small: true,  accent: false },
  { text: 'Lock the duel',             small: false, accent: false },
  { text: '↓',                         small: true,  accent: false },
  { text: 'Show up — or lose credits', small: false, accent: true  },
]

function MiniFlow() {
  const ref  = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.2 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

  return (
    <section ref={ref} style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' as const }}>
      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.5)', marginBottom: 36 }}>
          the game
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
          {FLOW_STEPS.map((step, i) => (
            <div key={i} style={{
              fontSize:   step.small ? 13 : step.accent ? 'clamp(16px,3vw,20px)' : 'clamp(15px,2.5vw,17px)',
              fontWeight: step.accent ? 800 : step.small ? 400 : 500,
              color:      step.accent ? '#fd297b' : step.small ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.65)',
              padding:    step.small ? '3px 0' : '9px 0',
              letterSpacing: step.accent ? '-0.3px' : '0',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              opacity:    vis ? 1 : 0,
              transform:  vis ? 'translateY(0)' : 'translateY(12px)',
              transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
            }}>
              {step.text}
            </div>
          ))}
        </div>
        <a href="/app" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 32, color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600, padding: '11px 22px', borderRadius: 100,
          border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s',
          opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '560ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          play now →
        </a>
      </div>
    </section>
  )
}

// ── Scenario line ───────────────────────────────────────────────
function ScenarioLine({ text, delay, last }: { text: string; delay: number; last: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.5 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      fontSize:      last ? 'clamp(18px,3.5vw,24px)' : 'clamp(15px,2.5vw,18px)',
      fontWeight:    last ? 800 : 400,
      color:         last ? '#fff' : 'rgba(255,255,255,0.38)',
      lineHeight:    1.55,
      padding:       last ? '24px 0 0' : '9px 0',
      borderTop:     last ? '1px solid rgba(255,255,255,0.07)' : 'none',
      letterSpacing: last ? '-0.3px' : '0',
      opacity:       vis ? 1 : 0,
      transform:     vis ? 'translateX(0)' : 'translateX(-12px)',
      transition:    `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
    }}>
      {last
        ? <><span style={{ color: '#fd297b', marginRight: 8 }}>→</span>{text.replace('→ ', '')}</>
        : text}
    </div>
  )
}

// ── Lang toggle ─────────────────────────────────────────────────
function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 100, padding: 3,
    }}>
      {(['en', 'gr'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{
            padding: '5px 13px', borderRadius: 100, border: 'none',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
            textTransform: 'uppercase' as const,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s ease',
            background: lang === l
              ? 'linear-gradient(135deg,#fd297b,#ff655b)'
              : 'transparent',
            color: lang === l ? '#fff' : 'rgba(255,255,255,0.35)',
            boxShadow: lang === l ? '0 2px 12px rgba(253,41,123,0.4)' : 'none',
          }}>
          {l}
        </button>
      ))}
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
    why0: useFadeIn(0),   why1: useFadeIn(100), why2: useFadeIn(200),
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
          <LangToggle lang={lang} setLang={setLang} />
          <a href="#cta" style={{ fontSize: 13, fontWeight: 700, color: '#fd297b', textDecoration: 'none', padding: '8px 16px', border: '1px solid rgba(253,41,123,0.35)', borderRadius: 100, transition: 'background 0.2s', whiteSpace: 'nowrap' as const }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(253,41,123,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {c.nav.cta}
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, top: -180, left: -180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(253,41,123,0.13) 0%,transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none', animation: 'drift1 14s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', width: 500, height: 500, bottom: -120, right: -120, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,101,91,0.11) 0%,transparent 70%)', filter: 'blur(70px)', pointerEvents: 'none', animation: 'drift2 18s ease-in-out infinite alternate' }} />

        <div style={{ maxWidth: 780, width: '100%', position: 'relative', zIndex: 2, animation: 'fadeUp 0.9s ease both' }}>
          {/* Eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fd297b', boxShadow: '0 0 10px rgba(253,41,123,0.9)', animation: 'dotPulse 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.85)' }}>
              {c.hero.eyebrow}
            </span>
          </div>

          {/* H1 — 2-line hero with accent word */}
          <h1 style={{ fontSize: 'clamp(40px,9vw,88px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: 'clamp(-1.5px,-0.025em,-3px)', color: '#fff', marginBottom: 24 }}>
            {c.hero.h1[0]}<br />{c.hero.h1[1]}{' '}
            <em style={{ background: 'linear-gradient(135deg,#fd297b,#ff655b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>{c.hero.accentWord}</em>
            {c.hero.h1[2]}
          </h1>

          <p style={{ fontSize: 'clamp(15px,2.5vw,19px)', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, marginBottom: 20 }}>{c.hero.sub}</p>

          {/* Typewriter */}
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.28)', marginBottom: 40, height: 24 }}>
            {lang === 'en' ? 'No more ' : 'Τέλος με '}{' '}
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {tw}<span style={{ color: '#fd297b', animation: 'blink 0.9s step-end infinite' }}>|</span>
            </span>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 16 }}>
            <a href="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#fd297b,#ff655b)', color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700, padding: '15px 30px', borderRadius: 100, boxShadow: '0 8px 32px rgba(253,41,123,0.4)', transition: 'transform 0.15s,box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 44px rgba(253,41,123,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(253,41,123,0.4)' }}>
              {c.hero.ctaPrimary}
            </a>
            <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '15px 24px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}>
              {c.hero.ctaSecond}
            </a>
          </div>

          {/* Playable now nudge */}
          <div style={{ marginBottom: 44, fontSize: 12, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.3px' }}>
            Playable now — no signup required.
          </div>

          {/* Proof */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap' as const }}>
            {[
              { n: 91,   suf: '%', label: c.proof.showUpRate },
              { n: 4800, suf: '+', label: c.proof.betsPlaced },
              { n: 0,    suf: '%', label: c.proof.ghosting },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                {i > 0 && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />}
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-1px', background: 'linear-gradient(135deg,#fff,rgba(255,255,255,0.65))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <Count n={s.n} suffix={s.suf} />
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MINI FLOW ── */}
      <MiniFlow />

      {/* ── SCENARIO ── */}
      <section id="how" style={{ padding: '110px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.65)', marginBottom: 44, textAlign: 'center' as const }}>
            {c.scenario.label}
          </div>
          {c.scenario.lines.map((line, i) => (
            <ScenarioLine key={`${lang}-${i}`} text={line} delay={i * 80} last={i === c.scenario.lines.length - 1} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 2 }}>
            {c.why.cards.map((card, i) => {
              const fade = [f.why0, f.why1, f.why2][i]
              return (
                <div key={i} ref={fade.ref} style={{ ...fade.style, padding: '36px 32px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: i === 0 ? '16px 0 0 16px' : i === 2 ? '0 16px 16px 0' : 0, cursor: 'default', transition: `${fade.style.transition}, background 0.25s` }}
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

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
          {c.testimonials.map((t, i) => {
            const fade = [f.q0, f.q1][i]
            return (
              <div key={i} ref={fade.ref} style={{ ...fade.style, padding: '28px 32px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20 }}>
                <p style={{ fontSize: 17, lineHeight: 1.65, color: 'rgba(255,255,255,0.65)', fontStyle: 'italic', marginBottom: 12 }}>{t.quote}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.5px' }}>— {t.name}</p>
              </div>
            )
          })}
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

      {/* ── CTA ── */}
      <section id="cta" style={{ padding: '120px 24px 100px', textAlign: 'center' as const, position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', width: 700, height: 700, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle,rgba(253,41,123,0.1) 0%,transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', borderRadius: '50%' }} />
        <div ref={f.cta.ref} style={{ ...f.cta.style, maxWidth: 520, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase' as const, color: 'rgba(253,41,123,0.65)', marginBottom: 16 }}>{c.cta.label}</div>
          <h2 style={{ fontSize: 'clamp(32px,6vw,62px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.0, marginBottom: 16, whiteSpace: 'pre-line' as const }}>{c.cta.headline}</h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, marginBottom: 36, whiteSpace: 'pre-line' as const }}>{c.cta.sub}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: 14 }}>
            <input type="email" placeholder={c.cta.placeholder} style={{ flex: 1, minWidth: 200, maxWidth: 260, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '14px 20px', fontSize: 14, color: '#fff', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(253,41,123,0.5)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')} />
            <button onClick={() => window.location.href='/app'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#fd297b,#ff655b)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', padding: '14px 26px', borderRadius: 100, boxShadow: '0 8px 28px rgba(253,41,123,0.4)', transition: 'transform 0.15s,box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(253,41,123,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(253,41,123,0.4)' }}>
              {c.cta.button}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3px' }}>{c.cta.fine}</p>
        </div>
      </section>

      {/* ── FINAL HOOK ── */}
      <section style={{ textAlign: 'center' as const, padding: '0 24px 80px' }}>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginBottom: 12 }}>{c.hook.line}</p>
        <a href="#cta" style={{ color: '#fd297b', fontSize: 14, fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid rgba(253,41,123,0.3)', paddingBottom: 2, transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#fd297b')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(253,41,123,0.3)')}>
          {c.hook.cta}
        </a>
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
        @keyframes drift1  { to{transform:translate(70px,90px)} }
        @keyframes drift2  { to{transform:translate(-60px,-70px)} }
        *{box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.25)}
        @media(max-width:640px){ nav{padding:14px 16px} }
      `}</style>
    </main>
  )
}
