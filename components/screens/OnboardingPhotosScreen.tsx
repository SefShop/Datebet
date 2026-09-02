'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/photoCompress'

interface Props {
  /** Called only after BOTH the Storage uploads of every newly-selected
   * photo AND the `profiles` row update have succeeded. The locked
   * onboarding sequence is Welcome (1) → About You (2) → Who You're
   * Interested In (3) → Location + Interests (4) → Photos (this screen,
   * Step 5) → About You/Bio (6) → Preferences (7). This prop is
   * currently wired (outside this component) to a TEMPORARY placeholder
   * for Step 6 — localhost integration testing only, not the final
   * destination.
   *
   * ARCHITECTURE (per the approved photo-system audit): this screen
   * deliberately does NOT invent a separate onboarding photo system. It
   * reuses the exact same infrastructure as the existing profile editor
   * (components/screens/EditProfileScreen.tsx, NOT modified by this
   * file): the same `profile-photos` Storage bucket, the same
   * `${userId}/${slotIndex}_${timestamp}.${ext}` path convention, the
   * same lib/photoCompress.ts compression helper, and the same
   * `profiles.photos` TEXT[] column with `profiles.photo` kept mirrored
   * to `photos[0]` as the primary. No new bucket, table, column,
   * migration, or storage policy is created here.
   *
   * UX/storage sequencing (explicitly requested): nothing is uploaded to
   * Storage while the user is just picking/replacing/removing photos on
   * this screen — every selection stays purely local (an object URL
   * preview) until Continue is pressed, so replacing or removing a photo
   * before confirming never creates an orphaned Storage object. Only on
   * Continue are the final NEW files compressed and uploaded; any
   * slot that already held an existing `profiles.photos` URL (e.g. the
   * user left onboarding mid-Step-5 and came back) is reused as-is,
   * never re-uploaded. */
  onNext: () => void
}

// Mirrors EditProfileScreen.tsx's own constants exactly (duplicated here
// rather than imported, since that file is locked and doesn't export
// them — consistent with this project's established practice of
// self-contained new screen files).
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const ONBOARDING_SLOT_COUNT = 6 // onboarding shows 6 of the profile's 9 total slots

// A slot is either empty, an existing Supabase-hosted photo (reused,
// never re-uploaded), or a freshly-picked local file awaiting Continue.
type Slot =
  | { kind: 'url'; url: string }
  | { kind: 'file'; file: File; previewUrl: string }
  | null

function PlusIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function CloseIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  )
}
function LockIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function OnboardingPhotosScreen({ onNext }: Props) {
  const [slots, setSlots] = useState<Slot[]>(() => Array(ONBOARDING_SLOT_COUNT).fill(null))
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [pickError, setPickError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Kept in sync every render purely so the unmount-cleanup effect below
  // can see the LATEST slots (a plain effect-cleanup closure would only
  // ever see the slots from the render that installed it).
  const slotsRef = useRef(slots)
  slotsRef.current = slots

  // ── Resume safety: load this user's EXISTING profiles.photos/photo
  // (if any) into the first available slots, so an onboarding user who
  // left mid-Step-5 and comes back doesn't have their prior selections
  // silently destroyed. Existing entries stay as real Storage URLs and
  // are never re-uploaded. This is a read-only Supabase call — no write
  // happens until Continue. ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) return
        const { data } = await supabase.from('profiles').select('photos,photo').eq('id', user.id).maybeSingle()
        if (cancelled || !data) return
        const existing: string[] = Array.isArray(data.photos) && data.photos.length > 0
          ? data.photos.filter((u: unknown): u is string => typeof u === 'string' && u.length > 0)
          : (data.photo ? [data.photo] : [])
        if (existing.length === 0) return
        setSlots(prev => {
          const next = [...prev]
          existing.slice(0, ONBOARDING_SLOT_COUNT).forEach((url, i) => { next[i] = { kind: 'url', url } })
          return next
        })
      } catch (err) {
        // Non-fatal — the screen still works perfectly well starting
        // from all-empty slots if this lookup fails for any reason.
        console.error('ONBOARDING PHOTOS: load existing failed', err)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Revoke every still-local object URL when this screen unmounts (e.g.
  // navigating away), so a user who picks several photos and then
  // leaves doesn't leak blob URLs.
  useEffect(() => {
    return () => {
      slotsRef.current.forEach(s => { if (s?.kind === 'file') URL.revokeObjectURL(s.previewUrl) })
    }
  }, [])

  function openPicker(slot: number) {
    if (submitting) return
    setPickError('')
    setActiveSlot(slot)
    fileRef.current?.click()
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // always reset, so picking the same file again still fires onChange
    if (!file || activeSlot === null) return

    if (!ALLOWED.includes(file.type)) { setPickError('Only JPG, PNG, or WebP photos are supported.'); return }
    if (file.size > MAX_SIZE) { setPickError('Photos must be under 5MB.'); return }
    setPickError('')

    const previewUrl = URL.createObjectURL(file)
    const slotIndex = activeSlot
    setSlots(prev => {
      const next = [...prev]
      const old = next[slotIndex]
      if (old?.kind === 'file') URL.revokeObjectURL(old.previewUrl) // replacing — drop the old local preview
      next[slotIndex] = { kind: 'file', file, previewUrl }
      return next
    })
  }

  function removeSlot(i: number) {
    if (submitting) return
    setSlots(prev => {
      const next = [...prev]
      const old = next[i]
      if (old?.kind === 'file') URL.revokeObjectURL(old.previewUrl)
      next[i] = null // never shifts/reorders the remaining slots
      return next
    })
  }

  const filledCount = slots.filter(Boolean).length
  const primaryFilled = slots[0] !== null
  const canContinue = primaryFilled && filledCount >= 2 && !submitting

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

    // Upload only the NEW local files, in slot order; reuse existing
    // URLs as-is. Track exactly which Storage objects THIS attempt
    // created, so a failure partway through can clean up only those —
    // never anything from a prior, already-saved session.
    const uploadedPathsThisAttempt: string[] = []
    const finalUrls: string[] = []
    let failureMessage: string | null = null

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (!slot) continue
      if (slot.kind === 'url') { finalUrls.push(slot.url); continue }

      try {
        const compressed = await compressImage(slot.file)
        const ext = compressed.name.split('.').pop()
        const path = `${user.id}/${i}_${Date.now()}.${ext}`

        const { error: upErr } = await supabase.storage
          .from('profile-photos')
          .upload(path, compressed, { upsert: true })

        if (upErr) { failureMessage = upErr.message; break }
        uploadedPathsThisAttempt.push(path)

        const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(path)
        finalUrls.push(urlData.publicUrl)
      } catch (err: any) {
        failureMessage = err?.message || 'Upload failed'
        break
      }
    }

    if (failureMessage) {
      if (uploadedPathsThisAttempt.length > 0) {
        // Best-effort cleanup of ONLY this failed attempt's own new
        // objects — never touches anything uploaded in a prior,
        // successfully-saved session (those are represented as `url`
        // slots and were never added to this array).
        try { await supabase.storage.from('profile-photos').remove(uploadedPathsThisAttempt) }
        catch (cleanupErr) { console.error('ONBOARDING PHOTOS: batch cleanup failed', cleanupErr) }
      }
      console.error('ONBOARDING PHOTOS: upload failed', failureMessage)
      setSubmitError("We couldn't upload your photos. Please check your connection and try again.")
      setSubmitting(false)
      return
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ photos: finalUrls, photo: finalUrls[0] || '' })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING PHOTOS: profile update failed', updateErr)
      setSubmitError("We saved your photos but couldn't update your profile. Please try again.")
      setSubmitting(false)
      return
    }

    // Verify, the same way EditProfileScreen.tsx confirms its own save —
    // an immediate re-select rather than trusting the update call alone.
    const { data: verify, error: verifyErr } = await supabase
      .from('profiles').select('photos,photo').eq('id', user.id).maybeSingle()

    if (verifyErr || !verify || !Array.isArray(verify.photos) || verify.photos.length !== finalUrls.length) {
      console.error('ONBOARDING PHOTOS: post-save verification failed', verifyErr, verify)
      setSubmitError("We couldn't confirm your photos saved. Please try again.")
      setSubmitting(false)
      return
    }

    onNext()
  }

  return (
    <div className="dd-onboard-photos relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* Same premium near-black base + subtle brand glow as every other
          onboarding screen. */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--op-outer-pad-top)', paddingBottom: 'var(--op-outer-pad-bottom)' }}>

        {/* Step badge + 7-segment progress — same design system and same
            single-highlight convention as Steps 1-4: only the current
            step's own segment (index 4, the 5th) is filled pink; every
            other segment — including steps already passed — stays
            inactive gray. No cumulative fill, no glow. */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--op-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--op-badge-s)', height: 'var(--op-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--op-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>5</div>
          <div className="flex flex-1" style={{ gap: 'var(--op-progress-gap)' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--op-progress-h)', borderRadius: 999,
                background: i === 4 ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Header — top-anchored like Steps 2-4. */}
        <div className="text-center flex-shrink-0" style={{ marginTop: 'var(--op-gap-tc)' }}>
          <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--op-title-size)' }}>
            Add your photos
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--op-sub-size)', marginTop: 'var(--op-gap-ts)' }}>
            Show people who you are
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 'var(--op-helper-size)', marginTop: 'var(--op-gap-sh)' }}>
            Add at least 2 photos to continue.
          </p>
        </div>

        {/* 6-slot photo grid — slot 0 is always the primary photo. */}
        <div className="flex-shrink-0" style={{ marginTop: 'var(--op-gap-hg)' }}>
          <div className="grid grid-cols-2" style={{ gap: 'var(--op-grid-gap)' }}>
            {slots.map((slot, i) => {
              const label = i === 0 ? 'primary photo' : `photo ${i + 1}`
              return (
                <div key={i} className="relative overflow-hidden"
                  style={{
                    aspectRatio: 'var(--op-card-ratio)', borderRadius: 18,
                    background: 'rgba(255,255,255,0.03)',
                    border: slot ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px dashed rgba(255,51,132,0.35)',
                  }}>
                  {slot ? (
                    <>
                      <button type="button" onClick={() => openPicker(i)} aria-label={`Replace ${label}`}
                        className="w-full h-full cursor-pointer" style={{ display: 'block' }}>
                        <img src={slot.kind === 'url' ? slot.url : slot.previewUrl} alt=""
                          className="w-full h-full object-cover" />
                      </button>
                      {i === 0 && (
                        <div className="absolute pointer-events-none font-bold"
                          style={{
                            top: 8, left: 8, fontSize: 10, letterSpacing: 0.3,
                            padding: '3px 8px', borderRadius: 999,
                            background: 'rgba(255,51,132,0.9)', color: '#fff',
                          }}>
                          Primary
                        </div>
                      )}
                      <button type="button" onClick={() => removeSlot(i)} aria-label={`Remove ${label}`}
                        disabled={submitting}
                        className="absolute flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                        style={{
                          top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(10,10,15,0.75)', border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff', fontSize: 10,
                        }}>
                        <CloseIcon color="#fff" />
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => openPicker(i)} disabled={submitting} aria-label={`Add ${label}`}
                      className="w-full h-full flex flex-col items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                      style={{ gap: 6 }}>
                      <span style={{ fontSize: 'var(--op-plus-size)', display: 'flex', color: 'rgba(255,51,132,0.55)' }}>
                        <PlusIcon color="rgba(255,51,132,0.55)" />
                      </span>
                      {i === 0 && (
                        <span style={{ fontSize: 'var(--op-addlabel-size)', color: 'rgba(255,255,255,0.35)' }}>Add photo</span>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {pickError && (
            <p style={{ marginTop: 8, color: '#ff8080', fontSize: 'var(--op-helper-size)' }}>{pickError}</p>
          )}

          <div className="flex items-center justify-between" style={{ marginTop: 'var(--op-gap-gc)' }}>
            <p className="font-bold" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--op-counter-size)' }}>
              {filledCount} / {ONBOARDING_SLOT_COUNT} photos
            </p>
          </div>

          <p className="flex items-center" style={{ marginTop: 'var(--op-gap-cp)', gap: 5, color: 'rgba(255,255,255,0.35)', fontSize: 'var(--op-privacy-size)' }}>
            <span style={{ display: 'flex', flexShrink: 0 }}><LockIcon color="rgba(255,255,255,0.35)" /></span>
            Choose clear photos that show you.
          </p>

          {submitError && (
            <p style={{ marginTop: 8, color: '#ff8080', fontSize: 'var(--op-helper-size)' }}>{submitError}</p>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} className="hidden" />

        {/* CTA — pinned to the bottom of the remaining space, same
            pattern as Steps 2-4's Continue button. */}
        <button onClick={handleContinue} disabled={!canContinue}
          className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--op-cta-pad-y)', paddingBottom: 'var(--op-cta-pad-y)',
            fontSize: 'var(--op-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
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
        /* Same 3-MODE height-responsive philosophy as Steps 1-4:
           MODE A (>=900px) flat base values, MODE B (700-899px) a fluid
           clamp(MIN, calc(A+Cdvh), MAX) anchored at 700/860, MODE C
           (<700px) a second clamp anchored at 600/700 whose ceiling
           equals MODE B's own 700px floor for a continuous tier
           boundary. Badge/progress vars reuse the exact same numbers as
           Steps 1-4. The photo-card aspect ratio (--op-card-ratio) is a
           coarse 3-step value rather than a fluid clamp — a portrait
           card doesn't need pixel-precise interpolation the way type
           sizes do, and 3 clean steps read better than a continuously
           creeping ratio. */
        .dd-onboard-photos {
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
             --op-outer-pad-bottom value below (which was reduced by
             exactly 8px in every tier to compensate — total bottom
             clearance is unchanged on a correctly-behaving browser).
             This part of the budget no longer depends on dvh/svh
             support, tier math, or safe-area-inset-bottom being non-zero
             (Android Chrome can legitimately report 0 there even when
             the visible chrome still makes the layout feel tight) — it's
             a hard floor that always applies. */
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --op-outer-pad-top: 20px;
          /* Reduced by 8px from its original value (32px) — that 8px now
             lives in the fixed padding-bottom above instead. Raised a
             further +14px (real-Android-phone CTA positioning
             correction) on top of that — the fixed safe-area floor
             above is untouched, only this responsive padding grew. */
          --op-outer-pad-bottom: 38px;
          --op-badge-gap: 10px;
          --op-badge-s: 34px;
          --op-badge-font: 15px;
          --op-progress-h: 6px;
          --op-progress-gap: 6px;
          /* STEP-5 CTA MICRO-FIX (approved follow-up to Round 7): this
             screen's content stack (badge + header + 6-card grid + counter
             + privacy line) was tall enough that it exceeded the space its
             own --op-outer-pad-bottom reserved, at every required
             viewport — which collapses this button's marginTop:auto to
             0 and pins the CTA by content height alone, independent of
             --op-outer-pad-bottom's value. The five vertical gaps below
             (--op-gap-tc/-hg/-gc/-cp/--op-grid-gap) and --op-card-ratio
             (further down, in the two height media queries) were trimmed
             — gaps first, card size only as needed — to reclaim enough
             height for marginTop:auto to actually have positive room
             again, so the CTA reaches the same flush bottom position as
             every other onboarding screen. No element removed, no slot
             count changed, no CTA property (size/gradient/radius/glow/
             behavior) touched, and the Round-7 +14px --op-outer-pad-bottom
             raise above is untouched. */
          --op-gap-tc: 16px;
          --op-title-size: 32px;
          --op-gap-ts: 6px;
          --op-sub-size: 15px;
          --op-gap-sh: 6px;
          --op-helper-size: 13px;
          --op-gap-hg: 10px;
          --op-grid-gap: 7px;
          --op-card-ratio: 0.94;
          --op-plus-size: 26px;
          --op-addlabel-size: 13px;
          --op-gap-gc: 8px;
          --op-counter-size: 12px;
          --op-gap-cp: 4px;
          --op-privacy-size: 11.5px;
          --op-cta-pad-y: 17px;
          --op-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-photos {
            --op-outer-pad-top: clamp(8px, calc(-9.50px + 2.50dvh), 12px);
            --op-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --op-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --op-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --op-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            /* STEP-5 CTA MICRO-FIX: gaps trimmed (same slope, lower
               min/const/max) to reclaim room for marginTop:auto — see the
               comment on --op-gap-tc in the base ruleset above. */
            --op-gap-tc: clamp(4px, calc(-37.75px + 5.25dvh), 10px);
            --op-title-size: clamp(22px, calc(-4.25px + 3.75dvh), 30px);
            --op-gap-ts: clamp(4px, calc(-2.75px + 1.25dvh), 6px);
            --op-sub-size: clamp(12.5px, calc(6.44px + 0.94dvh), 14.5px);
            --op-gap-sh: clamp(4px, calc(-2.75px + 1.25dvh), 6px);
            --op-helper-size: clamp(11.5px, calc(7.62px + 0.62dvh), 13px);
            --op-gap-hg: clamp(2px, calc(-13.50px + 2.50dvh), 8px);
            --op-grid-gap: clamp(4px, calc(-1.75px + 1.25dvh), 6px);
            --op-plus-size: clamp(20px, calc(11.53px + 0.98dvh), 24px);
            --op-addlabel-size: clamp(11px, calc(7.62px + 0.62dvh), 12.5px);
            --op-gap-gc: clamp(2px, calc(-9.50px + 2.50dvh), 4px);
            --op-counter-size: clamp(11px, calc(7.62px + 0.62dvh), 12px);
            --op-gap-cp: clamp(1px, calc(-2.75px + 1.25dvh), 3px);
            --op-privacy-size: clamp(10.5px, calc(7.12px + 0.62dvh), 11.5px);
            --op-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --op-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          .dd-onboard-photos {
            --op-outer-pad-top: clamp(4px, calc(-4.00px + 1.33dvh), 6px);
            --op-outer-pad-bottom: clamp(16px, calc(-30.00px + 8.00dvh), 24px);
            --op-badge-gap: clamp(7px, calc(-3.00px + 1.67dvh), 9px);
            --op-badge-s: clamp(24px, calc(12.00px + 2.00dvh), 26px);
            --op-badge-font: clamp(11.5px, calc(5.50px + 1.00dvh), 12.5px);
            --op-progress-h: clamp(4px, calc(1.50px + 0.42dvh), 4.5px);
            --op-progress-gap: clamp(4px, calc(-1.00px + 0.83dvh), 5px);
            /* STEP-5 CTA MICRO-FIX: same trim as the 700-899px tier above. */
            --op-gap-tc: clamp(2px, calc(-14.00px + 2.67dvh), 6px);
            --op-title-size: clamp(20px, calc(2.00px + 3.00dvh), 22px);
            --op-gap-ts: clamp(2px, calc(-2.00px + 0.67dvh), 3px);
            --op-sub-size: clamp(11px, calc(5.00px + 1.00dvh), 12.5px);
            --op-gap-sh: clamp(2px, calc(-2.00px + 0.67dvh), 3px);
            --op-helper-size: clamp(10.5px, calc(5.50px + 0.83dvh), 11.5px);
            --op-gap-hg: clamp(3px, calc(-9.00px + 2.00dvh), 7px);
            --op-grid-gap: clamp(3.5px, calc(-2.50px + 1.00dvh), 4.5px);
            --op-plus-size: clamp(18px, calc(6.00px + 2.00dvh), 20px);
            --op-addlabel-size: clamp(10px, calc(5.00px + 0.83dvh), 11px);
            --op-gap-gc: clamp(3px, calc(-7.00px + 1.67dvh), 5px);
            --op-counter-size: clamp(10px, calc(5.00px + 0.83dvh), 11px);
            --op-gap-cp: clamp(1.5px, calc(-4.50px + 1.00dvh), 2.5px);
            --op-privacy-size: clamp(9.5px, calc(4.75px + 0.79dvh), 10.5px);
            --op-cta-pad-y: clamp(9px, calc(-3.00px + 2.00dvh), 12px);
            --op-cta-size: clamp(13px, calc(9.00px + 0.67dvh), 14px);
          }
        }
        @media (max-height: 699px) {
          /* STEP-5 CTA MICRO-FIX: 1.15→1.20 — a small increase (shorter
             cards; aspect-ratio is width/height here) used only after gap
             trimming still left a shortfall at this tier. */
          .dd-onboard-photos { --op-card-ratio: 1.2; }
        }
        @media (min-height: 700px) and (max-height: 899px) {
          /* STEP-5 CTA MICRO-FIX: 0.98→1.02 — same reasoning as above. */
          .dd-onboard-photos { --op-card-ratio: 1.02; }
        }
      `}</style>
    </div>
  )
}
