'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchOwnPrivateProfile } from '@/lib/profiles'

interface Props {
  /** Called only after preferred_age_min/preferred_age_max/
   * max_distance_km/show_me AND onboarding_completed have all been
   * written in one UPDATE and confirmed via a re-select. This is the
   * LAST onboarding step — the locked sequence is Welcome (1) → About
   * You (2) → Who You're Interested In (3) → Location + Interests (4) →
   * Photos (5) → About You/Bio (6) → Preferences (this screen, Step 7).
   * Wired (outside this component) to navigate straight into the
   * existing profiles/discovery screen — there is no Step 8.
   *
   * ARCHITECTURE: `show_me` is the SAME column Step 3 already
   * initializes — this screen hydrates from that stored value on mount,
   * and if the user changes it here, THIS screen's save becomes the
   * final/authoritative value at onboarding completion (never a second
   * "show_me_step7" field). Before marking onboarding_completed true,
   * this screen re-reads the profile row to confirm the required prior
   * steps' data (name, DOB, gender, location, interests, photos, bio)
   * is actually present — the completion flag is never set if that
   * check fails or if the preference write itself fails. */
  onNext: () => void
}

const MIN_AGE = 18
const MAX_AGE = 65
const MIN_DISTANCE = 1
const MAX_DISTANCE = 100

// Fully-open defaults (show everyone, up to the maximum distance) — the
// safest, most standard "no preference set yet" starting state for a
// brand-new user, since there is nothing in the database to hydrate
// from (see the audit note on Props.onNext above). Not meant to imply
// any specific real user's preference.
const DEFAULT_MIN_AGE = MIN_AGE
const DEFAULT_MAX_AGE = MAX_AGE
const DEFAULT_DISTANCE = MAX_DISTANCE

type ShowMe = 'women' | 'men' | 'everyone'
const SHOW_ME_OPTIONS: { key: ShowMe; label: string }[] = [
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' },
  { key: 'everyone', label: 'Everyone' },
]
// Fallback default only — actually overwritten on mount by whatever
// Step 3 already saved to the shared profiles.show_me column (see the
// hydration effect below). Only used if that read finds nothing yet.
const DEFAULT_SHOW_ME: ShowMe = 'everyone'

// ── Dual-thumb age range slider ─────────────────────────────────────
// Vanilla pointer-events implementation (no external slider library).
// The inner "track" div is inset from its wrapper by exactly half a
// thumb-width on each side, so a thumb's center can travel the full
// 0%-100% range of the inner div while its rendered circle never
// overflows the wrapper's own box — this is what keeps the control
// from ever causing horizontal overflow at either extreme.
function AgeRangeSlider({
  valueMin, valueMax, onChange,
}: { valueMin: number; valueMax: number; onChange: (next: { min: number; max: number }) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'min' | 'max' | null>(null)

  function valueFromClientX(clientX: number): number {
    const track = trackRef.current
    if (!track) return MIN_AGE
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return MIN_AGE
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(MIN_AGE + frac * (MAX_AGE - MIN_AGE))
  }

  function startDrag(which: 'min' | 'max') {
    return (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      draggingRef.current = which
    }
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const which = draggingRef.current
    if (!which) return
    const v = valueFromClientX(e.clientX)
    if (which === 'min') onChange({ min: Math.min(v, valueMax), max: valueMax })
    else onChange({ min: valueMin, max: Math.max(v, valueMin) })
  }
  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* no-op */ }
  }
  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const v = valueFromClientX(e.clientX)
    const distToMin = Math.abs(v - valueMin)
    const distToMax = Math.abs(v - valueMax)
    if (distToMin <= distToMax) onChange({ min: Math.min(v, valueMax), max: valueMax })
    else onChange({ min: valueMin, max: Math.max(v, valueMin) })
  }
  function keyStep(which: 'min' | 'max', delta: number) {
    if (which === 'min') onChange({ min: Math.max(MIN_AGE, Math.min(valueMin + delta, valueMax)), max: valueMax })
    else onChange({ min: valueMin, max: Math.min(MAX_AGE, Math.max(valueMax + delta, valueMin)) })
  }

  const fracMin = (valueMin - MIN_AGE) / (MAX_AGE - MIN_AGE)
  const fracMax = (valueMax - MIN_AGE) / (MAX_AGE - MIN_AGE)

  return (
    <div className="flex items-center" style={{ gap: 10 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--opf-edge-label-size)', flexShrink: 0 }}>{MIN_AGE}</span>
      <div className="relative flex-1" style={{ height: 'var(--opf-thumb-s)' }}>
        <div ref={trackRef} onClick={onTrackClick} className="absolute cursor-pointer"
          style={{ left: 'calc(var(--opf-thumb-s) / 2)', right: 'calc(var(--opf-thumb-s) / 2)', top: 0, bottom: 0, touchAction: 'none' }}>
          <div className="absolute left-0 right-0" style={{ top: '50%', transform: 'translateY(-50%)', height: 'var(--opf-track-h)', borderRadius: 999, background: 'rgba(255,255,255,0.9)' }} />
          <div className="absolute left-0" style={{ top: '50%', transform: 'translateY(-50%)', height: 'var(--opf-track-h)', width: `${fracMin * 100}%`, borderRadius: 999, background: 'linear-gradient(90deg,#ff3384,#ff5fa0)' }} />
          <div onPointerDown={startDrag('min')} onPointerMove={onMove} onPointerUp={endDrag}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') keyStep('min', -1); else if (e.key === 'ArrowRight') keyStep('min', 1) }}
            role="slider" aria-label="Minimum age" aria-valuemin={MIN_AGE} aria-valuemax={MAX_AGE} aria-valuenow={valueMin} tabIndex={0}
            className="absolute rounded-full cursor-pointer active:scale-110 transition-transform"
            style={{ top: '50%', left: `${fracMin * 100}%`, width: 'var(--opf-thumb-s)', height: 'var(--opf-thumb-s)', transform: 'translate(-50%,-50%)', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.45)', touchAction: 'none' }} />
          <div onPointerDown={startDrag('max')} onPointerMove={onMove} onPointerUp={endDrag}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') keyStep('max', -1); else if (e.key === 'ArrowRight') keyStep('max', 1) }}
            role="slider" aria-label="Maximum age" aria-valuemin={MIN_AGE} aria-valuemax={MAX_AGE} aria-valuenow={valueMax} tabIndex={0}
            className="absolute rounded-full cursor-pointer active:scale-110 transition-transform"
            style={{ top: '50%', left: `${fracMax * 100}%`, width: 'var(--opf-thumb-s)', height: 'var(--opf-thumb-s)', transform: 'translate(-50%,-50%)', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.45)', touchAction: 'none' }} />
        </div>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--opf-edge-label-size)', flexShrink: 0 }}>{MAX_AGE}</span>
    </div>
  )
}

// ── Single-thumb distance slider — same technique, one handle. ──
function DistanceSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  function valueFromClientX(clientX: number): number {
    const track = trackRef.current
    if (!track) return MIN_DISTANCE
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return MIN_DISTANCE
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(MIN_DISTANCE + frac * (MAX_DISTANCE - MIN_DISTANCE))
  }
  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    onChange(valueFromClientX(e.clientX))
  }
  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* no-op */ }
  }
  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) { onChange(valueFromClientX(e.clientX)) }
  function keyStep(delta: number) { onChange(Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, value + delta))) }

  const frac = (value - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)

  return (
    <div className="flex items-center" style={{ gap: 10 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--opf-edge-label-size)', flexShrink: 0 }}>{MIN_DISTANCE} km</span>
      <div className="relative flex-1" style={{ height: 'var(--opf-thumb-s)' }}>
        <div ref={trackRef} onClick={onTrackClick} className="absolute cursor-pointer"
          style={{ left: 'calc(var(--opf-thumb-s) / 2)', right: 'calc(var(--opf-thumb-s) / 2)', top: 0, bottom: 0, touchAction: 'none' }}>
          <div className="absolute left-0 right-0" style={{ top: '50%', transform: 'translateY(-50%)', height: 'var(--opf-track-h)', borderRadius: 999, background: 'rgba(255,255,255,0.9)' }} />
          <div className="absolute left-0" style={{ top: '50%', transform: 'translateY(-50%)', height: 'var(--opf-track-h)', width: `${frac * 100}%`, borderRadius: 999, background: 'linear-gradient(90deg,#ff3384,#ff5fa0)' }} />
          <div onPointerDown={startDrag} onPointerMove={onMove} onPointerUp={endDrag}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') keyStep(-1); else if (e.key === 'ArrowRight') keyStep(1) }}
            role="slider" aria-label="Maximum distance" aria-valuemin={MIN_DISTANCE} aria-valuemax={MAX_DISTANCE} aria-valuenow={value} tabIndex={0}
            className="absolute rounded-full cursor-pointer active:scale-110 transition-transform"
            style={{ top: '50%', left: `${frac * 100}%`, width: 'var(--opf-thumb-s)', height: 'var(--opf-thumb-s)', transform: 'translate(-50%,-50%)', background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.45)', touchAction: 'none' }} />
        </div>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 'var(--opf-edge-label-size)', flexShrink: 0 }}>{MAX_DISTANCE} km</span>
    </div>
  )
}

export default function OnboardingPreferencesScreen({ onNext }: Props) {
  const [ageMin, setAgeMin] = useState(DEFAULT_MIN_AGE)
  const [ageMax, setAgeMax] = useState(DEFAULT_MAX_AGE)
  const [distance, setDistance] = useState(DEFAULT_DISTANCE)
  const [showMe, setShowMe] = useState<ShowMe>(DEFAULT_SHOW_ME)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // ── Hydration: load whatever is already stored — including Step 3's
  // show_me selection, which this screen shares rather than duplicates —
  // so returning to Step 7 (or arriving here after Step 3 already saved
  // a preference) never resets to fully-open defaults over real data. ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        // All four fields here are owner-only-private columns revoked at
        // the database level for direct SELECT — read back via the RPC.
        const { data } = await fetchOwnPrivateProfile()
        if (cancelled || !data) return
        if (data.show_me === 'women' || data.show_me === 'men' || data.show_me === 'everyone') {
          setShowMe(data.show_me)
        }
        if (typeof data.preferred_age_min === 'number') {
          setAgeMin(Math.max(MIN_AGE, Math.min(data.preferred_age_min, MAX_AGE)))
        }
        if (typeof data.preferred_age_max === 'number') {
          setAgeMax(Math.max(MIN_AGE, Math.min(data.preferred_age_max, MAX_AGE)))
        }
        if (typeof data.max_distance_km === 'number') {
          setDistance(Math.max(MIN_DISTANCE, Math.min(data.max_distance_km, MAX_DISTANCE)))
        }
      } catch (err) {
        console.error('ONBOARDING PREFERENCES: load existing failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const canContinue = !submitting

  async function handleContinue() {
    if (!canContinue) return
    setSubmitting(true)
    setSubmitError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSubmitError("We couldn't confirm you're signed in. Please try again.")
      setSubmitting(false)
      return
    }

    // Completion safety check: confirm the required prior-step data is
    // actually present BEFORE marking onboarding complete. This never
    // blocks saving this screen's own preference values — only the
    // onboarding_completed flag depends on it. name/location/interests/
    // photos/bio are safe columns (plain select); date_of_birth/gender
    // are owner-only-private and revoked at the database level for
    // direct SELECT, so they're read via the RPC instead.
    const { data: existing, error: readErr } = await supabase
      .from('profiles')
      .select('name, location, interests, photos, bio')
      .eq('id', user.id).maybeSingle()
    const { data: existingPriv, error: readPrivErr } = await fetchOwnPrivateProfile()

    if (readErr || !existing || readPrivErr || !existingPriv) {
      console.error('ONBOARDING PREFERENCES: pre-completion read failed', readErr, readPrivErr)
      setSubmitError("We couldn't confirm your profile. Please try again.")
      setSubmitting(false)
      return
    }

    const missing: string[] = []
    if (!existing.name) missing.push('name')
    if (!existingPriv.date_of_birth) missing.push('date_of_birth')
    if (!existingPriv.gender) missing.push('gender')
    if (!existing.location) missing.push('location')
    if (!Array.isArray(existing.interests) || existing.interests.length === 0) missing.push('interests')
    if (!Array.isArray(existing.photos) || existing.photos.length === 0) missing.push('photos')
    if (!existing.bio) missing.push('bio')

    if (missing.length > 0) {
      console.error('ONBOARDING PREFERENCES: required prior data missing', missing)
      setSubmitError("We couldn't finish setting up your profile because some earlier steps look incomplete. Please try again.")
      setSubmitting(false)
      return
    }

    // Single UPDATE — preferences AND onboarding_completed together, so
    // the completion flag can never become true without the preference
    // write succeeding in the very same call.
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        preferred_age_min: ageMin,
        preferred_age_max: ageMax,
        max_distance_km: distance,
        show_me: showMe,
        onboarding_completed: true,
      })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING PREFERENCES: final save failed', updateErr)
      setSubmitError("We couldn't finish setting up your profile. Please try again.")
      setSubmitting(false)
      return
    }

    // Verify, the same way every prior onboarding step confirms its own
    // save — an immediate re-select rather than trusting the update
    // call alone. Every one of these fields is owner-only-private and
    // revoked at the database level for direct SELECT, so they're all
    // verified via the RPC instead.
    const { data: verify, error: verifyErr } = await fetchOwnPrivateProfile()

    if (
      verifyErr || !verify ||
      verify.preferred_age_min !== ageMin || verify.preferred_age_max !== ageMax ||
      verify.max_distance_km !== distance || verify.show_me !== showMe ||
      verify.onboarding_completed !== true
    ) {
      console.error('ONBOARDING PREFERENCES: post-save verification failed', verifyErr, verify)
      setSubmitError("We couldn't confirm your setup finished. Please try again.")
      setSubmitting(false)
      return
    }

    onNext()
  }

  return (
    <div className="dd-onboard-preferences relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* Same premium near-black base + subtle brand glow as every other
          onboarding screen. */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--opf-outer-pad-top)', paddingBottom: 'var(--opf-outer-pad-bottom)' }}>

        {/* Step badge + 7-segment progress — same design system as Steps
            1-6. Per explicit instruction this follows the TEXT spec (only
            the final, 7th segment highlighted — the same single-segment
            convention as every prior step), not the attached reference
            image, which visually shows the first six segments filled
            instead — see the deviation note in the delivered report. */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--opf-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--opf-badge-s)', height: 'var(--opf-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--opf-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>7</div>
          <div className="flex flex-1" style={{ gap: 'var(--opf-progress-gap)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--opf-progress-h)', borderRadius: 999,
                background: i === 6 ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Header — top-anchored like Steps 2-6. */}
        <div className="text-center flex-shrink-0" style={{ marginTop: 'var(--opf-gap-tc)' }}>
          <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--opf-title-size)' }}>
            Preferences
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--opf-sub-size)', marginTop: 'var(--opf-gap-ts)' }}>
            Ρύθμισε τις προτιμήσεις σου.
          </p>
        </div>

        {/* Age range */}
        <div className="flex-shrink-0" style={{ marginTop: 'var(--opf-gap-hs)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--opf-gap-lf)' }}>
            <label className="font-bold text-white" style={{ fontSize: 'var(--opf-label-size)' }}>Age range</label>
            <span className="font-bold" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--opf-value-size)' }}>
              {ageMin} – {ageMax}
            </span>
          </div>
          <AgeRangeSlider valueMin={ageMin} valueMax={ageMax} onChange={({ min, max }) => { setAgeMin(min); setAgeMax(max) }} />
        </div>

        {/* Distance */}
        <div className="flex-shrink-0" style={{ marginTop: 'var(--opf-gap-fi)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--opf-gap-lf)' }}>
            <label className="font-bold text-white" style={{ fontSize: 'var(--opf-label-size)' }}>Distance</label>
            <span className="font-bold" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--opf-value-size)' }}>
              {distance} km
            </span>
          </div>
          <DistanceSlider value={distance} onChange={setDistance} />
        </div>

        {/* Show me */}
        <div className="flex-shrink-0" style={{ marginTop: 'var(--opf-gap-fi)' }}>
          <label className="block font-bold text-white" style={{ fontSize: 'var(--opf-label-size)', marginBottom: 'var(--opf-gap-lf)' }}>
            Show me
          </label>
          <div className="grid grid-cols-3" style={{ gap: 10 }}>
            {SHOW_ME_OPTIONS.map(opt => {
              const selected = showMe === opt.key
              return (
                <button key={opt.key} type="button" onClick={() => setShowMe(opt.key)}
                  className="flex items-center justify-center cursor-pointer transition-all active:scale-[0.97]"
                  style={{
                    borderRadius: 16,
                    paddingTop: 'var(--opf-pill-pad-y)', paddingBottom: 'var(--opf-pill-pad-y)',
                    background: selected ? 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)' : 'transparent',
                    border: selected ? '1.5px solid transparent' : '1.5px solid rgba(255,255,255,0.15)',
                    boxShadow: selected ? '0 0 20px rgba(255,51,132,0.3)' : 'none',
                  }}>
                  <span className="font-bold" style={{ fontSize: 'var(--opf-pill-label-size)', color: selected ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {submitError && (
          <p className="flex-shrink-0" style={{ marginTop: 'var(--opf-gap-lf)', color: '#ff8080', fontSize: 'var(--opf-edge-label-size)' }}>{submitError}</p>
        )}

        {/* CTA — final onboarding step. Wording taken verbatim from the
            approved reference image ("You're all set! 🎉"), per explicit
            instruction that "Continue" only applies if that's literally
            what the reference shows — it isn't. */}
        <button onClick={handleContinue} disabled={!canContinue}
          className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--opf-cta-pad-y)', paddingBottom: 'var(--opf-cta-pad-y)',
            fontSize: 'var(--opf-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
            background: canContinue
              ? 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)'
              : 'rgba(255,255,255,0.08)',
            color: canContinue ? '#fff' : 'rgba(255,255,255,0.3)',
            boxShadow: canContinue ? '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)' : 'none',
          }}>
          {submitting ? 'Saving…' : "You're all set! 🎉"}
        </button>
      </div>

      <style>{`
        /* Same 3-MODE height-responsive philosophy as Steps 1-6, built
           with the real-phone CTA fix already baked in from the start
           (per explicit instruction) rather than retrofitted: 100svh as
           the final/winning height declaration, a hard
           calc(8px + env(safe-area-inset-bottom)) floor under the
           responsive --opf-outer-pad-bottom, whose own tiered values
           already reflect that 8px having been reserved (matching the
           post-fix Steps 1-4 numbers, since this screen's content
           density is comparable to Step 4's). MODE A (>=900px) flat base
           values, MODE B (700-899px) a fluid clamp(MIN, calc(A+Cdvh),
           MAX) anchored at 700/860, MODE C (<700px) a second clamp
           anchored at 600/700 whose ceiling equals MODE B's own 700px
           floor for a continuous tier boundary. Badge/progress/heading
           vars reuse the exact same numbers as Steps 1-6. */
        .dd-onboard-preferences {
          height: 100vh; height: 100dvh; height: 100svh;
          min-height: 100vh; min-height: 100dvh; min-height: 100svh;
          max-height: 100vh; max-height: 100dvh; max-height: 100svh;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --opf-outer-pad-top: 14px;
          /* Raised +14px (real-Android-phone CTA positioning correction)
             from its prior value — the fixed safe-area floor above is
             untouched, only this responsive padding grew. */
          --opf-outer-pad-bottom: 34px;
          --opf-badge-gap: 10px;
          --opf-badge-s: 34px;
          --opf-badge-font: 15px;
          --opf-progress-h: 6px;
          --opf-progress-gap: 6px;
          --opf-gap-tc: 26px;
          --opf-title-size: 32px;
          --opf-gap-ts: 8px;
          --opf-sub-size: 15px;
          --opf-gap-hs: 22px;
          --opf-label-size: 15px;
          --opf-value-size: 15px;
          --opf-gap-lf: 12px;
          --opf-gap-fi: 20px;
          --opf-edge-label-size: 14px;
          --opf-track-h: 4px;
          --opf-thumb-s: 26px;
          --opf-pill-pad-y: 18px;
          --opf-pill-label-size: 15px;
          --opf-cta-pad-y: 17px;
          --opf-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-preferences {
            --opf-outer-pad-top: clamp(8px, calc(-9.50px + 2.50dvh), 12px);
            --opf-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --opf-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --opf-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --opf-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            --opf-gap-tc: clamp(14px, calc(-29.75px + 6.25dvh), 24px);
            --opf-title-size: clamp(24px, calc(-2.25px + 3.75dvh), 30px);
            --opf-gap-ts: clamp(6px, calc(-2.75px + 1.25dvh), 8px);
            --opf-sub-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --opf-gap-hs: clamp(14px, calc(-3.50px + 2.50dvh), 18px);
            --opf-label-size: clamp(13px, calc(8.62px + 0.62dvh), 14px);
            --opf-value-size: clamp(13px, calc(8.62px + 0.62dvh), 14px);
            --opf-gap-lf: clamp(9px, calc(-3.00px + 1.88dvh), 12px);
            --opf-gap-fi: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --opf-edge-label-size: clamp(12px, calc(7.62px + 0.62dvh), 13px);
            --opf-thumb-s: clamp(22px, calc(11.50px + 1.50dvh), 26px);
            --opf-pill-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --opf-pill-label-size: clamp(13.5px, calc(9.12px + 0.62dvh), 14.5px);
            --opf-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --opf-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          .dd-onboard-preferences {
            --opf-outer-pad-top: clamp(6px, calc(-6.00px + 2.00dvh), 8px);
            --opf-outer-pad-bottom: clamp(20px, calc(-40.00px + 10.00dvh), 30px);
            --opf-badge-gap: clamp(8px, calc(-4.00px + 2.00dvh), 10px);
            --opf-badge-s: clamp(26px, calc(14.00px + 2.00dvh), 28px);
            --opf-badge-font: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --opf-progress-h: clamp(4.5px, calc(1.50px + 0.50dvh), 5px);
            --opf-progress-gap: clamp(5px, calc(-1.00px + 1.00dvh), 6px);
            --opf-gap-tc: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --opf-title-size: clamp(21px, calc(3.00px + 3.00dvh), 24px);
            --opf-gap-ts: clamp(4px, calc(-8.00px + 2.00dvh), 6px);
            --opf-sub-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --opf-gap-hs: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --opf-label-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --opf-value-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --opf-gap-lf: clamp(6px, calc(-18.00px + 4.00dvh), 9px);
            --opf-gap-fi: clamp(8px, calc(-16.00px + 4.00dvh), 12px);
            --opf-edge-label-size: clamp(11px, calc(5.00px + 1.00dvh), 12px);
            --opf-thumb-s: clamp(20px, calc(8.00px + 2.00dvh), 22px);
            --opf-pill-pad-y: clamp(9px, calc(-9.00px + 3.00dvh), 12px);
            --opf-pill-label-size: clamp(13px, calc(10.00px + 0.50dvh), 13.5px);
            --opf-cta-pad-y: clamp(10px, calc(-2.00px + 2.00dvh), 12px);
            --opf-cta-size: clamp(13.5px, calc(10.50px + 0.50dvh), 14px);
          }
        }
      `}</style>
    </div>
  )
}
