'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props { onAuth: () => void; lang?: 'en' | 'gr' }

const C = {
  en: {
    tabIn: 'Sign In', tabUp: 'Sign Up',
    h1: ['No photos first.', 'Just', 'connection.'],
    email: 'Email address', pass: 'Password',
    cta: 'Enter the game →', ctaUp: 'Create account →',
    or: 'or', google: 'Continue with Google',
    tagline: 'No ghosting. Just show up.',
    footer: "Don't have an account?", footerAction: 'Sign up',
    footerBack: 'Already have an account?', footerActionBack: 'Sign in',
    connecting: 'connecting...',
  },
  gr: {
    tabIn: 'Σύνδεση', tabUp: 'Δημιουργία',
    h1: ['Όχι φωτογραφίες πρώτα.', 'Μόνο', 'σύνδεση.'],
    email: 'Email', pass: 'Κωδικός',
    cta: 'Μπες στο παιχνίδι →', ctaUp: 'Δημιούργησε →',
    or: 'ή', google: 'Συνέχεια με Google',
    tagline: 'Χωρίς ghosting. Απλά εμφανίσου.',
    footer: 'Δεν έχεις λογαριασμό;', footerAction: 'Δημιούργησε',
    footerBack: 'Έχεις ήδη λογαριασμό;', footerActionBack: 'Σύνδεση',
    connecting: 'σύνδεση...',
  },
}

export default function AuthScreen({ onAuth, lang: langProp = 'gr' }: Props) {
  const [lang, setLang] = useState<'en'|'gr'>(langProp)
  const t = C[lang]
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [name, setName]       = useState('')
  const [age, setAge]         = useState('')
  const [mode, setMode]       = useState<'signin'|'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [show, setShow]       = useState(false)
  const [focus, setFocus]     = useState<string|null>(null)

  useEffect(() => { setTimeout(() => setShow(true), 80) }, [])

  // Load saved language preference on mount (same key as app context)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lang')
      if (saved === 'en' || saved === 'gr') setLang(saved)
    } catch {}
  }, [])

  function toggleLang() {
    const next = lang === 'gr' ? 'en' : 'gr'
    setLang(next)
    try { localStorage.setItem('lang', next) } catch {}
  }

  async function submit() {
    if (!email || !pass) return
    setLoading(true); setError(null)
    try {
      if (mode === 'signup') {
        if (!name || !age) { setError('Fill in name and age'); setLoading(false); return }
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: pass })
        console.log('AUTH', authData, authError)
        if (authError) { setError(authError.message); setLoading(false); return }
        const userId = authData.user?.id
        console.log('USER ID', userId)
        if (!userId) { setError('No user ID returned'); setLoading(false); return }
        const profileResult = await supabase.from('profiles').insert({
          id: userId, name, age: parseInt(age), bio: '', photo: '', location: '',
        })
        console.log('PROFILE INSERT', profileResult)
        if (profileResult.error) { setError('Profile: ' + profileResult.error.message); setLoading(false); return }
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (e) { setError(e.message); setLoading(false); return }
      }
      onAuth()
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background:'#050508' }}>

      {/* Language toggle — top right */}
      <button onClick={toggleLang}
        className="absolute z-[110] flex items-center rounded-full overflow-hidden active:scale-95 transition-transform cursor-pointer"
        style={{ top: 16, right: 16, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.12)' }}>
        <span className="px-2.5 py-1.5 text-[11px] font-bold" style={{ background: lang==='en'?'linear-gradient(135deg,#fd297b,#c850c0)':'transparent', color: lang==='en'?'#fff':'rgba(255,255,255,0.5)' }}>EN</span>
        <span className="px-2.5 py-1.5 text-[11px] font-bold" style={{ background: lang==='gr'?'linear-gradient(135deg,#fd297b,#c850c0)':'transparent', color: lang==='gr'?'#fff':'rgba(255,255,255,0.5)' }}>GR</span>
      </button>

      {/* ── BG: blurred romantic image ── */}
      <div className="absolute inset-0">
        <img src="https://images.pexels.com/photos/5933357/pexels-photo-5933357.jpeg?auto=compress&cs=tinysrgb&w=900&h=1400&fit=crop"
          alt="" className="w-full h-full object-cover" style={{ animation:'bgPan 20s ease-in-out infinite alternate' }} />
        <div className="absolute inset-0" style={{ background:'rgba(5,5,8,0.68)' }} />
        <div className="absolute inset-0" style={{ background:'linear-gradient(180deg, rgba(5,5,8,0.3) 0%, rgba(5,5,8,0.6) 40%, rgba(5,5,8,0.92) 80%, rgba(5,5,8,1) 100%)' }} />
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.08) 0%, transparent 60%)' }} />
      </div>

      {/* ── Floating hearts ── */}
      {[0,1,2,3,4].map(i => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${15+i*17}%`, bottom: '-5%', fontSize: 12+i*3, opacity: 0.06+i*0.01, color:'#fd297b',
          animation: `heartFloat ${8+i*3}s ${i*1.5}s ease-in-out infinite`,
        }}>♥</div>
      ))}

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-14 pb-8 overflow-y-auto" style={{ scrollbarWidth:'none' }}>

        {/* Logo */}
        <div className="text-center mb-1" style={{ opacity:show?1:0, transform:show?'translateY(0)':'translateY(-10px)', transition:'all 0.6s ease' }}>
          <h2 className="text-[20px] font-extrabold tracking-[-0.5px]" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <span className="text-white">Date</span><span style={{ background:'linear-gradient(135deg,#fd297b,#c850c0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Duel</span>
          </h2>
          <p className="text-[9px] font-bold tracking-[3px] uppercase mt-0.5" style={{ color:'rgba(253,41,123,0.5)' }}>
            NO ESCAPE. JUST SHOW UP.
          </p>
        </div>

        {/* Headline */}
        <div className="text-center mt-6 mb-7" style={{ opacity:show?1:0, transform:show?'translateY(0)':'translateY(16px)', transition:'all 0.7s 0.1s cubic-bezier(0.16,1,0.3,1)' }}>
          <h1 className="text-[26px] font-extrabold text-white leading-tight tracking-[-0.5px] mb-1.5"
            style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {t.h1[0]}
          </h1>
          <p className="text-[18px] font-bold text-white/60 leading-tight">
            {t.h1[1]} <span style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontStyle:'italic' }}>{t.h1[2]}</span>
          </p>
        </div>

        {/* ── Glass card ── */}
        <div className="w-full max-w-[380px] mx-auto rounded-3xl p-6 flex-shrink-0" style={{
          background:'rgba(255,255,255,0.04)', backdropFilter:'blur(28px) saturate(1.4)',
          border:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          opacity:show?1:0, transform:show?'translateY(0) scale(1)':'translateY(24px) scale(0.98)',
          transition:'all 0.7s 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Tabs */}
          <div className="flex mb-5 rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
            {(['signin','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null) }}
                className="flex-1 py-3 text-[13px] font-bold transition-all duration-300 cursor-pointer relative"
                style={{ color: mode===m ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                {m==='signin' ? t.tabIn : t.tabUp}
                {mode===m && <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full" style={{ background:'linear-gradient(90deg,#fd297b,#c850c0)' }} />}
              </button>
            ))}
          </div>

          {/* Name + Age (signup only) */}
          {mode === 'signup' && (
            <div className="flex gap-2.5 mb-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='n' ? '#fd297b' : 'rgba(255,255,255,0.25)', transition:'color 0.3s' }}>👤</div>
                <input value={name} onChange={e=>setName(e.target.value)}
                  type="text" placeholder={lang==='gr'?'Όνομα':'Name'}
                  onFocus={()=>setFocus('n')} onBlur={()=>setFocus(null)}
                  className="w-full rounded-2xl pl-10 pr-4 py-4 text-[14px] outline-none transition-all duration-300"
                  style={{
                    background:'rgba(255,255,255,0.05)', color:'#fff', caretColor:'#fd297b',
                    border: focus==='n' ? '1.5px solid rgba(253,41,123,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: focus==='n' ? '0 0 24px rgba(253,41,123,0.12)' : 'none',
                  }} />
              </div>
              <div className="relative" style={{ width: 90 }}>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='a' ? '#fd297b' : 'rgba(255,255,255,0.25)', transition:'color 0.3s' }}>🎂</div>
                <input value={age} onChange={e=>setAge(e.target.value.replace(/\D/g,''))}
                  type="text" placeholder={lang==='gr'?'Ηλικία':'Age'} inputMode="numeric" maxLength={2}
                  onFocus={()=>setFocus('a')} onBlur={()=>setFocus(null)}
                  className="w-full rounded-2xl pl-10 pr-3 py-4 text-[14px] outline-none transition-all duration-300"
                  style={{
                    background:'rgba(255,255,255,0.05)', color:'#fff', caretColor:'#fd297b',
                    border: focus==='a' ? '1.5px solid rgba(253,41,123,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                    boxShadow: focus==='a' ? '0 0 24px rgba(253,41,123,0.12)' : 'none',
                  }} />
              </div>
            </div>
          )}

          {/* Email input */}
          <div className="relative mb-3">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='e' ? '#fd297b' : 'rgba(255,255,255,0.25)', transition:'color 0.3s' }}>✉</div>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              type="email" placeholder={t.email} autoComplete="email"
              onFocus={()=>setFocus('e')} onBlur={()=>setFocus(null)}
              className="w-full rounded-2xl pl-10 pr-4 py-4 text-[14px] outline-none transition-all duration-300"
              style={{
                background:'rgba(255,255,255,0.05)', color:'#fff', caretColor:'#fd297b',
                border: focus==='e' ? '1.5px solid rgba(253,41,123,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                boxShadow: focus==='e' ? '0 0 24px rgba(253,41,123,0.12)' : 'none',
              }} />
          </div>

          {/* Password input */}
          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='p' ? '#fd297b' : 'rgba(255,255,255,0.25)', transition:'color 0.3s' }}>🔒</div>
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type="password" placeholder={t.pass}
              autoComplete={mode==='signup' ? 'new-password' : 'current-password'}
              onFocus={()=>setFocus('p')} onBlur={()=>setFocus(null)}
              onKeyDown={e=>{ if(e.key==='Enter') submit() }}
              className="w-full rounded-2xl pl-10 pr-4 py-4 text-[14px] outline-none transition-all duration-300"
              style={{
                background:'rgba(255,255,255,0.05)', color:'#fff', caretColor:'#fd297b',
                border: focus==='p' ? '1.5px solid rgba(253,41,123,0.5)' : '1.5px solid rgba(255,255,255,0.07)',
                boxShadow: focus==='p' ? '0 0 24px rgba(253,41,123,0.12)' : 'none',
              }} />
          </div>

          {/* Error */}
          {error && (
            <div className="text-[12px] text-center px-3 py-2 rounded-xl mb-3"
              style={{ background:'rgba(239,68,68,0.08)', color:'#f87171', border:'1px solid rgba(239,68,68,0.12)', animation:'shake 0.35s ease' }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <button onClick={submit} disabled={loading || !email || !pass}
            className="w-full rounded-2xl py-[16px] text-[15px] font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-default"
            style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background:'linear-gradient(135deg, #fd297b 0%, #c850c0 50%, #6c63ff 100%)',
              color:'#fff', letterSpacing:'-0.3px',
              boxShadow:'0 12px 36px rgba(253,41,123,0.3), 0 0 50px rgba(200,80,192,0.08)',
            }}>
            {loading ? t.connecting : mode==='signin' ? t.cta : t.ctaUp}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.08)' }} />
            <span className="text-[11px] font-medium" style={{ color:'rgba(255,255,255,0.2)' }}>— {t.or} —</span>
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google (visual only) */}
          <button className="w-full rounded-2xl py-3.5 text-[13px] font-medium flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] cursor-pointer"
            style={{ background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.55)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {t.google}
          </button>
        </div>

        {/* Tagline */}
        <div className="text-center mt-5" style={{ opacity:show?1:0, transition:'opacity 0.6s 0.5s ease' }}>
          <p className="text-[11px] italic" style={{ color:'rgba(253,41,123,0.4)' }}>{t.tagline}</p>
        </div>

        {/* Footer toggle */}
        <div className="text-center mt-3 mb-2">
          <button onClick={() => { setMode(mode==='signin'?'signup':'signin'); setError(null) }}
            className="text-[12px] active:opacity-60 transition-opacity cursor-pointer"
            style={{ color:'rgba(255,255,255,0.3)' }}>
            {mode==='signin' ? t.footer : t.footerBack}{' '}
            <span style={{ color:'#fd297b', fontWeight:600 }}>{mode==='signin' ? t.footerAction : t.footerActionBack}</span>
          </button>
        </div>

      </div>

      <style>{`
        @keyframes bgPan { from{transform:scale(1) translate(0,0)} to{transform:scale(1.08) translate(-1%,-1%)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 60%{transform:translateX(5px)} }
        @keyframes heartFloat { 0%{transform:translateY(0) rotate(0deg);opacity:0} 10%{opacity:0.08} 90%{opacity:0.04} 100%{transform:translateY(-600px) rotate(20deg);opacity:0} }
      `}</style>
    </div>
  )
}
