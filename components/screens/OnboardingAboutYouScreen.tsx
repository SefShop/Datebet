'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchOwnPrivateProfile } from '@/lib/profiles'

interface Props {
  /** Called only after name/date_of_birth/age/gender have been written to
   * the existing `profiles` row and confirmed via a re-select. The locked
   * onboarding sequence is Welcome (1) → About You (this screen, Step 2)
   * → Who You're Interested In (3) → Location + Interests (4) → Photos
   * (5) → About You/Bio (6) → Preferences (7).
   *
   * ARCHITECTURE: this is an UPDATE-only write against the profile row
   * already created at sign-up (see AuthScreen.tsx / app/app/page.tsx) —
   * never an insert, never a new table. `date_of_birth` is the new
   * long-term source of truth for age (per explicit product decision);
   * the existing plain `age` integer column is kept synchronized
   * alongside it purely for backward compatibility with every other age
   * consumer in the app (EditProfileScreen.tsx, lib/profiles.ts,
   * ProfileScreenNew.tsx, the signup inserts). `gender` is a new column,
   * distinct from Step 3/7's `show_me` discovery preference. On mount,
   * any already-saved values are hydrated back in (never overwriting
   * whatever the user has already typed) so leaving and returning to
   * this step doesn't silently lose data. */
  onNext: () => void
}

type Gender = 'woman' | 'man' | 'nonbinary'

// ── Age math ──────────────────────────────────────────────────────────
// Full-years-elapsed calculation (not just year subtraction) so a DOB of
// e.g. "17 years and 11 months ago" is correctly still 17, not rounded up
// to 18. dobStr is the native <input type="date"> value, always
// "YYYY-MM-DD" when present.
function calcAge(dobStr: string): number | null {
  if (!dobStr) return null
  const d = new Date(dobStr + 'T00:00:00')
  if (isNaN(d.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--
  return age
}

// Greek-locale display format (dd/mm/yyyy) for the styled overlay text —
// the real native <input type="date"> stays invisibly on top for the
// actual picking/typing interaction (see the DOB field markup below).
function formatDobDisplay(dobStr: string): string {
  const d = new Date(dobStr + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Icons — plain inline SVG line-art, no emoji, no external icon
// library (none exists in this project). Kept intentionally simple/thin-
// stroke to match the MASTER's line-icon treatment. Each gender has a
// fixed accent tint of its own (pink / blue-violet / dual pink+violet)
// that shows at all times — selection is expressed via the card's border
// + label color, not by the icon appearing/disappearing. ──
function VenusIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="9" r="6" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <line x1="8.5" y1="18.5" x2="15.5" y2="18.5" />
    </svg>
  )
}
function MarsIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <circle cx="10" cy="14" r="6" />
      <line x1="14.2" y1="9.8" x2="20.5" y2="3.5" />
      <polyline points="14.5,3.5 20.5,3.5 20.5,9.5" />
    </svg>
  )
}
// Combined Mars+Venus (the conventional non-binary/intersex glyph) — one
// stroke rendered in the pink accent, one in the purple accent, echoing
// the two-tone pink→purple DateDuel brand gradient rather than a single
// flat color.
function NonBinaryIcon({ pink, purple }: { pink: string; purple: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="13" r="6" stroke={purple} />
      <line x1="15.2" y1="8.8" x2="20.5" y2="3.5" stroke={pink} />
      <polyline points="14.5,3.5 20.5,3.5 20.5,9.5" stroke={pink} fill="none" />
      <line x1="11" y1="19" x2="11" y2="22" stroke={purple} />
      <line x1="9" y1="20.5" x2="13" y2="20.5" stroke={purple} />
    </svg>
  )
}
function CalendarIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
      <line x1="8" y1="3.2" x2="8" y2="7" />
      <line x1="16" y1="3.2" x2="16" y2="7" />
    </svg>
  )
}

const GENDERS: { key: Gender; label: string; icon: (color: string) => React.ReactNode }[] = [
  { key: 'woman', label: 'Woman', icon: (c) => <VenusIcon color={c} /> },
  { key: 'man', label: 'Man', icon: (c) => <MarsIcon color={c} /> },
  { key: 'nonbinary', label: 'Non-binary', icon: () => <NonBinaryIcon pink="#ff3384" purple="#8b7bff" /> },
]
// Each gender's own fixed accent (used for its icon at rest, and for its
// card's border/label/icon once selected).
const ACCENT: Record<Gender, string> = { woman: '#ff3384', man: '#7c72ff', nonbinary: '#c04ee0' }

export default function OnboardingAboutYouScreen({ onNext }: Props) {
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')          // native <input type="date"> value, "YYYY-MM-DD"
  const [gender, setGender] = useState<Gender | null>(null)
  const [dobTouched, setDobTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Refs so the hydration effect below can see the LATEST values without
  // re-running on every keystroke, and never clobbers something the user
  // has already typed by the time the read resolves.
  const nameRef = useRef(name); nameRef.current = name
  const dobRef = useRef(dob); dobRef.current = dob
  const genderRef = useRef(gender); genderRef.current = gender

  // ── Resume safety: hydrate from the user's EXISTING profile (if any)
  // so leaving mid-Step-2 and coming back doesn't silently wipe prior
  // entries. Read-only — no write happens until Continue. ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        // Name is a safe column (plain select); date_of_birth/gender are
        // owner-only-private columns revoked at the database level for
        // direct SELECT, so they're read back via the RPC instead — see
        // lib/profiles.ts's fetchOwnPrivateProfile().
        const { data } = await supabase
          .from('profiles').select('name').eq('id', user.id).maybeSingle()
        const { data: priv } = await fetchOwnPrivateProfile()
        if (cancelled) return
        if (data && typeof data.name === 'string' && data.name.length > 0 && data.name !== 'Player' && nameRef.current === '') {
          setName(data.name)
        }
        if (priv) {
          if (typeof priv.date_of_birth === 'string' && priv.date_of_birth.length > 0 && dobRef.current === '') {
            setDob(priv.date_of_birth)
          }
          if ((priv.gender === 'woman' || priv.gender === 'man' || priv.gender === 'nonbinary') && genderRef.current === null) {
            setGender(priv.gender)
          }
        }
      } catch (err) {
        // Non-fatal — the screen still works perfectly well starting from
        // blank fields if this lookup fails for any reason.
        console.error('ONBOARDING ABOUT YOU: load existing failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const age = dob ? calcAge(dob) : null
  const dobProvided = dob.length > 0
  const isUnder18 = dobProvided && age !== null && age < 18
  const dobValid = dobProvided && age !== null && age >= 18
  const canContinue = name.trim().length > 0 && dobValid && gender !== null && !submitting

  async function handleContinue() {
    if (!canContinue || submitting || age === null) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitError("We couldn't confirm you're signed in. Please try again.")
      setSubmitting(false)
      return
    }

    const finalName = name.trim()

    // UPDATE only — never an insert, never a new row. date_of_birth is
    // the authoritative long-term value; `age` is kept synchronized from
    // it in this same write for backward compatibility with every other
    // consumer of the existing plain-integer age column.
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ name: finalName, date_of_birth: dob, age, gender })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING ABOUT YOU: profile update failed', updateErr)
      setSubmitError("We couldn't save your details. Please check your connection and try again.")
      setSubmitting(false)
      return
    }

    // Verify, the same way Steps 5/6 confirm their own saves — an
    // immediate re-select rather than trusting the update call alone.
    // name/age are safe columns (plain select); date_of_birth/gender are
    // owner-only-private and revoked at the database level for direct
    // SELECT, so they're verified via the RPC instead.
    const { data: verify, error: verifyErr } = await supabase
      .from('profiles').select('name, age').eq('id', user.id).maybeSingle()
    const { data: privVerify, error: privVerifyErr } = await fetchOwnPrivateProfile()

    if (
      verifyErr || !verify || privVerifyErr || !privVerify ||
      verify.name !== finalName || privVerify.date_of_birth !== dob ||
      verify.age !== age || privVerify.gender !== gender
    ) {
      console.error('ONBOARDING ABOUT YOU: post-save verification failed', verifyErr, verify, privVerifyErr, privVerify)
      setSubmitError("We couldn't confirm your details saved. Please try again.")
      setSubmitting(false)
      return
    }

    onNext()
  }

  return (
    <div className="dd-onboard-aboutyou relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* Same premium near-black base + subtle brand glow as every other
          onboarding/auth screen (Welcome, Sign In/Sign Up) — no photo, no
          texture, kept visually consistent across the flow. */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--oa-outer-pad-top)', paddingBottom: 'var(--oa-outer-pad-bottom)' }}>

        {/* Step badge + 7-segment progress — exact same design system as
            Step 1 (badge size/font, segment height/gap, active-gradient vs
            inactive-gray), just with the active index moved to Step 2. */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--oa-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--oa-badge-s)', height: 'var(--oa-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--oa-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>2</div>
          <div className="flex flex-1" style={{ gap: 'var(--oa-progress-gap)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--oa-progress-h)', borderRadius: 999,
                background: i === 1 ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Form content. Unlike Welcome's centered brand composition, a
            form screen reads best top-anchored at every height — extra
            room on taller phones is spent as breathing room under the
            gender cards (via the CTA's own marginTop:auto below), not by
            re-centering the whole form. That keeps labels/fields pinned
            to a predictable position instead of drifting with viewport
            height, which is what a real form should do. */}
        <div className="flex-1 flex flex-col min-h-0" style={{ marginTop: 'var(--oa-gap-tc)' }}>

          <div className="text-center flex-shrink-0">
            <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--oa-heading-size)' }}>
              About you
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--oa-sub-size)', lineHeight: 1.4, marginTop: 'var(--oa-gap-hs)' }}>
              Πες μας λίγα πράγματα<br />για εσένα.
            </p>
          </div>

          {/* Name */}
          <div className="flex-shrink-0" style={{ marginTop: 'var(--oa-gap-sf)' }}>
            <label className="block font-bold text-white" style={{ fontSize: 'var(--oa-label-size)', marginBottom: 'var(--oa-gap-lf)' }}>
              Name
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Το όνομά σου" autoComplete="off"
              className="w-full outline-none transition-all duration-200"
              style={{
                borderRadius: 16, paddingLeft: 18, paddingRight: 18,
                paddingTop: 'var(--oa-input-pad-y)', paddingBottom: 'var(--oa-input-pad-y)',
                fontSize: 'var(--oa-input-size)', color: '#fff',
                background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
              }} />
          </div>

          {/* Date of birth — a real native <input type="date"> is
              stretched transparently over the styled box (opacity: 0) so
              tapping/clicking anywhere on it opens the OS/browser's own
              date picker and stays fully keyboard/mobile friendly; the
              styled div underneath is purely the MASTER-matching visual
              layer, showing the Greek placeholder until a value exists
              and the dd/mm/yyyy formatted value after. No custom calendar
              UI is built here, per instruction. */}
          <div className="flex-shrink-0" style={{ marginTop: 'var(--oa-gap-ff)' }}>
            <label className="block font-bold text-white" style={{ fontSize: 'var(--oa-label-size)', marginBottom: 'var(--oa-gap-lf)' }}>
              Date of birth
            </label>
            <div className="relative">
              <div className="w-full flex items-center justify-between pointer-events-none"
                style={{
                  borderRadius: 16, paddingLeft: 18, paddingRight: 18,
                  paddingTop: 'var(--oa-input-pad-y)', paddingBottom: 'var(--oa-input-pad-y)',
                  fontSize: 'var(--oa-input-size)',
                  color: dobProvided ? '#fff' : 'rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.05)',
                  border: isUnder18 ? '1.5px solid rgba(248,113,113,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
                }}>
                <span>{dobProvided ? formatDobDisplay(dob) : 'Ημερομηνία γέννησης'}</span>
                <span style={{ color: '#ff3384', fontSize: '1.15em', display: 'flex' }}><CalendarIcon color="#ff3384" /></span>
              </div>
              <input type="date" value={dob} max={todayISO()}
                onChange={e => { setDob(e.target.value); setDobTouched(true) }}
                onBlur={() => setDobTouched(true)}
                aria-label="Date of birth"
                className="absolute inset-0 w-full h-full cursor-pointer"
                style={{ opacity: 0 }} />
            </div>
            {dobTouched && isUnder18 && (
              <div className="px-3 py-1.5 rounded-lg"
                style={{
                  marginTop: 6, fontSize: 12,
                  background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)',
                }}>
                You must be 18 or older to use DateDuel.
              </div>
            )}
          </div>

          {/* Gender */}
          <div className="flex-shrink-0" style={{ marginTop: 'var(--oa-gap-fg)' }}>
            <label className="block font-bold text-white" style={{ fontSize: 'var(--oa-label-size)', marginBottom: 'var(--oa-gap-lf)' }}>
              Gender
            </label>
            <div className="grid grid-cols-3" style={{ gap: 10 }}>
              {GENDERS.map(g => {
                const selected = gender === g.key
                const accent = ACCENT[g.key]
                return (
                  <button key={g.key} type="button" onClick={() => setGender(g.key)}
                    className="flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.97]"
                    style={{
                      borderRadius: 16,
                      paddingTop: 'var(--oa-gender-pad-y)', paddingBottom: 'var(--oa-gender-pad-y)',
                      background: selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      border: selected ? `1.5px solid ${accent}` : '1.5px solid rgba(255,255,255,0.1)',
                      boxShadow: selected ? `0 0 20px ${accent}30` : 'none',
                    }}>
                    <span style={{ fontSize: 'var(--oa-gender-icon)', display: 'flex' }}>{g.icon(accent)}</span>
                    <span className="font-bold" style={{
                      marginTop: 8, fontSize: 'var(--oa-gender-label-size)',
                      color: selected ? accent : 'rgba(255,255,255,0.55)',
                    }}>{g.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {submitError && (
            <div className="px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{
                marginTop: 10, fontSize: 12,
                background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)',
              }}>
              {submitError}
            </div>
          )}

          {/* CTA — pinned to the bottom of the remaining space via
              marginTop:auto, so extra room on taller phones (390x844,
              393x852, 430x932) becomes a larger gap above the button
              (matching the MASTER's generous bottom-anchored spacing)
              while shorter phones (375x667) simply have a smaller gap —
              never causing scroll, since the button never grows past the
              flex-1 container's own fixed height. */}
          <button onClick={handleContinue} disabled={!canContinue}
            className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
            style={{
              marginTop: 'auto',
              paddingTop: 'var(--oa-cta-pad-y)', paddingBottom: 'var(--oa-cta-pad-y)',
              fontSize: 'var(--oa-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
              background: canContinue
                ? 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)'
                : 'rgba(255,255,255,0.08)',
              color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: canContinue ? '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)' : 'none',
            }}>
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>

      <style>{`
        /* Same 3-MODE height-responsive philosophy established for Auth
           and Step 1 Welcome: MODE A (>=900px) flat base values, MODE B
           (700-899px) a fluid clamp(MIN, calc(A+Cdvh), MAX) anchored at
           700/860, MODE C (<700px) a second clamp anchored at 600/700
           whose ceiling equals MODE B's own 700px floor, so the tier
           boundary is continuous (no jump at 699/700px). */
        .dd-onboard-aboutyou {
          /* height: prefer svh (small viewport height — assumes the
             browser's toolbar/URL bar IS showing) as the final/winning
             declaration over dvh. Real-device testing found dvh can
             report a taller-than-actually-visible height on Android
             Chrome when the page never scrolls (the resize event that
             would normally correct dvh to the toolbar-adjusted value
             never fires), silently pushing the bottom CTA behind the
             browser's own chrome. svh always assumes the smaller,
             toolbar-visible viewport, so the layout is sized to the
             guaranteed-visible area instead. */
          height: 100vh; height: 100dvh; height: 100svh;
          min-height: 100vh; min-height: 100dvh; min-height: 100svh;
          max-height: 100vh; max-height: 100dvh; max-height: 100svh;
          padding-top: env(safe-area-inset-top, 0px);
          /* A real, fixed 8px minimum sits UNDER the responsive
             --oa-outer-pad-bottom value below (which was reduced by
             exactly 8px in every tier to compensate — total bottom
             clearance is unchanged on a correctly-behaving browser).
             This part of the budget no longer depends on dvh/svh
             support, tier math, or safe-area-inset-bottom being non-zero
             (Android Chrome can legitimately report 0 there even when
             the visible chrome still makes the layout feel tight) — it's
             a hard floor that always applies. */
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --oa-outer-pad-top: 14px;
          /* Reduced by 8px from its original value (28px) — that 8px now
             lives in the fixed padding-bottom above instead. Raised a
             further +14px (real-Android-phone CTA positioning
             correction) on top of that — the fixed safe-area floor
             above is untouched, only this responsive padding grew. */
          --oa-outer-pad-bottom: 34px;
          --oa-badge-gap: 10px;
          --oa-badge-s: 34px;
          --oa-badge-font: 15px;
          --oa-progress-h: 6px;
          --oa-progress-gap: 6px;
          --oa-gap-tc: 28px;
          --oa-heading-size: 32px;
          --oa-gap-hs: 8px;
          --oa-sub-size: 15px;
          --oa-gap-sf: 28px;
          --oa-label-size: 15px;
          --oa-gap-lf: 8px;
          --oa-input-pad-y: 16px;
          --oa-input-size: 15px;
          --oa-gap-ff: 16px;
          --oa-gap-fg: 24px;
          --oa-gender-pad-y: 18px;
          --oa-gender-icon: 30px;
          --oa-gender-label-size: 13px;
          --oa-cta-pad-y: 17px;
          --oa-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-aboutyou {
            --oa-outer-pad-top: clamp(8px, calc(-9.50px + 2.50dvh), 12px);
            --oa-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --oa-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --oa-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --oa-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            --oa-gap-tc: clamp(14px, calc(-29.75px + 6.25dvh), 24px);
            --oa-heading-size: clamp(24px, calc(-2.25px + 3.75dvh), 30px);
            --oa-gap-hs: clamp(6px, calc(-2.75px + 1.25dvh), 8px);
            --oa-sub-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --oa-gap-sf: clamp(16px, calc(-19.00px + 5.00dvh), 24px);
            --oa-label-size: clamp(13px, calc(8.62px + 0.62dvh), 14px);
            --oa-gap-lf: clamp(6px, calc(-2.75px + 1.25dvh), 8px);
            --oa-input-pad-y: clamp(11px, calc(-2.12px + 1.88dvh), 14px);
            --oa-input-size: clamp(13.5px, calc(9.12px + 0.62dvh), 14.5px);
            --oa-gap-ff: clamp(10px, calc(-7.50px + 2.50dvh), 14px);
            --oa-gap-fg: clamp(14px, calc(-12.25px + 3.75dvh), 20px);
            --oa-gender-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --oa-gender-icon: clamp(24px, calc(6.50px + 2.50dvh), 28px);
            --oa-gender-label-size: clamp(12px, calc(9.81px + 0.31dvh), 12.5px);
            --oa-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --oa-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          .dd-onboard-aboutyou {
            --oa-outer-pad-top: clamp(6px, calc(-6.00px + 2.00dvh), 8px);
            --oa-outer-pad-bottom: clamp(20px, calc(-40.00px + 10.00dvh), 30px);
            --oa-badge-gap: clamp(8px, calc(-4.00px + 2.00dvh), 10px);
            --oa-badge-s: clamp(26px, calc(14.00px + 2.00dvh), 28px);
            --oa-badge-font: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --oa-progress-h: clamp(4.5px, calc(1.50px + 0.50dvh), 5px);
            --oa-progress-gap: clamp(5px, calc(-1.00px + 1.00dvh), 6px);
            --oa-gap-tc: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --oa-heading-size: clamp(21px, calc(3.00px + 3.00dvh), 24px);
            --oa-gap-hs: clamp(4px, calc(-8.00px + 2.00dvh), 6px);
            --oa-sub-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --oa-gap-sf: clamp(10px, calc(-26.00px + 6.00dvh), 16px);
            --oa-label-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --oa-gap-lf: clamp(5px, calc(-1.00px + 1.00dvh), 6px);
            --oa-input-pad-y: clamp(9px, calc(-3.00px + 2.00dvh), 11px);
            --oa-input-size: clamp(13px, calc(10.00px + 0.50dvh), 13.5px);
            --oa-gap-ff: clamp(6px, calc(-18.00px + 4.00dvh), 10px);
            --oa-gap-fg: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --oa-gender-pad-y: clamp(9px, calc(-9.00px + 3.00dvh), 12px);
            --oa-gender-icon: clamp(20px, calc(-4.00px + 4.00dvh), 24px);
            --oa-gender-label-size: clamp(11px, calc(5.00px + 1.00dvh), 12px);
            --oa-cta-pad-y: clamp(10px, calc(-2.00px + 2.00dvh), 12px);
            --oa-cta-size: clamp(13.5px, calc(10.50px + 0.50dvh), 14px);
          }
        }
      `}</style>
    </div>
  )
}
