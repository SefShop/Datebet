'use client'
import { useState, useEffect } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
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
    welcomeSubPre: 'Sign in to continue your ', welcomeSubAccent: 'DesireDuel', welcomeSubPost: ' journey',
    email: 'Email', pass: 'Password',
    cta: 'Sign In', ctaUp: 'Create account →',
    or: 'or continue with', google: 'Continue with Google',
    apple: 'Continue with Apple (coming soon)', facebook: 'Continue with Facebook (coming soon)',
    rememberMe: 'Remember me', forgot: 'Forgot password?',
    forgotSent: 'Check your email for a reset link.',
    forgotNeedEmail: 'Enter your email above first.',
    tagline: 'No ghosting. Just show up.',
    newHere: 'New to DesireDuel?', createAccount: 'Create account',
    footerBack: 'Already have an account?', footerActionBack: 'Sign in',
    connecting: 'connecting...',
    legalPre: 'By continuing, you agree to our ', legalTerms: 'Terms of Service', legalAnd: ' and ', legalPrivacy: 'Privacy Policy',
    // ── Sign Up MASTER intro screen (approved reference, separate from the
    // Sign In copy above — this screen has its own headline/copy) ──
    suHeading0: 'Create your', suHeadingAccent: 'account',
    suSub: 'It all starts with a match',
    suGoogle: 'Continue with Google', suFacebook: 'Continue with Facebook', suOr: 'OR', suEmail: 'Continue with email',
    suAgeNotice: 'You must be 18 or older to use DesireDuel.',
    suLegalPre: 'By continuing, you agree to our ', suLegalTerms: 'Terms of Service', suLegalAnd: ' and acknowledge our ', suLegalPrivacy: 'Privacy Policy', suLegalPost: '.',
    suAlready: 'Already have an account?', suLogin: 'Log in',
    // ── NEW Sign In "main" screen — same visual design system as the
    // approved Sign Up main screen above, own headline/copy ──
    siHeading: 'Welcome back!',
    siSubPre: 'Continue your ', siSubAccent: 'DesireDuel', siSubPost: ' journey',
    siNewHere: 'New to DesireDuel?', siSignUp: 'Sign up',
    back: 'Back',
  },
  gr: {
    tabIn: 'Σύνδεση', tabUp: 'Δημιουργία',
    h1: ['Όχι φωτογραφίες πρώτα.', 'Μόνο', 'σύνδεση.'],
    welcomeTitle: 'Καλώς ήρθες πίσω!',
    welcomeSubPre: 'Συνδέσου για να συνεχίσεις το ταξίδι σου στο ', welcomeSubAccent: 'DesireDuel', welcomeSubPost: '',
    email: 'Email', pass: 'Κωδικός',
    cta: 'Σύνδεση', ctaUp: 'Δημιούργησε →',
    or: 'ή συνέχισε με', google: 'Συνέχεια με Google',
    apple: 'Συνέχεια με Apple (σύντομα)', facebook: 'Συνέχεια με Facebook (σύντομα)',
    rememberMe: 'Να με θυμάσαι', forgot: 'Ξέχασες τον κωδικό;',
    forgotSent: 'Έλεγξε το email σου για τον σύνδεσμο επαναφοράς.',
    forgotNeedEmail: 'Συμπλήρωσε πρώτα το email σου.',
    tagline: 'Χωρίς ghosting. Απλά εμφανίσου.',
    newHere: 'Καινούριος/α στο DesireDuel;', createAccount: 'Δημιούργησε λογαριασμό',
    footerBack: 'Έχεις ήδη λογαριασμό;', footerActionBack: 'Σύνδεση',
    connecting: 'σύνδεση...',
    legalPre: 'Συνεχίζοντας, αποδέχεσαι τους ', legalTerms: 'Όρους Χρήσης', legalAnd: ' και την ', legalPrivacy: 'Πολιτική Απορρήτου',
    // ── Sign Up MASTER intro screen (approved reference, separate from the
    // Sign In copy above — this screen has its own headline/copy) ──
    suHeading0: 'Δημιούργησε τον', suHeadingAccent: 'λογαριασμό σου',
    suSub: 'Όλα ξεκινούν με ένα match',
    suGoogle: 'Συνέχεια με Google', suFacebook: 'Συνέχεια με Facebook', suOr: 'Ή', suEmail: 'Συνέχεια με email',
    suAgeNotice: 'Πρέπει να είσαι 18+ για να χρησιμοποιήσεις το DesireDuel.',
    suLegalPre: 'Συνεχίζοντας, αποδέχεσαι τους ', suLegalTerms: 'Όρους Χρήσης', suLegalAnd: ' και αναγνωρίζεις την ', suLegalPrivacy: 'Πολιτική Απορρήτου', suLegalPost: '.',
    suAlready: 'Έχεις ήδη λογαριασμό;', suLogin: 'Σύνδεση',
    // ── NEW Sign In "main" screen — same visual design system as the
    // approved Sign Up main screen above, own headline/copy ──
    siHeading: 'Καλώς ήρθες πίσω!',
    siSubPre: 'Συνέχισε το ταξίδι σου στο ', siSubAccent: 'DesireDuel', siSubPost: '',
    siNewHere: 'Καινούριος/α στο DesireDuel;', siSignUp: 'Εγγραφή',
    back: 'Πίσω',
  },
}

// ─────────────────────────────────────────────────────────────────────────
// AuthMain — the main-screen entry point for BOTH Sign In and Sign Up,
// sharing one visual design system (this is the approved Sign Up MASTER
// composition: logo → headline → Google → Facebook → OR → email → [18+
// notice, Sign Up only] → legal/footer link). `kind` selects which
// headline/footer copy renders; the header art, buttons and layout system
// are identical for both, per "NEW Sign In Main must use the SAME visual
// design system as the already-approved NEW Sign Up" — no new MASTER image
// was required or used for Sign In.
//
// Decorative artwork (corner heart / chat-bubble / star / game-controller,
// the bottom ring glow) is extracted raster crops from the approved Sign
// Up MASTER image (public/brand/dateduel-signup-*-master.png) — reused
// here unchanged for Sign In too, since no new master exists for it and
// none was requested. The faint corner sparkle dust remains simple SVG
// (falls under "simple UI shapes may remain SVG").
// ─────────────────────────────────────────────────────────────────────────
function AuthMain({ kind, t, lang, show, onGoogle, onEmail, onSwitch }: {
  kind: 'signin' | 'signup'; t: typeof C['en']; lang: 'en' | 'gr'; show: boolean
  onGoogle: () => void; onEmail: () => void; onSwitch: () => void
}) {
  const stop = (e: ReactMouseEvent) => e.preventDefault()
  return (
    <div className="dd-auth-master relative z-10 flex flex-col h-full justify-center px-4 mx-auto w-full"
      style={{ maxWidth: 390, paddingTop: 'var(--su-outer-pad-top)', paddingBottom: 'var(--su-outer-pad-bottom)' }}>

      {/* ── Header: DD mark + wordmark + tagline, with the larger corner
          decorative artwork from the MASTER positioned around it. The
          decorations are absolutely positioned (non-flow) so they never
          add to the vertical space budget the no-scroll requirement has
          to fit inside. ── */}
      <div className="relative text-center flex-shrink-0" style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(-10px)', transition: 'all 0.6s ease' }}>

        {/* A wide "ambient arcs" MASTER crop (orbital lines + particle dust
            behind the whole header) was tried here and extracted cleanly,
            but was reverted: the erased "hole" needed for the live
            mark/wordmark/tagline only lines up with them at the MASTER's
            own exact scale, and this screen's header uses its own tuned
            CSS-variable sizing (not a 1:1 scale copy of the MASTER) to hit
            the no-scroll budget across three viewport tiers — so the crop
            visibly drifted out of alignment with the live text at
            non-native sizes (ghosting under "PLAY · CONNECT · MATCH").
            Rather than risk a visible artifact, the ambient background was
            left out of this pass; the sparkle dust below remains simple
            SVG (justified: "simple UI shapes may remain SVG"). See the
            implementation report for this as a disclosed, deliberate
            trade-off. */}
        {[{ l: '20%', t: '0%', s: 7 }, { l: '80%', t: '4%', s: 6 }, { l: '10%', t: '46%', s: 5 }, { l: '90%', t: '50%', s: 6 }].map((s, i) => (
          <span key={i} aria-hidden className="absolute" style={{ left: s.l, top: s.t, fontSize: s.s, color: 'rgba(255,255,255,0.4)' }}>✦</span>
        ))}

        {/* Heart / chat bubble / star / game controller — exact pixel crops
            extracted directly from the approved Sign Up MASTER image (not
            redrawn), alpha-keyed against the MASTER's own near-black
            background so they composite cleanly onto this screen's
            background. Absolutely positioned (non-flow) so they never add
            to the vertical space budget the no-scroll requirement has to
            fit inside. */}
        <img aria-hidden src="/brand/dateduel-signup-heart-master.png" alt="" className="absolute"
          style={{ left: 'var(--su-heart-l)', top: 'var(--su-heart-t)', width: 'var(--su-heart-s)', height: 'auto', aspectRatio: '150/135', opacity: 0.92 }} />
        <img aria-hidden src="/brand/dateduel-signup-chat-master.png" alt="" className="absolute"
          style={{ right: 'var(--su-chat-r)', top: 'var(--su-chat-t)', width: 'var(--su-chat-s)', height: 'auto', aspectRatio: '178/135', opacity: 0.9 }} />
        <img aria-hidden src="/brand/dateduel-signup-star-master.png" alt="" className="absolute"
          style={{ left: 'var(--su-star-l)', top: 'var(--su-star-t)', width: 'var(--su-star-s)', height: 'auto', aspectRatio: '137/125', opacity: 0.85 }} />
        <img aria-hidden src="/brand/dateduel-signup-controller-master.png" alt="" className="absolute"
          style={{ right: 'var(--su-ctrl-r)', top: 'var(--su-ctrl-t)', width: 'var(--su-ctrl-s)', height: 'auto', aspectRatio: '197/175', opacity: 0.85 }} />

        {/* NOTE: the MASTER has no ring drawn behind the DD mark itself
            (confirmed by direct pixel inspection) — only ambient glow. The
            previous inline-SVG ring here was an invented element not
            present in the MASTER, so it has been removed rather than
            converted to raster, per "do not redesign / match the MASTER
            exactly". */}
        <div className="relative mx-auto" style={{ width: 'var(--su-ring)', height: 'var(--su-ring)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={LOGO_MARK_SRC} alt="DesireDuel" style={{ display: 'block', height: 'var(--su-mark)', width: `calc(var(--su-mark) * ${LOGO_MARK_RATIO})`, objectFit: 'contain' }} />
          </div>
        </div>

        <h2 className="font-extrabold tracking-[-0.5px]" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--su-wm-size)', marginTop: 'var(--su-gap-mw)' }}>
          <span className="text-white">Desire</span><span style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Duel</span>
        </h2>
        <p className="font-bold tracking-[3px] uppercase" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--su-tag-size)', marginTop: 'var(--su-gap-wt)' }}>
          PLAY · CONNECT · MATCH
        </p>
      </div>

      {/* ── Headline: kind-aware. Sign Up: "Create your account" / "It all
          starts with a match" (approved MASTER copy, unchanged). Sign In:
          "Welcome back!" / "Continue your DateDuel journey" — same type
          treatment/sizing, new copy, no new master image required. ── */}
      <div className="text-center flex-shrink-0" style={{ marginTop: 'var(--su-headline-mt)', opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.7s 0.1s cubic-bezier(0.16,1,0.3,1)' }}>
        {kind === 'signup' ? (
          <>
            <h1 className="font-extrabold leading-tight tracking-[-0.5px]" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--su-h1-size)' }}>
              <span className="text-white">{t.suHeading0} </span>
              <span style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.suHeadingAccent}</span>
            </h1>
            <p className="font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--su-sub-size)', marginTop: 'var(--su-gap-h1h2)' }}>
              {t.suSub} <span style={{ color: '#ff3384' }}>♥</span>
            </p>
          </>
        ) : (
          <>
            <h1 className="font-extrabold leading-tight tracking-[-0.5px]" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--su-h1-size)' }}>
              <span className="text-white">{t.siHeading}</span>
            </h1>
            <p className="font-semibold leading-snug" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--su-sub-size)', marginTop: 'var(--su-gap-h1h2)' }}>
              {t.siSubPre}<span style={{ background: 'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>{t.siSubAccent}</span>{t.siSubPost}
            </p>
          </>
        )}
      </div>

      {/* ── Google / Facebook / OR / email ── */}
      <div className="flex-shrink-0" style={{ marginTop: 'var(--su-buttons-mt)', opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.7s 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
        <button onClick={onGoogle} aria-label={t.suGoogle}
          className="w-full rounded-2xl flex items-center justify-center gap-2.5 font-bold transition-all active:scale-[0.97] cursor-pointer"
          style={{ paddingTop: 'var(--su-btn-pad-y)', paddingBottom: 'var(--su-btn-pad-y)', fontSize: 'var(--su-btn-size)', background: '#fff', color: '#1a1a1a', boxShadow: '0 10px 28px rgba(0,0,0,0.25)' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {t.suGoogle}
        </button>

        {/* Facebook — visual parity with the approved MASTER, but NOT wired
            to a real auth provider: no Facebook app is configured in
            Supabase for this project yet. Disabled/inert rather than a
            fake working button — no OAuth request is triggered, no fake
            success state. Configuring real Facebook auth is a separate,
            future task. */}
        <button type="button" disabled aria-label={t.suFacebook} title={lang === 'gr' ? 'Σύντομα διαθέσιμο' : 'Coming soon'}
          className="w-full rounded-2xl flex items-center justify-center gap-2.5 font-bold cursor-not-allowed"
          style={{ marginTop: 'var(--su-btn-gap)', paddingTop: 'var(--su-btn-pad-y)', paddingBottom: 'var(--su-btn-pad-y)', fontSize: 'var(--su-btn-size)', background: '#1877F2', color: '#fff', opacity: 0.55 }}>
          <svg width="19" height="19" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#fff" fillOpacity="0.15"/><path d="M15.1 12.7h-2v7.1h-2.9v-7.1H8.6v-2.5h1.6V8.6c0-1.6.8-3.1 3.2-3.1h2.1v2.4h-1.5c-.3 0-.7.2-.7.9v1.4h2.2l-.4 2.5Z" fill="#fff"/></svg>
          {t.suFacebook}
        </button>

        <div className="flex items-center gap-3" style={{ marginTop: 'var(--su-btn-gap)' }}>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,51,132,0.4))' }} />
          <span className="font-bold tracking-[2px]" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--su-or-size)' }}>{t.suOr}</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,rgba(139,123,255,0.4),transparent)' }} />
        </div>

        <button onClick={onEmail} aria-label={t.suEmail}
          className="w-full rounded-2xl flex items-center justify-center gap-2.5 font-bold transition-all active:scale-[0.97] cursor-pointer"
          style={{ marginTop: 'var(--su-btn-gap)', paddingTop: 'var(--su-btn-pad-y)', paddingBottom: 'var(--su-btn-pad-y)', fontSize: 'var(--su-btn-size)', background: 'rgba(255,255,255,0.059)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.14)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t.suEmail}
        </button>
      </div>

      {/* ── 18+ notice — Sign Up only, text-only per the approved MASTER:
          NO real age verification happens on this screen. Real DOB/age
          enforcement is deferred to a future "About You" onboarding step.
          Not part of Sign In — an existing user already passed this check
          at signup, so re-showing it here would be redundant. ── */}
      {kind === 'signup' && (
        <div className="flex-shrink-0" style={{ marginTop: 'var(--su-box-mt)', opacity: show ? 1 : 0, transition: 'opacity 0.6s 0.3s ease' }}>
          <div className="flex items-start" style={{ gap: 'var(--su-box-gap)', padding: 'var(--su-box-pad)', borderRadius: 18, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg aria-hidden viewBox="0 0 30 28" fill="none" style={{ width: 'var(--su-shield-s)', height: 'calc(var(--su-shield-s) * 0.93)', flexShrink: 0, marginTop: 1 }}>
              <path d="M15 1 27 5v7c0 7-5.4 11.6-12 14C8.4 23.6 3 19 3 12V5Z" stroke="#ff3384" strokeWidth="1.6" strokeLinejoin="round"/>
              <text x="15" y="16.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ff3384" fontFamily="'Plus Jakarta Sans',sans-serif">18+</text>
            </svg>
            <p style={{ fontSize: 'var(--su-notice-size)', lineHeight: 'var(--su-notice-lh)' }}>
              <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{t.suAgeNotice}</span>{' '}
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--su-legal-size)' }}>
                {t.suLegalPre}
                <a href="#" onClick={stop} style={{ color: '#ff3384', fontWeight: 600 }}>{t.suLegalTerms}</a>
                {t.suLegalAnd}
                <a href="#" onClick={stop} style={{ color: '#a996ff', fontWeight: 600 }}>{t.suLegalPrivacy}</a>
                {t.suLegalPost}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* ── Footer link — kind-aware: "Already have an account? Log in"
          (Sign Up) / "New to DateDuel? Sign up" (Sign In) — with the bottom
          neon ring composition positioned behind it. This is an exact
          MASTER crop (public/brand/dateduel-signup-bottomring-master.png),
          not a redrawn approximation — the login text and the
          home-indicator strip were alpha-erased (feathered) out of the
          crop since the link text renders live on top and the home
          indicator is an iOS system element, not app content. ── */}
      <div className="relative text-center flex-shrink-0" style={{ marginTop: 'var(--su-login-mt)', opacity: show ? 1 : 0, transition: 'opacity 0.6s 0.4s ease' }}>
        <img aria-hidden src="/brand/dateduel-signup-bottomring-master.png" alt=""
          className="absolute pointer-events-none" style={{ left: '50%', bottom: -14, transform: 'translateX(-50%)', width: 'var(--su-ringglow-w)', height: 'auto', aspectRatio: '852/246', zIndex: -1 }} />
        <button onClick={onSwitch} className="active:opacity-60 transition-opacity cursor-pointer" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--su-login-size)', background: 'none', border: 'none', padding: 0 }}>
          {kind === 'signup' ? t.suAlready : t.siNewHere}{' '}
          <span style={{ color: '#ff3384', fontWeight: 700 }}>{kind === 'signup' ? t.suLogin : t.siSignUp}</span>
        </button>
      </div>
    </div>
  )
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
  const [mode, setMode]       = useState<'signin'|'signup'>('signin')
  // 'main' = the branded choice screen (Google/Facebook/OR/email) for
  // whichever mode is active; 'email' = the reused email/password form,
  // reached via "Continue with email" on either main screen. Defaults to
  // 'main' so /app opens on the NEW Sign In Main for an unauthenticated
  // user, never on the old immediate email/password card.
  const [step, setStep] = useState<'main'|'email'>('main')
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
        // Age is intentionally NOT collected on this screen — the 18+
        // requirement is stated as a notice only here (no real age
        // verification on Sign Up); real DOB/age enforcement is deferred to
        // a future "About You" onboarding step, not part of this task.
        if (!name) { setError(lang==='gr'?'Συμπλήρωσε το όνομά σου':'Fill in your name'); setLoading(false); return }
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
          options: { data: { full_name: name } },
        })
        if (authError) { setError(authError.message); setLoading(false); return }
        console.log('SIGNUP AUTH USER CREATED:', authData.user?.id)

        const userId = authData.user?.id
        if (userId) {
          try {
            await ensureProfile(userId, { name })
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
  //
  // RACE-CONDITION SAFETY (AUTH ensureProfile race-condition fix): the
  // SELECT above and the INSERT below are two separate round trips, so
  // app/app/page.tsx's own onAuthStateChange/ensureProfileExists listener
  // (or a DB trigger) can create the same profiles row in the gap between
  // them. Previously that made the INSERT below fail outright with a
  // "duplicate key value violates unique constraint profiles_pkey" error,
  // which this function re-threw — turning a harmless race into a hard
  // signup/login failure. The INSERT below now recovers narrowly from
  // exactly that one error (Postgres unique-violation code '23505' on
  // profiles_pkey) by re-fetching the row the other path created and
  // reconciling it with the exact same logic used for the "already
  // existing" branch above — never touching onboarding_completed, photo,
  // location, or bio, and never overwriting a real name with a generic one.
  // Any other error (network, permissions, an unrelated constraint) is
  // rethrown unchanged, exactly as before.
  async function ensureProfile(userId: string, fields: { name?: string; age?: number }) {
    console.log('PROFILE ENSURE START')
    console.log('ONBOARDING PROFILE SAVE START:')
    try {
      const { data: existing } = await supabase.from('profiles').select('id, name, age').eq('id', userId).maybeSingle()

      const hasRealName = !!fields.name && fields.name.trim().length > 0

      if (existing) {
        await reconcileExistingProfile(userId, existing, fields, hasRealName)
        console.log('PROFILE ENSURE SUCCESS (exists)')
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

      if (error) {
        const isDuplicateKey = (error as any).code === '23505'
          || (typeof error.message === 'string' && error.message.includes('profiles_pkey'))
        if (!isDuplicateKey) throw error

        // Narrow duplicate-key recovery: another process won the race and
        // created this row first. That is not a failure — a profiles row
        // now exists for this user, which is what this function exists to
        // guarantee. Re-fetch whatever that other path wrote and reconcile
        // it exactly as the "already existing" branch above would have.
        console.warn('ONBOARDING PROFILE INSERT RACE: row already created by another path, reconciling instead of failing:', error.message)
        const { data: winner, error: refetchError } = await supabase.from('profiles').select('id, name, age').eq('id', userId).maybeSingle()
        if (refetchError) throw refetchError
        if (!winner) throw error // row vanished between the conflict and the re-fetch — surface the original error rather than guessing

        await reconcileExistingProfile(userId, winner, fields, hasRealName)
        console.log('PROFILE ENSURE SUCCESS (race-recovered)')
        return
      }

      console.log('ONBOARDING PROFILE SAVE SUCCESS:')
      console.log('PROFILE ENSURE SUCCESS')
    } catch (e: any) {
      console.error('ONBOARDING PROFILE SAVE ERROR:', e.message)
      throw e
    }
  }

  // Shared reconciliation for a profiles row that already exists, whether
  // found by ensureProfile's initial SELECT or discovered via the
  // duplicate-key race recovery above. Only ever writes name/age, and only
  // when the existing name is genuinely empty/generic ('' or 'Player') AND
  // a real signup name is available — otherwise it's a no-op. Never resets
  // onboarding_completed, photo, location, bio, or any other existing field.
  async function reconcileExistingProfile(
    userId: string,
    existing: { id: string; name: string | null; age: number | null },
    fields: { name?: string; age?: number },
    hasRealName: boolean,
  ) {
    const existingIsGeneric = !existing.name || existing.name.trim() === '' || existing.name === 'Player'
    if (hasRealName && existingIsGeneric) {
      console.log('ONBOARDING PROFILE UPSERT:', userId)
      const { error } = await supabase.from('profiles').update({
        name: fields.name,
        age: fields.age || existing.age || 0,
      }).eq('id', userId)
      if (error) throw error
      console.log('ONBOARDING PROFILE SAVE SUCCESS:')
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
          content. ──
          Both Sign In and Sign Up now open on their own "main" screen
          (AuthMain, above): logo/headline/Google/Facebook/OR/email/[18+
          notice for Sign Up]/legal/footer-link — the same visual design
          system for both, matching the approved Sign Up MASTER. This is
          the default screen an unauthenticated user sees at /app (mode
          starts 'signin', step starts 'main'); the OLD immediate
          email/password card is no longer the entry screen for either
          mode. The shared card below (its own CSS-variable tiers,
          untouched) is reused — without tabs and without the divider/
          social row (those choices now live on the main screen), plus a
          "Back" link — as the Email Sign In / Email Sign Up sub-step
          reached via "Continue with email" on either main screen. This
          keeps Google auth, email auth and the Sign In password logic
          wired to the exact same tested code paths. */}
      {step === 'main' ? (
        <AuthMain
          kind={mode} t={t} lang={lang} show={show}
          onGoogle={googleLogin}
          onEmail={() => { setStep('email'); setError(null); setSuccessMsg(null) }}
          onSwitch={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setStep('main'); setError(null); setSuccessMsg(null) }}
        />
      ) : (
      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full" style={{ maxWidth:390, paddingTop:'var(--outer-pad-top)', paddingBottom:'var(--outer-pad-bottom)' }}>

        {/* ── Back — returns to the main screen for whichever mode is
            active (Sign In Main or Sign Up Main), without switching mode.
            Replaces the old tabs, which are no longer needed here now that
            both main screens own the Sign In / Sign Up choice. ── */}
        <button type="button" onClick={() => { setStep('main'); setError(null); setSuccessMsg(null) }}
          className="inline-flex items-center gap-1 cursor-pointer active:opacity-60 transition-opacity self-start"
          style={{ color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:600, background:'none', border:'none', padding:0, marginBottom:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {t.back}
        </button>

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
              <img src={LOGO_MARK_SRC} alt="DesireDuel" style={{ display:'block', height:'var(--mark)', width:`calc(var(--mark) * ${LOGO_MARK_RATIO})`, objectFit:'contain' }} />
            </div>
          </div>

          <h2 className="font-extrabold tracking-[-0.5px]" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:'var(--wm-size)', marginTop:'var(--gap-mw)' }}>
            <span className="text-white">Desire</span><span style={{ background:'linear-gradient(135deg,#ff3384,#d84dd8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Duel</span>
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

          {/* Tabs removed — Sign In / Sign Up are now chosen on the main
              screens (AuthMain, above), reached via "Back". This card is
              only ever shown for the mode the user already picked. */}

          {/* Name (signup only — Age is intentionally NOT collected on this
              screen; see the 18+ notice further down and the code comment
              on submit() for why). */}
          {mode === 'signup' && (
            <div className="relative" style={{ marginBottom:'var(--field-mb)' }}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ fontSize:'var(--field-icon-s)', color: focus==='n' ? '#ff3384' : 'rgba(255,255,255,0.295)', transition:'color 0.3s' }}>👤</div>
              <input value={name} onChange={e=>setName(e.target.value)}
                type="text" placeholder={lang==='gr'?'Όνομα':'Name'}
                onFocus={()=>setFocus('n')} onBlur={()=>setFocus(null)}
                className="w-full rounded-2xl pl-10 pr-4 outline-none transition-all duration-300"
                style={{
                  fontSize:'var(--field-text-size)',
                  paddingTop:'var(--field-pad-y)', paddingBottom:'var(--field-pad-y)',
                  background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                  border: focus==='n' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                  boxShadow: focus==='n' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
                }} />
            </div>
          )}

          {/* Email input */}
          <div className="relative" style={{ marginBottom:'var(--field-mb)' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#ff3384', opacity: focus==='e' ? 1 : 0.75, transition:'opacity 0.3s' }}>
              <svg style={{ width:'var(--field-icon-s)', height:'var(--field-icon-s)' }} viewBox="0 0 24 24" fill="none"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <input value={email} onChange={e=>setEmail(e.target.value)}
              type="email" placeholder={t.email} autoComplete="email"
              onFocus={()=>setFocus('e')} onBlur={()=>setFocus(null)}
              className="w-full rounded-2xl pl-10 pr-4 outline-none transition-all duration-300"
              style={{
                fontSize:'var(--field-text-size)',
                paddingTop:'var(--field-pad-y)', paddingBottom:'var(--field-pad-y)',
                background:'rgba(255,255,255,0.059)', color:'#fff', caretColor:'#ff3384',
                border: focus==='e' ? '1.5px solid rgba(253,41,123,0.59)' : '1.5px solid rgba(255,255,255,0.083)',
                boxShadow: focus==='e' ? '0 0 24px rgba(253,41,123,0.142)' : 'none',
              }} />
          </div>

          {/* Password input — with real show/hide toggle */}
          <div className="relative" style={{ marginBottom:'var(--field-mb)' }}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#ff3384', opacity: focus==='p' ? 1 : 0.75, transition:'opacity 0.3s' }}>
              <svg style={{ width:'var(--field-icon-s)', height:'var(--field-icon-s)' }} viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2.3" stroke="currentColor" strokeWidth="1.7"/><path d="M7.5 10.5V7.8a4.5 4.5 0 0 1 9 0v2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="12" cy="15" r="1.3" fill="currentColor"/></svg>
            </div>
            <input value={pass} onChange={e=>setPass(e.target.value)}
              type={showPass ? 'text' : 'password'} placeholder={t.pass}
              autoComplete={mode==='signup' ? 'new-password' : 'current-password'}
              onFocus={()=>setFocus('p')} onBlur={()=>setFocus(null)}
              onKeyDown={e=>{ if(e.key==='Enter') submit() }}
              className="w-full rounded-2xl pl-10 pr-11 outline-none transition-all duration-300"
              style={{
                fontSize:'var(--field-text-size)',
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
                <span style={{ fontSize:'var(--options-text-size)', color:'rgba(255,255,255,0.55)' }}>{t.rememberMe}</span>
              </button>
              <button type="button" onClick={forgotPassword} disabled={forgotLoading}
                className="font-semibold cursor-pointer disabled:opacity-50" style={{ fontSize:'var(--options-text-size)', color:'#ff3384', background:'none', border:'none', padding:0 }}>
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
            className="w-full rounded-2xl font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-default flex items-center justify-center gap-2"
            style={{
              fontSize:'var(--cta-text-size)',
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

          {/* Divider + social row removed from this card — Google /
              Facebook / email are already offered as the primary choice on
              the main screen (AuthMain, above) for both Sign In and Sign
              Up; this inner card is now reached only via "Continue with
              email", so repeating the social row here would duplicate it.
              "Back" (top of this card) returns to that main screen. */}
        </div>

        {/* Footer toggle removed — replaced by "Back" (top of this card),
            which returns to the main screen for the active mode; that main
            screen carries its own Sign In ⇄ Sign Up cross-link. */}

        {/* ── Bottom brand art: neon double-heart horizon glow (decorative only) ── */}
        <div className="flex justify-center" style={{ marginTop:'var(--footer-mt)', opacity:show?1:0, transition:'opacity 0.6s 0.5s ease' }}>
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
      )}

      <style>{`
        /* ── Three height MODES (no redesign — sizing/spacing only) ──
           MODE A — LARGE MOBILE   : viewport height >= 900px (base values below, no query needed)
           MODE B — NORMAL MOBILE  : 700px – 899px  → @media (max-height: 899px)  [primary safe layout, ref ~390x740..393x852]
           MODE C — SHORT MOBILE   : < 700px         → @media (max-height: 699px)
           Sizes are tuned to fill the screen (no giant empty band under the
           legal text) while still guaranteeing zero scroll — verified via
           forced-scroll + getBoundingClientRect measurement, not just
           scrollHeight<=clientHeight.
           COMPACT FIT REFINEMENT (real-phone pass): the MODE A/B boundary
           was moved from 819px up to 899px. Real Android phones in Chrome
           commonly report a 100dvh viewport height in the ~830-860px band
           (e.g. 844, 852) once the address bar auto-hides — under the old
           819px cutoff those devices landed in the spacious MODE A tier,
           which is what made the composition read "too tall / vertically
           spread out" on the real-device test. Widening MODE B's range to
           899px brings that exact real-phone band into the already-tuned,
           already-verified-zero-scroll compact tier without touching any
           of its values (MODE B was proven safe down to 700px height, so
           it only gets *more* comfortable at 844-852px, never tighter).
           Devices taller than 899px (e.g. 430x932) still get the spacious
           MODE A treatment untouched, per "when height is larger, preserve
           the current approved spacious design". */
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
          /* Email/Password field icon + input text, Remember-me/Forgot-
             password text and the Sign In/Create-account button text were
             previously hardcoded Tailwind text-[..px] classes (same value
             at every tier). Promoted to variables here so the SPACE
             UTILIZATION pass below can enlarge them at 390x844/393x852 —
             base values here exactly match what was already hardcoded, so
             MODE A (>=900px) renders pixel-identical to before. */
          --field-icon-s: 16px;
          --field-text-size: 14px;
          --options-text-size: 12px;
          --cta-text-size: 15px;
        }
        @media (max-height: 899px) {
          /* MODE B — NORMAL (700–899px), reference viewport ~390x740..393x852.
             SPACE UTILIZATION REFINEMENT: real-phone testing on production
             showed large unused bands above/below both Sign In Main and the
             Email Sign In sub-step at 390x844/393x852 — this tier's flat
             values were tuned to be *safe* down to 700px, not to fill
             844-852px. Every enlarged property below is now a fluid
             clamp(MIN, calc(A + Cdvh), MAX): MIN is the exact previous
             flat value (still fully safe at 700px, unchanged), and the
             interpolation's upper anchor is deliberately set at 860px —
             just above the tallest real-phone test point (852) — rather
             than at MODE B's own 899px ceiling, so 390x844/393x852 (the
             viewports actually reported as under-using space) land at or
             essentially at MAX, not partway there. Every MAX stays at/
             under this system's own MODE A value so >=900px devices (e.g.
             430x932) still read as the most spacious tier. */
          .dd-auth-root {
            --outer-pad-top: clamp(8px, calc(-0.75px + 1.25dvh), 10px);
            --outer-pad-bottom: clamp(8px, calc(-18.25px + 3.75dvh), 14px);
            --ring: clamp(88px, calc(66.12px + 3.12dvh), 93px);
            --mark: clamp(46px, calc(32.88px + 1.88dvh), 49px);
            --gap-mw: clamp(6px, calc(-0.56px + 0.94dvh), 7.5px);
            --wm-size: clamp(28px, calc(21.44px + 0.94dvh), 29.5px);
            --gap-wt: clamp(4px, calc(1.81px + 0.31dvh), 4.5px);
            --tag-size: 11px;
            --gap-td: clamp(5px, calc(2.81px + 0.31dvh), 5.5px);
            --headline-mt: clamp(12px, calc(-1.12px + 1.88dvh), 15px);
            --h1-size: clamp(25px, calc(18.44px + 0.94dvh), 26.5px);
            --gap-welcome-subtext: clamp(3px, calc(-1.38px + 0.62dvh), 4px);
            --sub-size: clamp(14px, calc(11.81px + 0.31dvh), 14.5px);
            --headline-mb: clamp(7px, calc(-6.12px + 1.88dvh), 10px);
            --card-pad: clamp(11px, calc(-2.12px + 1.88dvh), 14px);
            --tab-pad-y: 12px;    /* vestigial — Tabs UI removed, kept for reference only */
            --tab-mb: 7px;
            --field-pad-y: clamp(14px, calc(5.25px + 1.25dvh), 16px);
            --field-mb: clamp(5px, calc(0.62px + 0.62dvh), 6px);
            --options-mb: clamp(7px, calc(2.62px + 0.62dvh), 8px);
            --cta-pad-y: clamp(11px, calc(0.06px + 1.56dvh), 13.5px);
            --divider-my: 7px;
            --social-pad-y: 11px; /* vestigial — divider/social row removed, kept for reference only */
            --footer-mt: clamp(8px, calc(-9.5px + 2.5dvh), 12px);
            --footer-mb: 6px;
            --hearts-w: clamp(50px, calc(36.88px + 1.88dvh), 53px);
            --hearts-h: clamp(36px, calc(27.25px + 1.25dvh), 38px);
            --legal-mt: clamp(6px, calc(1.62px + 0.62dvh), 7px);
            --legal-size: 11px;
            --create-size: 14px;
            --field-icon-s: clamp(16px, calc(7.25px + 1.25dvh), 18px);
            --field-text-size: clamp(14px, calc(7.44px + 0.94dvh), 15.5px);
            --options-text-size: clamp(12px, calc(7.62px + 0.62dvh), 13px);
            --cta-text-size: clamp(15px, calc(8.44px + 0.94dvh), 16.5px);
          }
        }
        @media (max-height: 699px) {
          /* MODE C — SHORT (< 700px), verified fitting down to 360x640.
             Untouched by the SPACE UTILIZATION pass — kept exactly as the
             already-safe compact fit, including the 4 field/text vars
             explicitly reset back to their original hardcoded values so
             they don't inherit MODE B's enlarged clamp() (the max-height:
             899px query above also matches heights <700, so MODE C must
             re-declare every var it needs to keep unaffected). */
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
            --field-icon-s: 16px;
            --field-text-size: 14px;
            --options-text-size: 12px;
            --cta-text-size: 15px;
          }
        }
        /* ── AuthMain (Sign In Main + Sign Up Main) — own, independent
           CSS-variable tier system (distinct names, .dd-auth-master scope
           only, var names still "su-" prefixed for historical reasons —
           they are shared by both main screens now) so it can never
           interact with or drift the existing .dd-auth-root tiers above,
           which continue to govern the reused email sub-step (both Sign In
           and Sign Up) untouched. Same 3-MODE approach: MODE A (>=900px),
           MODE B (700-899px), MODE C (<700px, covers the 375x667
           hard-requirement case). Tuned then verified with real browser
           measurement (getBoundingClientRect / scrollHeight vs
           clientHeight) across 375x667, 390x844, 393x852 and 430x932.
           COMPACT FIT REFINEMENT (real-phone pass): the MODE A/B boundary
           moved from 819px to 899px so the real Android Chrome viewport
           band (~830-860px, e.g. 390x844 / 393x852) now gets the compact
           MODE B treatment instead of spacious MODE A — this is what was
           reported as "too tall / vertically spread out" on the real
           device. MODE B's own values are unchanged (already verified
           zero-scroll down to 700px height, so they only get *more*
           comfortable, never tighter, at the taller 844-852px heights now
           routed into this tier). 430x932 stays above 899px and keeps the
           spacious MODE A layout untouched, per "preserve the current
           approved spacious design" for larger devices.
           FINAL POSITIONING REFINEMENT: on real 390x844 / 393x852 devices,
           the shorter MODE B composition (see above) is centered via
           justify-center, so the height it freed up landed as roughly
           equal empty space above AND below the logo — reported as "too
           much empty space above the logo". Fix: --su-shift-y nudges the
           whole composition upward with a transform (paint-time only, does
           not change layout/scroll height) so it stays visually centered
           overall while sitting closer to its old position. Defaults to
           0px (no shift) here and is only set to a negative value inside
           the MODE B media query below — MODE C (<700px) explicitly resets
           it back to 0px since that tier already has near-zero spare space
           to safely absorb a shift without risking clipping.
           SPACE UTILIZATION REFINEMENT: real-phone testing at 390x844/
           393x852 (MODE B) showed the compact sizes above still left large
           unused bands above and below the composition even after the
           -50px shift — MODE B was tuned to be *safe* down to 700px, not
           to fill 844-852px. Every enlarged property below is now a fluid
           clamp(MIN, calc(A + Cdvh), MAX) computed by a straight-line fit
           between its value at 700px height (MIN, unchanged from before —
           still exactly as safe as the previous flat MODE B numbers) and a
           new, larger MAX — with the interpolation's upper anchor set at
           860px, just above the tallest real-phone test point (852),
           rather than at MODE B's own 899px ceiling, so 390x844/393x852
           (the exact viewports reported as under-using space) render at or
           essentially at MAX (visibly bigger logo/wordmark/tagline/
           headline/subtitle/buttons), not partway there. A genuinely short
           700px-tall device still gets the original, already-verified-safe
           MIN. Every MAX was kept below the
           corresponding MODE A value so the >=900px tier (e.g. 430x932)
           still reads as the most spacious, per "allow branding to scale
           up naturally" for taller phones without touching MODE A itself.
           The 18+ notice box's own sizing (--su-box-*, --su-shield-s,
           --su-notice-*, --su-legal-size) was deliberately left unchanged
           — it wasn't part of this task's enlarge list. */
        .dd-auth-master {
          --su-shift-y: 0px;
          transform: translateY(var(--su-shift-y));
          --su-outer-pad-top: 24px;
          --su-outer-pad-bottom: 16px;
          --su-ring: 92px;
          --su-mark: 76px;
          --su-gap-mw: 10px;
          --su-wm-size: 30px;
          --su-gap-wt: 6px;
          --su-tag-size: 11px;
          --su-heart-l: 4px;  --su-heart-t: 2px;  --su-heart-s: 40px;
          --su-chat-r: 2px;   --su-chat-t: 8px;   --su-chat-s: 46px;
          --su-star-l: 6px;   --su-star-t: 48%;   --su-star-s: 34px;
          --su-ctrl-r: 0px;   --su-ctrl-t: 50%;   --su-ctrl-s: 50px;
          --su-headline-mt: 30px;
          --su-h1-size: 27px;
          --su-gap-h1h2: 8px;
          --su-sub-size: 15px;
          --su-buttons-mt: 26px;
          --su-btn-pad-y: 16px;
          --su-btn-size: 14.5px;
          --su-btn-gap: 13px;
          --su-or-size: 12px;
          --su-box-mt: 18px;
          --su-box-pad: 15px;
          --su-box-gap: 12px;
          --su-shield-s: 24px;
          --su-notice-size: 13px;
          --su-notice-lh: 1.42;
          --su-legal-size: 11.5px;
          --su-login-mt: 18px;
          --su-login-size: 13.5px;
          --su-ringglow-w: 220px;
        }
        @media (max-height: 899px) {
          .dd-auth-master {
            --su-shift-y: -50px;
            --su-outer-pad-top: clamp(14px, calc(5.25px + 1.25dvh), 16px);
            --su-outer-pad-bottom: clamp(10px, calc(-3.12px + 1.88dvh), 13px);
            --su-ring: clamp(76px, calc(27.87px + 6.88dvh), 87px);
            --su-mark: clamp(62px, calc(18.25px + 6.25dvh), 72px);
            --su-gap-mw: clamp(7px, calc(-1.75px + 1.25dvh), 9px);
            --su-wm-size: clamp(26px, calc(12.88px + 1.88dvh), 29px);
            --su-gap-wt: clamp(4px, calc(-2.56px + 0.94dvh), 5.5px);
            --su-tag-size: clamp(10px, calc(5.62px + 0.62dvh), 11px);
            --su-heart-s: clamp(32px, calc(10.12px + 3.12dvh), 37px);
            --su-chat-s: clamp(37px, calc(10.75px + 3.75dvh), 43px);
            --su-star-s: clamp(27px, calc(9.5px + 2.5dvh), 31px);
            --su-ctrl-s: clamp(40px, calc(13.75px + 3.75dvh), 46px);
            --su-headline-mt: clamp(18px, calc(-17.0px + 5.0dvh), 26px);
            --su-h1-size: clamp(23px, calc(9.88px + 1.88dvh), 26px);
            --su-gap-h1h2: clamp(5px, calc(-3.75px + 1.25dvh), 7px);
            --su-sub-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --su-buttons-mt: clamp(16px, calc(-14.62px + 4.38dvh), 23px);
            --su-btn-pad-y: clamp(13px, calc(2.06px + 1.56dvh), 15.5px);
            --su-btn-size: clamp(13.5px, calc(9.12px + 0.62dvh), 14.5px);
            --su-btn-gap: clamp(9px, calc(-1.94px + 1.56dvh), 11.5px);
            --su-or-size: clamp(11px, calc(6.62px + 0.62dvh), 12px);
            /* 18+ notice box was NOT part of this task's enlarge list — left flat/unchanged */
            --su-box-mt: 12px;
            --su-box-pad: 12px;
            --su-box-gap: 9px;
            --su-shield-s: 20px;
            --su-notice-size: 12px;
            --su-notice-lh: 1.3;
            --su-legal-size: 10.5px;
            --su-login-mt: clamp(12px, calc(3.25px + 1.25dvh), 14px);
            --su-login-size: clamp(13px, calc(10.81px + 0.31dvh), 13.5px);
            --su-ringglow-w: clamp(190px, calc(146.25px + 6.25dvh), 200px);
          }
        }
        @media (max-height: 699px) {
          .dd-auth-master {
            --su-shift-y: 0px;
            --su-outer-pad-top: 10px;
            --su-outer-pad-bottom: 8px;
            --su-ring: 62px;
            --su-mark: 52px;
            --su-gap-mw: 5px;
            --su-wm-size: 22px;
            --su-gap-wt: 3px;
            --su-tag-size: 9.5px;
            --su-heart-s: 26px; --su-chat-s: 30px; --su-star-s: 22px; --su-ctrl-s: 32px;
            --su-headline-mt: 12px;
            --su-h1-size: 20px;
            --su-gap-h1h2: 4px;
            --su-sub-size: 12px;
            --su-buttons-mt: 12px;
            --su-btn-pad-y: 11px;
            --su-btn-size: 12.5px;
            --su-btn-gap: 7px;
            --su-or-size: 10px;
            --su-box-mt: 9px;
            --su-box-pad: 10px;
            --su-box-gap: 8px;
            --su-shield-s: 18px;
            --su-notice-size: 11px;
            --su-notice-lh: 1.25;
            --su-legal-size: 10px;
            --su-login-mt: 9px;
            --su-login-size: 12px;
            --su-ringglow-w: 160px;
          }
        }
        @keyframes bgPan { from{transform:scale(1) translate(0,0)} to{transform:scale(1.08) translate(-1%,-1%)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 60%{transform:translateX(5px)} }
        @keyframes heartFloat { 0%{transform:translateY(0) rotate(0deg);opacity:0} 10%{opacity:0.08} 90%{opacity:0.04} 100%{transform:translateY(-600px) rotate(20deg);opacity:0} }
      `}</style>
    </div>
  )
}
