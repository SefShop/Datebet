'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchOwnPrivateProfile } from '@/lib/profiles'

interface Props {
  /** Called only after `profiles.show_me` has been written and confirmed
   * via a re-select. The locked onboarding sequence is Welcome (1) →
   * About You (2) → Who You're Interested In (this screen, Step 3) →
   * Location + Interests (4) → Photos (5) → About You/Bio (6) →
   * Preferences (7).
   *
   * ARCHITECTURE: this screen and Step 7 (Preferences) read/write the
   * SAME `profiles.show_me` column — there is no separate
   * "interested_in" field. This screen saves/initializes it; Step 7
   * later hydrates from this same value and can override it, with
   * Step 7's own save becoming the final, authoritative value at
   * onboarding completion. On mount, any already-saved value is
   * hydrated back in (never overwriting a selection already made this
   * session) so leaving and returning to this step doesn't lose it. */
  onNext: () => void
}

type Interest = 'women' | 'men' | 'everyone'

// ── Icons — plain inline SVG line-art, no emoji, matching the same
// thin-stroke treatment used for the gender icons on Step 2. Kept
// self-contained here (not imported from OnboardingAboutYouScreen.tsx,
// which stays untouched) even though the shapes are conceptually similar. ──
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
// "Everyone" — two overlapping rings in the pink/purple brand duo, a
// neutral inclusive motif (not the specific Mars+Venus identity glyph
// already used for Step 2's "Non-binary", since this screen is about
// dating preference, not personal gender identity).
function EveryoneIcon({ pink, purple }: { pink: string; purple: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <circle cx="9.5" cy="12" r="6.5" stroke={pink} />
      <circle cx="14.5" cy="12" r="6.5" stroke={purple} />
    </svg>
  )
}
function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,12.5 10,17.5 19,7" />
    </svg>
  )
}

const OPTIONS: { key: Interest; label: string; icon: (c1: string, c2: string) => React.ReactNode; accent: string; accent2?: string }[] = [
  { key: 'women', label: 'Women', icon: (c) => <VenusIcon color={c} />, accent: '#ff3384' },
  { key: 'men', label: 'Men', icon: (c) => <MarsIcon color={c} />, accent: '#7c72ff' },
  { key: 'everyone', label: 'Everyone', icon: (c1, c2) => <EveryoneIcon pink={c1} purple={c2} />, accent: '#ff3384', accent2: '#8b7bff' },
]

export default function OnboardingInterestedInScreen({ onNext }: Props) {
  const [selected, setSelected] = useState<Interest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const selectedRef = useRef(selected); selectedRef.current = selected

  // ── Resume safety: hydrate from the user's EXISTING profiles.show_me
  // (if any) so leaving mid-Step-3 and coming back doesn't lose the
  // choice. Read-only — no write happens until Continue. Never
  // overwrites a selection the user has already made this session. ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        // show_me is an owner-only-private column revoked at the database
        // level for direct SELECT — read back via the RPC instead.
        const { data } = await fetchOwnPrivateProfile()
        if (cancelled || !data) return
        if ((data.show_me === 'women' || data.show_me === 'men' || data.show_me === 'everyone') && selectedRef.current === null) {
          setSelected(data.show_me)
        }
      } catch (err) {
        console.error('ONBOARDING INTERESTED IN: load existing failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const canContinue = selected !== null && !submitting

  async function handleContinue() {
    if (!canContinue || submitting || !selected) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitError("We couldn't confirm you're signed in. Please try again.")
      setSubmitting(false)
      return
    }

    // UPDATE only. profiles.show_me is the SAME field Step 7 later reads
    // and can override — never a second, competing field.
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ show_me: selected })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING INTERESTED IN: profile update failed', updateErr)
      setSubmitError("We couldn't save your preference. Please check your connection and try again.")
      setSubmitting(false)
      return
    }

    // show_me is owner-only-private and revoked at the database level for
    // direct SELECT — verify via the RPC instead.
    const { data: verify, error: verifyErr } = await fetchOwnPrivateProfile()

    if (verifyErr || !verify || verify.show_me !== selected) {
      console.error('ONBOARDING INTERESTED IN: post-save verification failed', verifyErr, verify)
      setSubmitError("We couldn't confirm your preference saved. Please try again.")
      setSubmitting(false)
      return
    }

    onNext()
  }

  return (
    <div className="dd-onboard-interestedin relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* Same premium near-black base + subtle brand glow as every other
          onboarding/auth screen (Welcome, About You). */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--oi-outer-pad-top)', paddingBottom: 'var(--oi-outer-pad-bottom)' }}>

        {/* Step badge + 7-segment progress — same design system (size,
            gap, colors) as Step 1/2, and the same single-highlight
            convention: only the current step's own segment (index 2, the
            3rd) is filled pink; every other segment — including steps
            already passed — stays inactive gray. */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--oi-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--oi-badge-s)', height: 'var(--oi-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--oi-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>3</div>
          <div className="flex flex-1" style={{ gap: 'var(--oi-progress-gap)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--oi-progress-h)', borderRadius: 999,
                background: i === 2 ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Form content — top-anchored like Step 2, with Continue pinned
            to the bottom of the remaining space via marginTop:auto so
            extra room on taller phones becomes a larger gap above the
            button instead of re-centering the whole composition. */}
        <div className="flex-1 flex flex-col min-h-0" style={{ marginTop: 'var(--oi-gap-tc)' }}>

          <div className="text-center flex-shrink-0">
            <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--oi-title-size)', lineHeight: 1.15 }}>
              Who are you<br />interested in?
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--oi-sub-size)', lineHeight: 1.4, marginTop: 'var(--oi-gap-ts)' }}>
              Επίλεξε ποιους/ποιες<br />σε ενδιαφέρει.
            </p>
          </div>

          {/* Options — large full-width cards, single-choice. Selecting
              one always replaces any previous selection. */}
          <div className="flex flex-col flex-shrink-0" style={{ marginTop: 'var(--oi-gap-sf)', gap: 'var(--oi-card-gap)' }}>
            {OPTIONS.map(opt => {
              const isSelected = selected === opt.key
              const accent = opt.accent
              return (
                <button key={opt.key} type="button" onClick={() => setSelected(opt.key)}
                  className="w-full flex items-center cursor-pointer transition-all active:scale-[0.98]"
                  style={{
                    borderRadius: 18, gap: 14,
                    paddingLeft: 16, paddingRight: 16,
                    paddingTop: 'var(--oi-card-pad-y)', paddingBottom: 'var(--oi-card-pad-y)',
                    background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? `1.5px solid ${accent}` : '1.5px solid rgba(255,255,255,0.1)',
                    boxShadow: isSelected ? `0 0 22px ${accent}30` : 'none',
                  }}>
                  <span className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{
                      width: 'var(--oi-card-icon-wrap)', height: 'var(--oi-card-icon-wrap)',
                      background: isSelected ? `${accent}1f` : 'rgba(255,255,255,0.05)',
                      fontSize: 'var(--oi-card-icon)',
                    }}>
                    {opt.icon(accent, opt.accent2 || accent)}
                  </span>
                  <span className="font-bold flex-1 text-left"
                    style={{ fontSize: 'var(--oi-card-label-size)', color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                    {opt.label}
                  </span>
                  <span className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{
                      width: 'var(--oi-check-size)', height: 'var(--oi-check-size)',
                      border: isSelected ? `1.5px solid ${accent}` : '1.5px solid rgba(255,255,255,0.2)',
                      background: isSelected ? accent : 'transparent',
                      fontSize: 'calc(var(--oi-check-size) * 0.55)',
                    }}>
                    {isSelected && <CheckIcon color="#fff" />}
                  </span>
                </button>
              )
            })}
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

          {/* CTA — pinned to the bottom of the remaining space, same
              pattern as Step 2's Continue button. */}
          <button onClick={handleContinue} disabled={!canContinue}
            className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
            style={{
              marginTop: 'auto',
              paddingTop: 'var(--oi-cta-pad-y)', paddingBottom: 'var(--oi-cta-pad-y)',
              fontSize: 'var(--oi-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
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
        /* Same 3-MODE height-responsive philosophy as Step 1/Step 2:
           MODE A (>=900px) flat base values, MODE B (700-899px) a fluid
           clamp(MIN, calc(A+Cdvh), MAX) anchored at 700/860, MODE C
           (<700px) a second clamp anchored at 600/700 whose ceiling
           equals MODE B's own 700px floor for a continuous tier
           boundary. Badge/progress vars reuse the exact same numbers as
           Step 1/Step 2. */
        .dd-onboard-interestedin {
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
             --oi-outer-pad-bottom value below (which was reduced by
             exactly 8px in every tier to compensate — total bottom
             clearance is unchanged on a correctly-behaving browser).
             This part of the budget no longer depends on dvh/svh
             support, tier math, or safe-area-inset-bottom being non-zero
             (Android Chrome can legitimately report 0 there even when
             the visible chrome still makes the layout feel tight) — it's
             a hard floor that always applies. */
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --oi-outer-pad-top: 14px;
          /* Reduced by 8px from its original value (28px) — that 8px now
             lives in the fixed padding-bottom above instead. Raised a
             further +14px (real-Android-phone CTA positioning
             correction) on top of that — the fixed safe-area floor
             above is untouched, only this responsive padding grew. */
          --oi-outer-pad-bottom: 34px;
          --oi-badge-gap: 10px;
          --oi-badge-s: 34px;
          --oi-badge-font: 15px;
          --oi-progress-h: 6px;
          --oi-progress-gap: 6px;
          --oi-gap-tc: 28px;
          --oi-title-size: 30px;
          --oi-gap-ts: 10px;
          --oi-sub-size: 15px;
          --oi-gap-sf: 26px;
          --oi-card-gap: 14px;
          --oi-card-pad-y: 20px;
          --oi-card-icon-wrap: 52px;
          --oi-card-icon: 24px;
          --oi-card-label-size: 17px;
          --oi-check-size: 26px;
          --oi-cta-pad-y: 17px;
          --oi-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-interestedin {
            --oi-outer-pad-top: clamp(8px, calc(-9.50px + 2.50dvh), 12px);
            --oi-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --oi-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --oi-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --oi-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            --oi-gap-tc: clamp(14px, calc(-29.75px + 6.25dvh), 24px);
            --oi-title-size: clamp(22px, calc(0.12px + 3.12dvh), 27px);
            --oi-gap-ts: clamp(7px, calc(-1.75px + 1.25dvh), 9px);
            --oi-sub-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --oi-gap-sf: clamp(16px, calc(-10.25px + 3.75dvh), 22px);
            --oi-card-gap: clamp(9px, calc(-4.12px + 1.88dvh), 12px);
            --oi-card-pad-y: clamp(13px, calc(-4.50px + 2.50dvh), 17px);
            --oi-card-icon-wrap: clamp(40px, calc(13.75px + 3.75dvh), 46px);
            --oi-card-icon: clamp(19px, calc(5.88px + 1.88dvh), 22px);
            --oi-card-label-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
            --oi-check-size: clamp(20px, calc(2.50px + 2.50dvh), 24px);
            --oi-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --oi-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          .dd-onboard-interestedin {
            --oi-outer-pad-top: clamp(6px, calc(-6.00px + 2.00dvh), 8px);
            --oi-outer-pad-bottom: clamp(20px, calc(-40.00px + 10.00dvh), 30px);
            --oi-badge-gap: clamp(8px, calc(-4.00px + 2.00dvh), 10px);
            --oi-badge-s: clamp(26px, calc(14.00px + 2.00dvh), 28px);
            --oi-badge-font: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --oi-progress-h: clamp(4.5px, calc(1.50px + 0.50dvh), 5px);
            --oi-progress-gap: clamp(5px, calc(-1.00px + 1.00dvh), 6px);
            --oi-gap-tc: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --oi-title-size: clamp(19px, calc(1.00px + 3.00dvh), 22px);
            --oi-gap-ts: clamp(5px, calc(-7.00px + 2.00dvh), 7px);
            --oi-sub-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --oi-gap-sf: clamp(10px, calc(-26.00px + 6.00dvh), 16px);
            --oi-card-gap: clamp(6px, calc(-12.00px + 3.00dvh), 9px);
            --oi-card-pad-y: clamp(10px, calc(-8.00px + 3.00dvh), 13px);
            --oi-card-icon-wrap: clamp(34px, calc(-2.00px + 6.00dvh), 40px);
            --oi-card-icon: clamp(16px, calc(-2.00px + 3.00dvh), 19px);
            --oi-card-label-size: clamp(13px, calc(7.00px + 1.00dvh), 14px);
            --oi-check-size: clamp(17px, calc(-1.00px + 3.00dvh), 20px);
            --oi-cta-pad-y: clamp(10px, calc(-2.00px + 2.00dvh), 12px);
            --oi-cta-size: clamp(13.5px, calc(10.50px + 0.50dvh), 14px);
          }
        }
      `}</style>
    </div>
  )
}
