'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  /** Called only after the `profiles.bio` UPDATE has been confirmed to
   * succeed. The locked onboarding sequence is Welcome (1) → About You (2)
   * → Who You're Interested In (3) → Location + Interests (4) → Photos (5)
   * → About You/Bio (this screen, Step 6) → Preferences (7). This prop is
   * currently wired (outside this component) to a TEMPORARY placeholder
   * for Step 7 — localhost integration testing only, not the final
   * destination.
   *
   * ARCHITECTURE: this screen writes to the EXISTING `profiles.bio` TEXT
   * column only — no new column, table, or migration. It deliberately does
   * NOT touch `profiles.bio_language` (that field belongs to the separate
   * bio-translation feature in EditProfileScreen.tsx / the Bio language
   * unification pass explicitly deferred to after Step 7) and it does NOT
   * implement the old "DateDuel prompt" preset-prompt section — the
   * approved Step 6 is the bio field alone. */
  onNext: () => void
}

const MAX_BIO_LENGTH = 150

export default function OnboardingBioScreen({ onNext }: Props) {
  const [bio, setBio] = useState('')
  const [loadedExisting, setLoadedExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const bioRef = useRef(bio)
  bioRef.current = bio

  // ── Resume safety: hydrate from the user's EXISTING profiles.bio (if
  // any) so an onboarding user who left mid-Step-6 and comes back doesn't
  // have their prior text silently wiped. Read-only — no write happens
  // until Continue. Never overwrites anything the user has already typed
  // by the time this resolves (guards against a slow network response
  // landing after the user started typing). ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        const { data } = await supabase.from('profiles').select('bio').eq('id', user.id).maybeSingle()
        if (cancelled || !data) return
        if (typeof data.bio === 'string' && data.bio.length > 0 && bioRef.current === '') {
          setBio(data.bio.slice(0, MAX_BIO_LENGTH))
        }
      } catch (err) {
        // Non-fatal — the screen still works perfectly well starting from
        // an empty bio if this lookup fails for any reason.
        console.error('ONBOARDING BIO: load existing failed', err)
      } finally {
        if (!cancelled) setLoadedExisting(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  function onBioChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSubmitError('')
    setBio(e.target.value.slice(0, MAX_BIO_LENGTH))
  }

  const trimmedLength = bio.trim().length
  const canContinue = trimmedLength > 0 && !submitting

  async function handleContinue() {
    if (!canContinue || submitting) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitError("We couldn't confirm you're signed in. Please try again.")
      setSubmitting(false)
      return
    }

    const finalBio = bio.trim()

    // UPDATE only — the profile row already exists by the time onboarding
    // reaches this step, so this never inserts a new row. Only profiles.bio
    // is written; profiles.bio_language is intentionally left untouched.
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ bio: finalBio })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING BIO: profile update failed', updateErr)
      setSubmitError("We couldn't save your bio. Please check your connection and try again.")
      setSubmitting(false)
      return
    }

    // Verify, the same way Step 5 (Photos) confirms its own save — an
    // immediate re-select rather than trusting the update call alone.
    const { data: verify, error: verifyErr } = await supabase
      .from('profiles').select('bio').eq('id', user.id).maybeSingle()

    if (verifyErr || !verify || verify.bio !== finalBio) {
      console.error('ONBOARDING BIO: post-save verification failed', verifyErr, verify)
      setSubmitError("We couldn't confirm your bio saved. Please try again.")
      setSubmitting(false)
      return
    }

    onNext()
  }

  return (
    <div className="dd-onboard-bio relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* Same premium near-black base + subtle brand glow as every other
          onboarding screen. */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--ob-outer-pad-top)', paddingBottom: 'var(--ob-outer-pad-bottom)' }}>

        {/* Step badge + 7-segment progress — same design system and same
            single-highlight convention as Steps 1-5: only the current
            step's own segment (index 5, the 6th) is filled pink; every
            other segment — including steps already passed — stays
            inactive gray. No cumulative fill, no glow. */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--ob-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--ob-badge-s)', height: 'var(--ob-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--ob-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>6</div>
          <div className="flex flex-1" style={{ gap: 'var(--ob-progress-gap)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--ob-progress-h)', borderRadius: 999,
                background: i === 5 ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Header — top-anchored like Steps 2-5. */}
        <div className="text-center flex-shrink-0" style={{ marginTop: 'var(--ob-gap-tc)' }}>
          <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--ob-title-size)' }}>
            About you
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--ob-sub-size)', marginTop: 'var(--ob-gap-ts)' }}>
            Tell us a little about yourself.
          </p>
        </div>

        {/* Bio field. */}
        <div className="flex-shrink-0" style={{ marginTop: 'var(--ob-gap-hf)' }}>
          <label className="block font-bold text-white" style={{ fontSize: 'var(--ob-label-size)', marginBottom: 'var(--ob-gap-lf)' }}>
            Write a short bio
          </label>
          <textarea
            value={bio}
            onChange={onBioChange}
            maxLength={MAX_BIO_LENGTH}
            placeholder="Say something about yourself..."
            className="w-full outline-none transition-all duration-200 resize-none"
            style={{
              borderRadius: 18, padding: 'var(--ob-field-pad-y) 16px',
              fontSize: 'var(--ob-field-size)', color: '#fff', lineHeight: 1.45,
              background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
              fontFamily: 'inherit', height: 'var(--ob-field-h)',
            }}
          />
          <div className="text-right" style={{ marginTop: 6, color: 'rgba(255,255,255,0.35)', fontSize: 'var(--ob-counter-size)' }}>
            {bio.length} / {MAX_BIO_LENGTH}
          </div>

          {submitError && (
            <p style={{ marginTop: 10, color: '#ff8080', fontSize: 'var(--ob-counter-size)' }}>{submitError}</p>
          )}
        </div>

        {/* CTA — pinned to the bottom of the remaining space, same pattern
            as Steps 2-5's Continue button. */}
        <button onClick={handleContinue} disabled={!canContinue}
          className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--ob-cta-pad-y)', paddingBottom: 'var(--ob-cta-pad-y)',
            fontSize: 'var(--ob-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
            background: canContinue
              ? 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)'
              : 'rgba(255,255,255,0.08)',
            color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)',
            boxShadow: canContinue ? '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)' : 'none',
          }}>
          {submitting ? 'Saving…' : 'Continue'}
        </button>
      </div>

      <style>{`
        /* Same 3-MODE height-responsive philosophy as Steps 1-5: MODE A
           (>=900px) flat base values, MODE B (700-899px) a fluid
           clamp(MIN, calc(A+Cdvh), MAX) anchored at 700/860, MODE C
           (<700px) a second clamp anchored at 600/700 whose ceiling equals
           MODE B's own 700px floor. This screen has far less content than
           Steps 4-5 (no grid, no chip list), so the field height
           (--ob-field-h) is the one value that absorbs most of the
           available vertical space via its own clamp, keeping the layout
           visually balanced ("large empty breathing space") at every
           height instead of leaving a big dead gap above the button. */
        .dd-onboard-bio {
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
             --ob-outer-pad-bottom value below (which was reduced by
             exactly 8px in every tier to compensate — total bottom
             clearance is unchanged on a correctly-behaving browser).
             This part of the budget no longer depends on dvh/svh
             support, tier math, or safe-area-inset-bottom being non-zero
             (Android Chrome can legitimately report 0 there even when
             the visible chrome still makes the layout feel tight) — it's
             a hard floor that always applies. */
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --ob-outer-pad-top: 20px;
          /* Reduced by 8px from its original value (32px) — that 8px now
             lives in the fixed padding-bottom above instead. Raised a
             further +14px (real-Android-phone CTA positioning
             correction) on top of that — the fixed safe-area floor
             above is untouched, only this responsive padding grew. */
          --ob-outer-pad-bottom: 38px;
          --ob-badge-gap: 10px;
          --ob-badge-s: 34px;
          --ob-badge-font: 15px;
          --ob-progress-h: 6px;
          --ob-progress-gap: 6px;
          --ob-gap-tc: 28px;
          --ob-title-size: 32px;
          --ob-gap-ts: 6px;
          --ob-sub-size: 15px;
          --ob-gap-hf: 40px;
          --ob-label-size: 15px;
          --ob-gap-lf: 10px;
          --ob-field-size: 15px;
          --ob-field-pad-y: 16px;
          --ob-field-h: 220px;
          --ob-counter-size: 12px;
          --ob-cta-pad-y: 17px;
          --ob-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-bio {
            --ob-outer-pad-top: clamp(8px, calc(-9.50px + 2.50dvh), 12px);
            --ob-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --ob-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --ob-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --ob-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            --ob-gap-tc: clamp(10px, calc(-25.75px + 5.25dvh), 24px);
            --ob-title-size: clamp(22px, calc(-4.25px + 3.75dvh), 30px);
            --ob-gap-ts: clamp(4px, calc(-2.75px + 1.25dvh), 6px);
            --ob-sub-size: clamp(12.5px, calc(6.44px + 0.94dvh), 14.5px);
            --ob-gap-hf: clamp(22px, calc(-30.50px + 7.50dvh), 34px);
            --ob-label-size: clamp(13px, calc(8.63px + 0.63dvh), 14px);
            --ob-gap-lf: clamp(7px, calc(-1.75px + 1.25dvh), 9px);
            --ob-field-size: clamp(13px, calc(8.63px + 0.63dvh), 14px);
            --ob-field-pad-y: clamp(11px, calc(-2.13px + 1.88dvh), 14px);
            --ob-field-h: clamp(130px, calc(-66.88px + 28.13dvh), 190px);
            --ob-counter-size: clamp(11px, calc(7.62px + 0.62dvh), 12px);
            --ob-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --ob-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          .dd-onboard-bio {
            --ob-outer-pad-top: clamp(4px, calc(-4.00px + 1.33dvh), 6px);
            --ob-outer-pad-bottom: clamp(16px, calc(-30.00px + 8.00dvh), 24px);
            --ob-badge-gap: clamp(7px, calc(-3.00px + 1.67dvh), 9px);
            --ob-badge-s: clamp(24px, calc(12.00px + 2.00dvh), 26px);
            --ob-badge-font: clamp(11.5px, calc(5.50px + 1.00dvh), 12.5px);
            --ob-progress-h: clamp(4px, calc(1.50px + 0.42dvh), 4.5px);
            --ob-progress-gap: clamp(4px, calc(-1.00px + 0.83dvh), 5px);
            --ob-gap-tc: clamp(6px, calc(-10.00px + 2.67dvh), 10px);
            --ob-title-size: clamp(20px, calc(2.00px + 3.00dvh), 22px);
            --ob-gap-ts: clamp(2px, calc(-2.00px + 0.67dvh), 3px);
            --ob-sub-size: clamp(11px, calc(5.00px + 1.00dvh), 12.5px);
            --ob-gap-hf: clamp(12px, calc(-48.00px + 10.00dvh), 22px);
            --ob-label-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ob-gap-lf: clamp(5px, calc(-7.00px + 2.00dvh), 7px);
            --ob-field-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ob-field-pad-y: clamp(8px, calc(-10.00px + 3.00dvh), 11px);
            --ob-field-h: clamp(90px, calc(-150.00px + 40.00dvh), 130px);
            --ob-counter-size: clamp(10px, calc(5.00px + 0.83dvh), 11px);
            --ob-cta-pad-y: clamp(9px, calc(-3.00px + 2.00dvh), 12px);
            --ob-cta-size: clamp(13px, calc(9.00px + 0.67dvh), 14px);
          }
        }
      `}</style>
    </div>
  )
}
