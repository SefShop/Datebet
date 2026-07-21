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
  // Uses whatever language was already selected (Landing page / AppContext,
  // both read the same 'lang' localStorage key) — no independent toggle or
  // separate state here anymore.
  const lang = langProp
  const t = C[lang]
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [name, setName]       = useState('')
  const [age, setAge]         = useState('')
  const [mode, setMode]       = useState<'signin'|'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [successMsg, setSuccessMsg] = useState<string|null>(null)
  const [show, setShow]       = useState(false)
  const [focus, setFocus]     = useState<string|null>(null)

  useEffect(() => { setTimeout(() => setShow(true), 80) }, [])

  async function submit() {
    if (!email || !pass) return
    setLoading(true); setError(null); setSuccessMsg(null)
    try {
      if (mode === 'signup') {
        if (!name || !age) { setError(lang==='gr'?'Συμπλήρωσε όνομα και ηλικία':'Fill in name and age'); setLoading(false); return }
        console.log('AUTH SIGNUP START')
        // Pass the entered name into auth metadata too — this closes a race
        // condition where the app-shell's own onAuthStateChange listener
        // (app/app/page.tsx) can independently create the profiles row
        // (e.g. for Google OAuth) before this screen's own save runs.
        // With the name already in user_metadata from the moment signUp()
        // resolves, whichever code path creates the row first uses the
        // correct name — there is no longer a window where it falls back
        // to a generic default.
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { full_name: name, age: parseInt(age) || 0 } },
        })
        if (authError) { setError(authError.message); setLoading(false); return }
        console.log('SIGNUP AUTH USER CREATED:', authData.user?.id)

        const userId = authData.user?.id
        if (userId) {
          try {
            await ensureProfile(userId, { name, age: parseInt(age) || 0 })
            const { data: verify } = await supabase.from('profiles').select('id, name, age').eq('id', userId).maybeSingle()
            console.log('ONBOARDING PROFILE VERIFY:', verify)
            if (!verify || !verify.name || verify.name !== name) {
              throw new Error('Profile verification failed after save')
            }
            console.log('ONBOARDING PROFILE HYDRATED:', verify.name)
          } catch (saveErr: any) {
            console.error('ONBOARDING PROFILE SAVE ERROR:', saveErr?.message)
            setError(lang==='gr'
              ? 'Κάτι πήγε στραβά κατά την αποθήκευση του προφίλ σου. Δοκίμασε ξανά.'
              : 'Something went wrong saving your profile. Please try again.')
            setLoading(false)
            return  // do not navigate into the app with incomplete/unsaved data
          }
        }

        // If no session yet, email confirmation is required
        if (!authData.session) {
          setSuccessMsg(lang==='gr'?'Έλεγξε το email σου για να επιβεβαιώσεις τον λογαριασμό σου.':'Check your email to confirm your account.')
          setLoading(false)
          return
        }
      } else {
        console.log('AUTH LOGIN START')
        const { data: signInData, error: e } = await supabase.auth.signInWithPassword({ email, password: pass })
        if (e) {
          const msg = e.message.toLowerCase().includes('invalid')
            ? (lang==='gr'?'Λάθος email ή κωδικός':'Wrong email or password')
            : e.message
          setError(msg); setLoading(false); return
        }
        console.log('AUTH LOGIN SUCCESS')
        // Ensure a profile row exists for existing users
        if (signInData.user?.id) await ensureProfile(signInData.user.id, {})
      }
      onAuth()
    } catch (e: any) { setError(e.message); setLoading(false) }
  }

  // Create or correctly update the profiles row for the authenticated user.
  // Never creates a duplicate row (keyed by id, one row per user). If a row
  // already exists (e.g. auto-created by a DB trigger, or by the app-shell's
  // own ensureProfileExists on the same sign-in event) with a generic/empty
  // name, this UPDATES it with the real onboarding values instead of
  // silently leaving the generic name in place — that silent bail-out was
  // the root cause of profiles permanently showing "Player" after signup.
  // A genuinely different existing name (set later via Edit Profile) is
  // never overwritten.
  async function ensureProfile(userId: string, fields: { name?: string; age?: number }) {
    console.log('PROFILE ENSURE START')
    console.log('ONBOARDING PROFILE SAVE START:')
    try {
      const { data: existing } = await supabase.from('profiles').select('id, name, age').eq('id', userId).maybeSingle()

      const hasRealName = !!fields.name && fields.name.trim().length > 0

      if (existing) {
        const existingIsGeneric = !existing.name || existing.name.trim() === '' || existing.name === 'Player'
        if (hasRealName && existingIsGeneric) {
          console.log('ONBOARDING PROFILE UPSERT:', userId)
          const { error } = await supabase.from('profiles').update({
            name: fields.name,
            age: fields.age || existing.age || 0,
          }).eq('id', userId)
          if (error) throw error
          console.log('ONBOARDING PROFILE SAVE SUCCESS:')
        } else {
          console.log('PROFILE ENSURE SUCCESS (exists)')
        }
        return
      }

      // Pull Google metadata only to fill empty profile
      const { data: { user } } = await supabase.auth.getUser()
      const meta: any = user?.user_metadata || {}
      const gName = fields.name || meta.full_name || meta.name || 'Player'
      const gPhoto = meta.avatar_url || meta.picture || ''

      console.log('ONBOARDING PROFILE UPSERT:', userId)
      const { error } = await supabase.from('profiles').insert({
        id: userId,
        name: gName,
        age: fields.age || 0,
        bio: '', photo: gPhoto, location: '',
        onboarding_completed: false,
      })
      if (error) throw error
      console.log('ONBOARDING PROFILE SAVE SUCCESS:')
      console.log('PROFILE ENSURE SUCCESS')
    } catch (e: any) {
      console.error('ONBOARDING PROFILE SAVE ERROR:', e.message)
      throw e
    }
  }

  async function googleLogin() {
    console.log('GOOGLE LOGIN START')
    setError(null); setSuccessMsg(null)
    try {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/app' },
      })
      if (e) {
        console.warn('GOOGLE OAUTH not configured in Supabase? →', e.message)
        setError(lang==='gr'?'Η σύνδεση Google δεν είναι διαθέσιμη.':'Google login is unavailable.')
        return
      }
      console.log('GOOGLE LOGIN REDIRECT')
      // Browser redirects to Google; on return, /app detects the session
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background:'#09090f' }}>

      {/* ── BG: blurred romantic image ── */}
      <div className="absolute inset-0">
        <img src="https://images.pexels.com/photos/5933357/pexels-photo-5933357.jpeg?auto=compress&cs=tinysrgb&w=900&h=1400&fit=crop"
          alt="" className="w-full h-full object-cover" style={{ animation:'bgPan 20s ease-in-out infinite alternate' }} />
        <div className="absolute inset-0" style={{ background:'rgba(5,5,8,0.68)' }} />
        <div className="absolute inset-0" style={{ background:'linear-gradient(180deg, rgba(5,5,8,0.3) 0%, rgba(5,5,8,0.6) 40%, rgba(5,5,8,0.92) 80%, rgba(5,5,8,1) 100%)' }} />
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 50% 30%, rgba(253,41,123,0.094) 0%, transparent 60%)' }} />
      </div>

      {/* ── Floating hearts ── */}
      {[0,1,2,3,4].map(i => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${15+i*17}%`, bottom: '-5%', fontSize: 12+i*3, opacity: 0.06+i*0.01, color:'#ff3384',
          animation: `heartFloat ${8+i*3}s ${i*1.5}s ease-in-out infinite`,
        }}>♥</div>
      ))}

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-14 pb-8 overflow-y-auto" style={{ scrollbarWidth:'none' }}>

        {/* Logo */}
        <div className="text-center mb-1" style={{ opacity:show?1:0, transform:show?'translateY(0)':'translateY(-10px)', transition:'all 0.6s ease' }}>
          <h2 className="text-[20px] font-extrabold tracking-[-0.5px]" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <span className="text-white">Date</span><span style={{ background:'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Duel</span>
          </h2>
          <p className="text-[9px] font-bold tracking-[3px] uppercase mt-0.5" style={{ color:'rgba(253,41,123,0.59)' }}>
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
            {t.h1[1]} <span style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontStyle:'italic' }}>{t.h1[2]}</span>
          </p>
        </div>

        {/* ── Glass card ── */}
        <div className="w-full max-w-[380px] mx-auto rounded-3xl p-6 flex-shrink-0" style={{
          background:'rgba(255,255,255,0.047)', backdropFilter:'blur(28px) saturate(1.4)',
          border:'1px solid rgba(255,255,255,0.094)',
          boxShadow:'0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.047)',
          opacity:show?1:0, transform:show?'translateY(0) scale(1)':'translateY(24px) scale(0.98)',
          transition:'all 0.7s 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Tabs */}
          <div className="flex mb-5 rounded-2xl overflow-hidden" style={{ background:'rgba(255,255,255,0.047)', border:'1px solid rgba(255,255,255,0.071)' }}>
            {(['signin','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null) }}
                className="flex-1 py-3 text-[13px] font-bold transition-all duration-300 cursor-pointer relative"
                style={{ color: mode===m ? '#fff' : 'rgba(255,255,255,0.413)' }}>
                {m==='signin' ? t.tabIn : t.tabUp}
                {mode===m && <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full" style={{ background:'linear-gradient(90deg,#ff3384,#d84dd8)' }} />}
              </button>
            ))}
          </div>

          {/* Name + Age (signup only) */}
          {mode === 'signup' && (
            <div className="flex gap-2.5 mb-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='n' ? '#ff3384' : 'rgba(255,255,255,0.295)', transition:'color 0.3s' }}>👤</div>
                <input value={name} onChange={e=>setName(e.target.value)}
                  type="text" placeholder={lang==='gr'?'Όνομα':'Name'}
                  onFocus={()=>setFocus('n')} onBlur={()=>setFocus(null)}
                  className="w-full rounded-2xl pl-10 pr-4 py-4 text-[14px] outline-none transition-all duration-300"
                  style={{
                    background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                    border: focus==='n' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                    boxShadow: focus==='n' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
                  }} />
              </div>
              <div className="relative" style={{ width: 90 }}>
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='a' ? '#ff3384' : 'rgba(255,255,255,0.295)', transition:'color 0.3s' }}>🎂</div>
                <input value={age} onChange={e=>setAge(e.target.value.replace(/\D/g,''))}
                  type="text" placeholder={lang==='gr'?'Ηλικία':'Age'} inputMode="numeric" maxLength={2}
                  onFocus={()=>setFocus('a')} onBlur={()=>setFocus(null)}
                  className="w-full rounded-2xl pl-10 pr-3 py-4 text-[14px] outline-none transition-all duration-300"
                  style={{
                    background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                    border: focus==='a' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                    boxShadow: focus==='a' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
                  }} />
              </div>
            </div>
          )}

          {/* Email input */}
          <div className="relative mb-3">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='e' ? '#ff3384' : 'rgba(255,255,255,0.295)', transition:'color 0.3s' }}>✉</div>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              type="email" placeholder={t.email} autoComplete="email"
              onFocus={()=>setFocus('e')} onBlur={()=>setFocus(null)}
              className="w-full rounded-2xl pl-10 pr-4 py-4 text-[14px] outline-none transition-all duration-300"
              style={{
                background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                border: focus==='e' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                boxShadow: focus==='e' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
              }} />
          </div>

          {/* Password input */}
          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='p' ? '#ff3384' : 'rgba(255,255,255,0.295)', transition:'color 0.3s' }}>🔒</div>
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type="password" placeholder={t.pass}
              autoComplete={mode==='signup' ? 'new-password' : 'current-password'}
              onFocus={()=>setFocus('p')} onBlur={()=>setFocus(null)}
              onKeyDown={e=>{ if(e.key==='Enter') submit() }}
              className="w-full rounded-2xl pl-10 pr-4 py-4 text-[14px] outline-none transition-all duration-300"
              style={{
                background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                border: focus==='p' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                boxShadow: focus==='p' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
              }} />
          </div>

          {/* Error */}
          {successMsg && (
            <div className="text-[12px] text-center px-3 py-2.5 rounded-xl mb-3"
              style={{ background:'rgba(74,222,128,0.08)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.15)' }}>
              ✉️ {successMsg}
            </div>
          )}

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
              background:'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)',
              color:'#fff', letterSpacing:'-0.3px',
              boxShadow:'0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)',
            }}>
            {loading ? t.connecting : mode==='signin' ? t.cta : t.ctaUp}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.094)' }} />
            <span className="text-[11px] font-medium" style={{ color:'rgba(255,255,255,0.236)' }}>— {t.or} —</span>
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.094)' }} />
          </div>

          {/* Google */}
          <button onClick={googleLogin} className="w-full rounded-2xl py-3.5 text-[13px] font-medium flex items-center justify-center gap-2.5 transition-all active:scale-[0.97] cursor-pointer"
            style={{ background:'rgba(255,255,255,0.047)', color:'rgba(255,255,255,0.649)', border:'1px solid rgba(255,255,255,0.094)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {t.google}
          </button>
        </div>

        {/* Tagline */}
        <div className="text-center mt-5" style={{ opacity:show?1:0, transition:'opacity 0.6s 0.5s ease' }}>
          <p className="text-[11px] italic" style={{ color:'rgba(253,41,123,0.472)' }}>{t.tagline}</p>
        </div>

        {/* Footer toggle */}
        <div className="text-center mt-3 mb-2">
          <button onClick={() => { setMode(mode==='signin'?'signup':'signin'); setError(null) }}
            className="text-[12px] active:opacity-60 transition-opacity cursor-pointer"
            style={{ color:'rgba(255,255,255,0.354)' }}>
            {mode==='signin' ? t.footer : t.footerBack}{' '}
            <span style={{ color:'#ff3384', fontWeight:600 }}>{mode==='signin' ? t.footerAction : t.footerActionBack}</span>
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
