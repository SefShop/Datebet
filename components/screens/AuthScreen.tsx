'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props { onAuth: () => void; lang?: 'en' | 'gr' }

// Reuses the same approved master brand assets as the desktop experience
// (components/DesktopComingSoon.tsx) — same paths, same native pixel
// ratios — so the mark is never redrawn or approximated here either.
const LOGO_MARK_SRC = '/brand/dateduel-mark-master.png' // DD mark only
const LOGO_MARK_RATIO = 686 / 386 // asset's native aspect ratio

const C = {
  en: {
    tabIn: 'Sign In', tabUp: 'Sign Up',
    h1: ['No photos first.', 'Just', 'connection.'],
    welcomeTitle: 'Welcome back!',
    welcomeSubPre: 'Sign in to continue your ', welcomeSubAccent: 'DateDuel', welcomeSubPost: ' journey',
    email: 'Email', pass: 'Password',
    cta: 'Sign In', ctaUp: 'Create account →',
    or: 'or continue with', google: 'Continue with Google',
    apple: 'Continue with Apple (coming soon)', facebook: 'Continue with Facebook (coming soon)',
    rememberMe: 'Remember me', forgot: 'Forgot password?',
    forgotSent: 'Check your email for a reset link.',
    forgotNeedEmail: 'Enter your email above first.',
    tagline: 'No ghosting. Just show up.',
    newHere: 'New to DateDuel?', createAccount: 'Create account',
    footerBack: 'Already have an account?', footerActionBack: 'Sign in',
    connecting: 'connecting...',
    legalPre: 'By continuing, you agree to our ', legalTerms: 'Terms of Service', legalAnd: ' and ', legalPrivacy: 'Privacy Policy',
  },
  gr: {
    tabIn: 'Σύνδεση', tabUp: 'Δημιουργία',
    h1: ['Όχι φωτογραφίες πρώτα.', 'Μόνο', 'σύνδεση.'],
    welcomeTitle: 'Καλώς ήρθες πίσω!',
    welcomeSubPre: 'Συνδέσου για να συνεχίσεις το ταξίδι σου στο ', welcomeSubAccent: 'DateDuel', welcomeSubPost: '',
    email: 'Email', pass: 'Κωδικός',
    cta: 'Σύνδεση', ctaUp: 'Δημιούργησε →',
    or: 'ή συνέχισε με', google: 'Συνέχεια με Google',
    apple: 'Συνέχεια με Apple (σύντομα)', facebook: 'Συνέχεια με Facebook (σύντομα)',
    rememberMe: 'Να με θυμάσαι', forgot: 'Ξέχασες τον κωδικό;',
    forgotSent: 'Έλεγξε το email σου για τον σύνδεσμο επαναφοράς.',
    forgotNeedEmail: 'Συμπλήρωσε πρώτα το email σου.',
    tagline: 'Χωρίς ghosting. Απλά εμφανίσου.',
    newHere: 'Καινούριος/α στο DateDuel;', createAccount: 'Δημιούργησε λογαριασμό',
    footerBack: 'Έχεις ήδη λογαριασμό;', footerActionBack: 'Σύνδεση',
    connecting: 'σύνδεση...',
    legalPre: 'Συνεχίζοντας, αποδέχεσαι τους ', legalTerms: 'Όρους Χρήσης', legalAnd: ' και την ', legalPrivacy: 'Πολιτική Απορρήτου',
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
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(true)
  const [forgotLoading, setForgotLoading] = useState(false)

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

  // Real Supabase password-reset email — not a fake/no-op link. Uses the
  // same built-in Auth email delivery Supabase already uses for signup
  // confirmation, so it works with the existing project configuration
  // without needing a new provider or any backend change.
  async function forgotPassword() {
    if (!email) { setError(t.forgotNeedEmail); return }
    setError(null); setSuccessMsg(null); setForgotLoading(true)
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/app',
      })
      if (e) { setError(e.message); setForgotLoading(false); return }
      setSuccessMsg(t.forgotSent)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="dd-auth-root relative flex flex-col h-full overflow-hidden" style={{ background:'#09090f' }}>

      {/* ── BG: premium near-black base with subtle brand glow — matches
          the approved MASTER (no photograph, no photographic texture) ── */}
      <div className="absolute inset-0" style={{ background:'#08070a' }}>
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse 70% 40% at 50% 18%, rgba(255,51,132,0.16) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse 60% 45% at 80% 55%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse 60% 45% at 15% 70%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      {/* ── Floating hearts ── */}
      {[0,1,2,3,4].map(i => (
        <div key={i} className="absolute pointer-events-none" style={{
          left: `${15+i*17}%`, bottom: '-5%', fontSize: 12+i*3, opacity: 0.06+i*0.01, color:'#ff3384',
          animation: `heartFloat ${8+i*3}s ${i*1.5}s ease-in-out infinite`,
        }}>♥</div>
      ))}

      {/* ── Content — NO internal scroll: every section below is sized via
          height-responsive CSS variables (see the <style> block) so the
          whole composition fits the real dynamic viewport without
          scrolling, instead of relying on overflow-y to reach lower
          content. ── */}
      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full" style={{ maxWidth:390, paddingTop:'var(--outer-pad-top)', paddingBottom:'var(--outer-pad-bottom)' }}>

        {/* ── Brand header: DD mark in an orbital ring + wordmark + tagline ── */}
        <div className="relative text-center" style={{ opacity:show?1:0, transform:show?'translateY(0)':'translateY(-10px)', transition:'all 0.6s ease' }}>

          {/* Corner decorations — purely decorative, matches the approved reference */}
          <svg aria-hidden width="22" height="20" viewBox="0 0 24 22" fill="none" className="absolute" style={{ left: 6, top: 4, opacity: 0.5 }}>
            <path d="M12 20.5C5 15.8 1.5 12 1.5 7.8 1.5 4.6 4 2 7 2c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3 0 5.5 2.6 5.5 5.8 0 4.2-3.5 8-10.5 12.7Z" stroke="#ff3384" strokeWidth="1.4"/>
          </svg>
          <svg aria-hidden width="26" height="22" viewBox="0 0 28 24" fill="none" className="absolute" style={{ right: 4, top: 6, opacity: 0.45 }}>
            <path d="M4 4h20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12l-5 5v-5H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="#8b7bff" strokeWidth="1.4"/>
            <circle cx="9" cy="11" r="1" fill="#8b7bff"/><circle cx="14" cy="11" r="1" fill="#8b7bff"/><circle cx="19" cy="11" r="1" fill="#8b7bff"/>
          </svg>
          {[{l:'18%',t:'2%',s:8},{l:'82%',t:'16%',s:6},{l:'88%',t:'0%',s:5}].map((s,i) => (
            <span key={i} aria-hidden className="absolute" style={{ left:s.l, top:s.t, fontSize:s.s, color:'rgba(255,255,255,0.45)' }}>✦</span>
          ))}

          {/* Orbital ring behind the mark */}
          <div className="relative mx-auto" style={{ width:'var(--ring)', height:'var(--ring)' }}>
            <svg viewBox="0 0 96 96" className="absolute inset-0" style={{ opacity: 0.55, width:'100%', height:'100%' }}>
              <defs>
                <linearGradient id="authRingL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff3384"/><stop offset="100%" stopColor="#ff3384" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="authRingR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b7bff"/><stop offset="100%" stopColor="#8b7bff" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M48 3 A45 45 0 0 0 48 93" stroke="url(#authRingL)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
              <path d="M48 3 A45 45 0 0 1 48 93" stroke="url(#authRingR)" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <img src={LOGO_MARK_SRC} alt="DateDuel" style={{ display:'block', height:'var(--mark)', width:`calc(var(--mark) * ${LOGO_MARK_RATIO})`, objectFit:'contain' }} />
            </div>
          </div>

          <h2 className="font-extrabold tracking-[-0.5px]" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:'var(--wm-size)', marginTop:'var(--gap-mw)' }}>
            <span className="text-white">Date</span><span style={{ background:'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Duel</span>
          </h2>
          <p className="font-bold tracking-[3px] uppercase" style={{ color:'rgba(255,255,255,0.4)', fontSize:'var(--tag-size)', marginTop:'var(--gap-wt)' }}>
            PLAY · CONNECT · MATCH
          </p>
          <div className="flex items-center justify-center gap-2" style={{ marginTop:'var(--gap-td)' }}>
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,51,132,0.5))' }} />
            <span style={{ fontSize: 10, color: '#ff3384' }}>♥</span>
            <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg,rgba(139,123,255,0.5),transparent)' }} />
          </div>
        </div>

        {/* Headline — mode-aware: MASTER copy for Sign In, existing marketing copy for Sign Up (unchanged) */}
        <div className="text-center" style={{ marginTop:'var(--headline-mt)', marginBottom:'var(--headline-mb)', opacity:show?1:0, transform:show?'translateY(0)':'translateY(16px)', transition:'all 0.7s 0.1s cubic-bezier(0.16,1,0.3,1)' }}>
          {mode === 'signin' ? (
            <>
              <h1 className="font-extrabold text-white leading-tight tracking-[-0.5px]"
                style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:'var(--h1-size)', marginBottom:'var(--gap-welcome-subtext)' }}>
                {t.welcomeTitle}
              </h1>
              <p className="text-white/55 leading-snug" style={{ fontSize:'var(--sub-size)' }}>
                {t.welcomeSubPre}<span style={{ background:'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontWeight:700 }}>{t.welcomeSubAccent}</span>{t.welcomeSubPost}
              </p>
            </>
          ) : (
            <>
              <h1 className="font-extrabold text-white leading-tight tracking-[-0.5px]"
                style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:'var(--h1-size)', marginBottom:'var(--gap-welcome-subtext)' }}>
                {t.h1[0]}
              </h1>
              <p className="font-bold text-white/60 leading-tight" style={{ fontSize:'calc(var(--h1-size) * 0.76)' }}>
                {t.h1[1]} <span style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontStyle:'italic' }}>{t.h1[2]}</span>
              </p>
            </>
          )}
        </div>

        {/* ── Glass card ── */}
        <div className="mx-auto flex-shrink-0" style={{
          width:'calc(100% - 24px)', maxWidth:'366px', borderRadius:'28px',
          padding:'var(--card-pad)',
          background:'rgba(255,255,255,0.047)', backdropFilter:'blur(28px) saturate(1.4)',
          border:'1px solid rgba(255,255,255,0.094)',
          boxShadow:'0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.047)',
          opacity:show?1:0, transform:show?'translateY(0) scale(1)':'translateY(24px) scale(0.98)',
          transition:'all 0.7s 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Tabs */}
          <div className="flex rounded-2xl overflow-hidden" style={{ marginBottom:'var(--tab-mb)', background:'rgba(255,255,255,0.047)', border:'1px solid rgba(255,255,255,0.071)' }}>
            {(['signin','signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccessMsg(null) }}
                className="flex-1 text-[13px] font-bold transition-all duration-300 cursor-pointer relative"
                style={{ color: mode===m ? '#fff' : 'rgba(255,255,255,0.413)', paddingTop:'var(--tab-pad-y)', paddingBottom:'var(--tab-pad-y)' }}>
                {m==='signin' ? t.tabIn : t.tabUp}
                {mode===m && <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full" style={{ background:'linear-gradient(90deg,#ff3384,#d84dd8)' }} />}
              </button>
            ))}
          </div>

          {/* Name + Age (signup only) */}
          {mode === 'signup' && (
            <div className="flex gap-2.5" style={{ marginBottom:'var(--field-mb)' }}>
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: focus==='n' ? '#ff3384' : 'rgba(255,255,255,0.295)', transition:'color 0.3s' }}>👤</div>
                <input value={name} onChange={e=>setName(e.target.value)}
                  type="text" placeholder={lang==='gr'?'Όνομα':'Name'}
                  onFocus={()=>setFocus('n')} onBlur={()=>setFocus(null)}
                  className="w-full rounded-2xl pl-10 pr-4 text-[14px] outline-none transition-all duration-300"
                  style={{
                    paddingTop:'var(--field-pad-y)', paddingBottom:'var(--field-pad-y)',
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
                  className="w-full rounded-2xl pl-10 pr-3 text-[14px] outline-none transition-all duration-300"
                  style={{
                    paddingTop:'var(--field-pad-y)', paddingBottom:'var(--field-pad-y)',
                    background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                    border: focus==='a' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                    boxShadow: focus==='a' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
                  }} />
              </div>
            </div>
          )}

          {/* Email input */}
          <div className="relative" style={{ marginBottom:'var(--field-mb)' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#ff3384', opacity: focus==='e' ? 1 : 0.75, transition:'opacity 0.3s' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              type="email" placeholder={t.email} autoComplete="email"
              onFocus={()=>setFocus('e')} onBlur={()=>setFocus(null)}
              className="w-full rounded-2xl pl-10 pr-4 text-[14px] outline-none transition-all duration-300"
              style={{
                paddingTop:'var(--field-pad-y)', paddingBottom:'var(--field-pad-y)',
                background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                border: focus==='e' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                boxShadow: focus==='e' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
              }} />
          </div>

          {/* Password input — with real show/hide toggle */}
          <div className="relative" style={{ marginBottom:'var(--field-mb)' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#ff3384', opacity: focus==='p' ? 1 : 0.75, transition:'opacity 0.3s' }}>
              <svg width="15" height="16" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2.3" stroke="currentColor" strokeWidth="1.7"/><path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="15" r="1.3" fill="currentColor"/></svg>
            </div>
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type={showPass ? 'text' : 'password'} placeholder={t.pass}
              autoComplete={mode==='signup' ? 'new-password' : 'current-password'}
              onFocus={()=>setFocus('p')} onBlur={()=>setFocus(null)}
              onKeyDown={e=>{ if(e.key==='Enter') submit() }}
              className="w-full rounded-2xl pl-10 pr-11 text-[14px] outline-none transition-all duration-300"
              style={{
                paddingTop:'var(--field-pad-y)', paddingBottom:'var(--field-pad-y)',
                background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                border: focus==='p' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                boxShadow: focus==='p' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
              }} />
            <button type="button" onClick={() => setShowPass(s => !s)}
              aria-label={showPass ? (lang==='gr'?'Απόκρυψη κωδικού':'Hide password') : (lang==='gr'?'Εμφάνιση κωδικού':'Show password')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color:'rgba(255,255,255,0.4)', background:'none', border:'none', padding: 4, lineHeight: 0 }}>
              {showPass ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.5 6.7C4 8.3 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.7-1.2M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-2.4 3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              )}
            </button>
          </div>

          {/* Options row — Sign In only, matches MASTER (Remember me / Forgot password) */}
          {mode === 'signin' && (
            <div className="flex items-center justify-between px-0.5" style={{ marginBottom:'var(--options-mb)' }}>
              <button type="button" onClick={() => setRemember(r => !r)} className="flex items-center gap-2 cursor-pointer" style={{ background:'none', border:'none', padding:0 }}>
                <span className="flex items-center justify-center" style={{
                  width: 16, height: 16, borderRadius: 5,
                  border: remember ? '1.5px solid #ff3384' : '1.5px solid rgba(255,255,255,0.3)',
                  background: remember ? 'linear-gradient(135deg,#ff3384,#d84dd8)' : 'transparent',
                }}>
                  {remember && <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M4 12l6 6L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                <span className="text-[12px]" style={{ color:'rgba(255,255,255,0.55)' }}>{t.rememberMe}</span>
              </button>
              <button type="button" onClick={forgotPassword} disabled={forgotLoading}
                className="text-[12px] font-semibold cursor-pointer disabled:opacity-50" style={{ color:'#ff3384', background:'none', border:'none', padding:0 }}>
                {t.forgot}
              </button>
            </div>
          )}

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
            className="w-full rounded-2xl text-[15px] font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-default flex items-center justify-center gap-2"
            style={{
              paddingTop:'var(--cta-pad-y)', paddingBottom:'var(--cta-pad-y)',
              fontFamily:"'Plus Jakarta Sans',sans-serif",
              background:'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)',
              color:'#fff', letterSpacing:'-0.3px',
              boxShadow:'0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)',
            }}>
            {loading ? t.connecting : (mode==='signin' ? (
              <>{t.cta}<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></>
            ) : t.ctaUp)}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3" style={{ marginTop:'var(--divider-my)', marginBottom:'var(--divider-my)' }}>
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.094)' }} />
            <span className="text-[11px] font-medium" style={{ color:'rgba(255,255,255,0.236)' }}>{t.or}</span>
            <div className="flex-1 h-px" style={{ background:'rgba(255,255,255,0.094)' }} />
          </div>

          {/* Social row — Google is the real, working provider already
              configured in this project. Apple/Facebook are shown for
              visual parity with the approved reference but are not wired
              to a real auth provider (none is configured in Supabase for
              this project), so they are inert/disabled rather than fake
              working buttons. */}
          <div className="flex items-center gap-2.5">
            <button onClick={googleLogin} aria-label={t.google}
              className="flex-1 rounded-2xl flex items-center justify-center transition-all active:scale-[0.97] cursor-pointer"
              style={{ paddingTop:'var(--social-pad-y)', paddingBottom:'var(--social-pad-y)', background:'rgba(255,255,255,0.047)', border:'1px solid rgba(255,255,255,0.094)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </button>
            <button type="button" disabled aria-label={t.apple} title={t.apple}
              className="flex-1 rounded-2xl flex items-center justify-center cursor-not-allowed"
              style={{ paddingTop:'var(--social-pad-y)', paddingBottom:'var(--social-pad-y)', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', opacity:0.4 }}>
              <svg width="16" height="18" viewBox="0 0 17 20" fill="#fff"><path d="M13.9 10.6c0-2 1.6-3 1.7-3.1-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.2.8-.6 0-1.7-.7-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1 2.7-2 .9-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.8-3.8ZM11.7 4.4c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 1.9-.5 2.5-1.2Z"/></svg>
            </button>
            <button type="button" disabled aria-label={t.facebook} title={t.facebook}
              className="flex-1 rounded-2xl flex items-center justify-center cursor-not-allowed"
              style={{ paddingTop:'var(--social-pad-y)', paddingBottom:'var(--social-pad-y)', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', opacity:0.4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#1877F2"/><path d="M15.1 12.7h-2v7.1h-2.9v-7.1H8.6v-2.5h1.6V8.6c0-1.6.8-3.1 3.2-3.1h2.1v2.4h-1.5c-.3 0-.7.2-.7.9v1.4h2.2l-.4 2.5Z" fill="#fff"/></svg>
            </button>
          </div>
        </div>

        {/* Footer toggle — mode-aware, Sign-In direction copy matches MASTER */}
        <div className="text-center" style={{ marginTop:'var(--footer-mt)', marginBottom:'var(--footer-mb)' }}>
          <button onClick={() => { setMode(mode==='signin'?'signup':'signin'); setError(null); setSuccessMsg(null) }}
            className="active:opacity-60 transition-opacity cursor-pointer"
            style={{ color:'rgba(255,255,255,0.354)', fontSize:'var(--create-size)' }}>
            {mode==='signin' ? t.newHere : t.footerBack}{' '}
            <span style={{ color:'#ff3384', fontWeight:600 }}>{mode==='signin' ? t.createAccount : t.footerActionBack}</span>
          </button>
        </div>

        {/* ── Bottom brand art: neon double-heart horizon glow (decorative only) ── */}
        <div className="flex justify-center" style={{ opacity:show?1:0, transition:'opacity 0.6s 0.5s ease' }}>
          <svg viewBox="0 0 72 52" aria-hidden style={{ width:'var(--hearts-w)', height:'var(--hearts-h)' }}>
            <defs>
              <filter id="authHeartGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <g filter="url(#authHeartGlow)" fill="none" strokeWidth="1.6">
              <path d="M26 34c-9-6-13-11-13-16 0-3.6 2.7-6.3 6-6.3 2.3 0 4.1 1.2 5.7 3.2 1.6-2 3.4-3.2 5.7-3.2 3.3 0 6 2.7 6 6.3 0 5-4 10-10.4 16Z" stroke="#ff3384" opacity="0.85"/>
              <path d="M44 40c-8-5.3-11.5-9.6-11.5-14 0-3.1 2.4-5.6 5.3-5.6 2 0 3.6 1.1 5 2.8 1.4-1.7 3-2.8 5-2.8 2.9 0 5.3 2.5 5.3 5.6 0 4.4-3.5 8.7-9.1 14Z" stroke="#8b7bff" opacity="0.85"/>
            </g>
          </svg>
        </div>

        {/* Legal — plain, non-navigating text: no Terms/Privacy pages exist
            in this project, so these are labeled visual text rather than
            links to a fake destination. */}
        <div className="text-center" style={{ marginTop:'var(--legal-mt)' }}>
          <p className="leading-snug" style={{ color:'rgba(255,255,255,0.28)', fontSize:'var(--legal-size)' }}>
            {t.legalPre}<span style={{ color:'rgba(255,255,255,0.45)' }}>{t.legalTerms}</span>{t.legalAnd}<span style={{ color:'rgba(255,255,255,0.45)' }}>{t.legalPrivacy}</span>
          </p>
        </div>

      </div>

      <style>{`
        /* ── Three height MODES (no redesign — sizing/spacing only) ──
           MODE A — LARGE MOBILE   : viewport height >= 820px (base values below, no query needed)
           MODE B — NORMAL MOBILE  : 700px – 819px  → @media (max-height: 819px)  [primary safe layout, ref ~390x740]
           MODE C — SHORT MOBILE   : < 700px         → @media (max-height: 699px)
           Sizes are tuned to fill the screen (no giant empty band under the
           legal text) while still guaranteeing zero scroll — verified via
           forced-scroll + getBoundingClientRect measurement, not just
           scrollHeight<=clientHeight. */
        .dd-auth-root {
          height: 100vh; height: 100dvh;
          min-height: 100vh; min-height: 100dvh;
          max-height: 100vh; max-height: 100dvh;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);

          /* MODE A — LARGE (>= 820px height). Gaps are trimmed below the
             nominal spacing-table numbers where real (measured, not
             estimated) line-height — confirmed ~1.5x font-size in this
             stack, not the ~1.3x assumed on paper — would otherwise blow
             the vertical budget and leave far more than the 30-60px target
             bottom-spare at the 390x844 reference. Element/control sizes
             (mark, wordmark, tagline, headline, subtext, card padding,
             tab/field/button/social heights) stay at or very close to the
             spec'd numbers; gaps are the lever used to hit the spare-space
             target instead. */
          --outer-pad-top: 12px;
          --outer-pad-bottom: 24px;
          --ring: 96px;
          --mark: 50px;
          --gap-mw: 8px;
          --wm-size: 30px;
          --gap-wt: 5px;
          --tag-size: 11px;
          --gap-td: 6px;
          --headline-mt: 17px;   /* divider → Welcome back */
          --h1-size: 27px;
          --gap-welcome-subtext: 5px;
          --sub-size: 15px;
          --headline-mb: 18px;   /* supporting text → card */
          --card-pad: 16px;
          --tab-pad-y: 14px;     /* ~48-50px tab row height */
          --tab-mb: 9px;         /* tabs → fields (major) */
          --field-pad-y: 16px;   /* ~55-56px field height */
          --field-mb: 6px;       /* minor row gap (email→password, password→options) */
          --options-mb: 9px;     /* options → CTA (major) */
          --cta-pad-y: 14px;     /* ~50-54px button height */
          --divider-my: 9px;     /* CTA↔divider↔social (major) */
          --social-pad-y: 13px;  /* ~44-48px social height */
          --footer-mt: 17px;     /* card → create-account (major) */
          --footer-mb: 11px;     /* create-account → hearts */
          --hearts-w: 55px;
          --hearts-h: 40px;
          --legal-mt: 8px;       /* hearts → legal */
          --legal-size: 11px;
          --create-size: 14px;
        }
        @media (max-height: 819px) {
          /* MODE B — NORMAL (700–819px), reference viewport ~390x740 */
          .dd-auth-root {
            --outer-pad-top: 8px;
            --outer-pad-bottom: 8px;
            --ring: 88px;
            --mark: 46px;
            --gap-mw: 6px;
            --wm-size: 28px;
            --gap-wt: 4px;
            --tag-size: 11px;
            --gap-td: 5px;
            --headline-mt: 12px;
            --h1-size: 25px;
            --gap-welcome-subtext: 3px;
            --sub-size: 14px;
            --headline-mb: 7px;
            --card-pad: 11px;
            --tab-pad-y: 12px;    /* ~44-46px */
            --tab-mb: 7px;
            --field-pad-y: 14px;  /* ~51-52px */
            --field-mb: 5px;
            --options-mb: 7px;
            --cta-pad-y: 11px;    /* ~45-48px */
            --divider-my: 7px;
            --social-pad-y: 11px; /* ~38-42px */
            --footer-mt: 8px;
            --footer-mb: 6px;
            --hearts-w: 50px;
            --hearts-h: 36px;
            --legal-mt: 6px;
            --legal-size: 11px;
            --create-size: 14px;
          }
        }
        @media (max-height: 699px) {
          /* MODE C — SHORT (< 700px), verified fitting down to 360x640 */
          .dd-auth-root {
            --outer-pad-top: 5px;
            --outer-pad-bottom: 8px;
            --ring: 80px;
            --mark: 42px;
            --gap-mw: 5px;
            --wm-size: 26px;
            --gap-wt: 3px;
            --tag-size: 10px;
            --gap-td: 3px;
            --headline-mt: 8px;
            --h1-size: 23px;
            --gap-welcome-subtext: 2px;
            --sub-size: 13px;
            --headline-mb: 6px;
            --card-pad: 10px;
            --tab-pad-y: 10px;    /* ~41-42px */
            --tab-mb: 6px;
            --field-pad-y: 12px;  /* ~47-48px */
            --field-mb: 3px;
            --options-mb: 6px;
            --cta-pad-y: 10px;    /* ~40px — below the 48px nominal target;
                                      the only lever left once fonts/fields
                                      are at their Short-mode floor and the
                                      viewport is genuinely this short
                                      (down to 640px in the test matrix) */
            --divider-my: 6px;
            --social-pad-y: 9px;  /* ~33px — same trade-off as above */
            --footer-mt: 6px;
            --footer-mb: 4px;
            --hearts-w: 44px;
            --hearts-h: 32px;
            --legal-mt: 4px;
            --legal-size: 10px;
            --create-size: 13px;
          }
        }
        @keyframes bgPan { from{transform:scale(1) translate(0,0)} to{transform:scale(1.08) translate(-1%,-1%)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 60%{transform:translateX(5px)} }
        @keyframes heartFloat { 0%{transform:translateY(0) rotate(0deg);opacity:0} 10%{opacity:0.08} 90%{opacity:0.04} 100%{transform:translateY(-600px) rotate(20deg);opacity:0} }
      `}</style>
    </div>
  )
}
