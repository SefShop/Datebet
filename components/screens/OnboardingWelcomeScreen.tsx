'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchOwnPrivateProfile } from '@/lib/profiles'
import { enablePushForThisDevice } from '@/lib/push'

interface Props {
  /** Called only after the ENTIRE Step 1 sequence (Welcome -> location
   * permission/manual-city -> notification permission) has completed —
   * see the `stage` state machine below. The locked onboarding sequence
   * is Welcome (this screen, Step 1) → About You (2) → Who You're
   * Interested In (3) → Interests (4) → Photos (5) → About You/Bio (6) →
   * Preferences (7) — authentication happens before onboarding and is
   * not one of these steps. This is still exactly ONE onboarding step;
   * the location and notification permission sub-screens are internal
   * states of Step 1, never separate navigate() targets, so the 7-step
   * count and every other step's numbering is unaffected.
   *
   * Location handling (moved here from the former Step 4 in this
   * round): pressing "Use my location" is the ONLY thing that ever
   * calls navigator.geolocation.getCurrentPosition — never
   * automatically on mount/load. On success the REAL returned
   * latitude/longitude are persisted immediately (UPDATE only, never
   * INSERT) and verified via fetchOwnPrivateProfile() (the owner-only
   * RPC — latitude/longitude are revoked at the database level for
   * direct SELECT). Explicitly saving a manual city instead updates
   * profiles.location AND clears latitude/longitude to NULL, so a
   * newly-typed city and a stale, physically-different set of
   * coordinates from an earlier session can never coexist — see
   * handleSaveManualCity below. Neither path ever fabricates or
   * geocodes coordinates from a city string.
   *
   * Notification handling reuses the existing, unmodified
   * enablePushForThisDevice() helper (lib/push.ts) — this file recreates
   * no push/service-worker/VAPID logic of its own. The native
   * notification prompt only ever appears after "Enable notifications"
   * is pressed. Denial, an unsupported/non-installed environment, or
   * "Not now" all advance onboarding immediately (this permission is
   * optional and must never block onboarding); an actual subscription
   * failure (server/config/auth error) shows a small inline notice
   * instead of auto-advancing, but "Not now" remains available so the
   * user is never stuck. */
  onNext: () => void
}

// Reuses the exact same approved MASTER brand mark asset as every other
// DateDuel screen (Desktop Coming Soon, Sign In/Sign Up Main) — same path,
// same native pixel ratio — never redrawn or approximated here either.
const LOGO_MARK_SRC = '/brand/dateduel-mark-master.png'
const LOGO_MARK_RATIO = 686 / 386

// The chat-bubbles / game-controller / orbital-rings / sparkles
// illustration is an exact raster crop extracted directly from the
// approved Onboarding Step 1 MASTER image (public/brand/dateduel-
// onboarding-step1-illustration-master.png) — alpha-keyed against the
// MASTER's own near-black background via the same luminance-threshold +
// feathering method used for the Sign Up MASTER icons, not redrawn in
// CSS/SVG. Its native pixel aspect ratio is preserved via this constant
// so it never stretches at any viewport size.
const ILLUSTRATION_SRC = '/brand/dateduel-onboarding-step1-illustration-master.png'
const ILLUSTRATION_RATIO = 751 / 367

const TOTAL_STEPS = 7
// Welcome is onboarding STEP 1 (index 0) — authentication (Sign In / Sign
// Up) happens before onboarding and is not itself a numbered step. The
// locked 7-step sequence is: 1 Welcome (+ location/notification
// permission setup), 2 About You, 3 Who You're Interested In,
// 4 Interests, 5 Photos, 6 About You (Bio), 7 Preferences. The badge and
// progress bar below always show "1" / segment 0, unchanged across every
// internal Step 1 sub-stage — this is still one step, never step 1a/1b.
const CURRENT_STEP_INDEX = 0

// Conservative, dependency-free validation for the manual city field —
// no maps/geocoding API, no city autocomplete, no paid service. Trim +
// non-empty + a reasonable upper bound are the only rules, per this
// round's explicit "conservative validation" instruction.
const MAX_CITY_LENGTH = 100

// ── Internal Step 1 sub-stages. Never exposed as separate navigate()
// targets or separate onboarding step numbers — purely local state. ──
type Stage = 'welcome' | 'location' | 'notification'

// Every terminal state the "Use my location" control can be in — carried
// over unchanged from the former Step 4 implementation.
// 'idle' → nothing tried yet (the ONLY state on load — no auto-request).
// 'loading' → getCurrentPosition() is in flight for this press.
// 'success' → coordinates were obtained (stored locally only) and are
//   being/have been persisted.
// 'denied' | 'unavailable' | 'timeout' | 'unsupported' → all rendered
// with the same single friendly fallback message; the manual city field
// stays usable in every one of these states.
type LocStatus = 'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'

// ── Icons — plain inline SVG line-art, no emoji, matching the thin-stroke
// treatment already established on the onboarding screens. ──
function PinIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.2-7-11.5C5 5.9 8.13 3 12 3s7 2.9 7 6.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  )
}
function BellIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 10.8a6 6 0 0 1 12 0c0 4.1 1.4 5.6 1.4 5.6H4.6S6 14.9 6 10.8z" />
      <path d="M10.2 19.2a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  )
}
function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  )
}
function SpinnerIcon({ color }: { color: string }) {
  // Simple rotating ring — animation is applied via the .ow-spin class
  // (see the <style> block) on the wrapping span, not here, so this stays
  // a plain static SVG.
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <path d="M12 3a9 9 0 1 1-9 9" />
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

export default function OnboardingWelcomeScreen({ onNext }: Props) {
  const [stage, setStage] = useState<Stage>('welcome')

  // ── Resume safety (Part I): read-only hydration of any location data
  // already on the user's existing profile row — a plain Supabase
  // SELECT/RPC call, never a native permission prompt, so it is safe to
  // run automatically on mount regardless of which sub-stage is showing.
  // This never writes anything; it only informs the UI so a returning
  // user is never forced to re-grant a permission they already granted,
  // and never has their existing data silently touched. ──
  const [hydrated, setHydrated] = useState(false)
  const [existingLocationText, setExistingLocationText] = useState('')
  const [existingCoordsPresent, setExistingCoordsPresent] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled || !user) { if (!cancelled) setHydrated(true); return }
        const { data: pub } = await supabase.from('profiles').select('location').eq('id', user.id).maybeSingle()
        const { data: priv } = await fetchOwnPrivateProfile()
        if (cancelled) return
        if (typeof pub?.location === 'string') setExistingLocationText(pub.location)
        if (typeof priv?.latitude === 'number' && typeof priv?.longitude === 'number') setExistingCoordsPresent(true)
      } catch (err) {
        console.error('ONBOARDING WELCOME: resume hydration failed', err)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // A returning user already has a valid, usable location on file if
  // EITHER a non-empty city string OR real coordinates exist — the same
  // "either method is sufficient" rule Step 7 has always used.
  const existingLocationValid = existingLocationText.trim().length > 0 || existingCoordsPresent

  // ── Location sub-stage state — carried over unchanged in mechanism
  // from the former Step 4 (geolocation options, error-code mapping,
  // in-flight guard); only the persistence payload shape changed (see
  // handleUseLocation's success branch and handleSaveManualCity below,
  // per this round's explicit stale-coordinate fix). ──
  const [locStatus, setLocStatus] = useState<LocStatus>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const geoInFlightRef = useRef(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualCity, setManualCity] = useState('')
  const [locSubmitting, setLocSubmitting] = useState(false)
  const [locError, setLocError] = useState('')

  // Pre-fill the manual city field from any existing saved city once
  // hydration completes — never overwrites something the user has
  // already started typing this session, and never auto-reveals the
  // field (the user must still tap "Enter city manually"), matching
  // "do not silently replace an existing manual city" (Part I).
  useEffect(() => {
    if (hydrated && existingLocationText && manualCity === '') {
      setManualCity(existingLocationText)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, existingLocationText])

  // Only ever called from the "Use my location" button's onClick — never
  // on mount, never in a useEffect — so the browser's permission prompt
  // is guaranteed to appear only after that explicit user action.
  function handleUseLocation() {
    if (geoInFlightRef.current) return
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocStatus('unsupported')
      return
    }
    geoInFlightRef.current = true
    setLocStatus('loading')
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        geoInFlightRef.current = false
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        setLocStatus('success')
        // Success advances internally to the notification sub-stage only
        // after persistence is confirmed — see persistDeviceLocation.
        persistDeviceLocation(lat, lng)
      },
      (err) => {
        geoInFlightRef.current = false
        // 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        // (the standard, stable GeolocationPositionError codes).
        if (err.code === 1) setLocStatus('denied')
        else if (err.code === 2) setLocStatus('unavailable')
        else if (err.code === 3) setLocStatus('timeout')
        else setLocStatus('denied')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
    )
  }

  // Persists ONLY latitude/longitude — deliberately never touches
  // profiles.location here, so an existing manual city (or an empty
  // location for a brand-new user) is never silently overwritten by a
  // device-location save. UPDATE only, never INSERT. Verified via
  // fetchOwnPrivateProfile() — latitude/longitude are revoked at the
  // database level for direct SELECT (Phase B privacy lock), so a plain
  // .select('latitude') is not an option here, exactly as the former
  // Step 4 already established.
  async function persistDeviceLocation(lat: number, lng: number) {
    setLocSubmitting(true)
    setLocError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLocError("We couldn't confirm you're signed in. Please try again.")
      setLocSubmitting(false)
      return
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ latitude: lat, longitude: lng })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING WELCOME: device location save failed', updateErr)
      setLocError("We couldn't save your location. Please check your connection and try again.")
      setLocSubmitting(false)
      return
    }

    const { data: privVerify, error: privVerifyErr } = await fetchOwnPrivateProfile()
    if (privVerifyErr || !privVerify || privVerify.latitude !== lat || privVerify.longitude !== lng) {
      console.error('ONBOARDING WELCOME: device location verification failed', privVerifyErr, privVerify)
      setLocError("We couldn't confirm your location saved. Please try again.")
      setLocSubmitting(false)
      return
    }

    setLocSubmitting(false)
    setStage('notification')
  }

  // Explicit manual-city save — the ONLY place latitude/longitude are
  // ever cleared. This is the stale-coordinate fix required by this
  // round: a manual city and a leftover set of coordinates from a
  // different physical location (an earlier device-location save, an
  // earlier session, or a different device) must never coexist, since
  // discover_profiles() would otherwise compute distance from the
  // stale, wrong coordinates instead of respecting the user's freshly
  // chosen city. Coordinates are cleared ONLY here — never merely by
  // opening the manual-city input (manualOpen toggling writes nothing).
  async function handleSaveManualCity() {
    const trimmed = manualCity.trim()
    if (trimmed.length === 0) return
    if (trimmed.length > MAX_CITY_LENGTH) {
      setLocError(`City name is too long (max ${MAX_CITY_LENGTH} characters).`)
      return
    }

    setLocSubmitting(true)
    setLocError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLocError("We couldn't confirm you're signed in. Please try again.")
      setLocSubmitting(false)
      return
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ location: trimmed, latitude: null, longitude: null })
      .eq('id', user.id)

    if (updateErr) {
      console.error('ONBOARDING WELCOME: manual city save failed', updateErr)
      setLocError("We couldn't save your city. Please check your connection and try again.")
      setLocSubmitting(false)
      return
    }

    // Verify both halves of this write: location via a plain select
    // (safe/public column), latitude/longitude-cleared via the RPC
    // (owner-only-private columns, same privacy boundary as always).
    const { data: verify, error: verifyErr } = await supabase
      .from('profiles').select('location').eq('id', user.id).maybeSingle()
    const { data: privVerify, error: privVerifyErr } = await fetchOwnPrivateProfile()

    const locationOk = !verifyErr && !!verify && verify.location === trimmed
    const coordsClearedOk = !privVerifyErr && !!privVerify && privVerify.latitude === null && privVerify.longitude === null

    if (!locationOk || !coordsClearedOk) {
      console.error('ONBOARDING WELCOME: manual city verification failed', verifyErr, verify, privVerifyErr, privVerify)
      setLocError("We couldn't confirm your city saved. Please try again.")
      setLocSubmitting(false)
      return
    }

    setLocSubmitting(false)
    setStage('notification')
  }

  const deviceLocationSuccessThisSession = locStatus === 'success'
  const manualCityValid = manualCity.trim().length > 0 && manualCity.trim().length <= MAX_CITY_LENGTH
  // A location "counts" for display/resume purposes if either a fresh
  // device-location success just happened this session, or the resume
  // hydration found a valid one already on file. Neither ever displays
  // raw coordinates — only a city string (if any) or a generic
  // confirmation.
  const locationResolvedForDisplay = deviceLocationSuccessThisSession || existingLocationValid
  const locationSecondaryText = deviceLocationSuccessThisSession
    ? 'Location enabled'
    : locStatus === 'loading'
    ? 'Finding your location…'
    : locStatus === 'unsupported'
    ? 'Not available on this device'
    : (locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'timeout')
    ? "Couldn't detect — tap to try again"
    : existingLocationValid
    ? (existingLocationText.trim() || 'Location already set')
    : 'Tap to detect your location'

  // Resume-only affordance (Part I): lets a returning user with an
  // already-valid location move on WITHOUT re-granting anything or
  // re-typing a city. Hidden the moment the user starts a fresh action
  // this session (loading, or a just-completed success, which already
  // auto-advances on its own).
  const showResumeContinue = hydrated && existingLocationValid && locStatus !== 'loading' && locStatus !== 'success'

  // ── Notification sub-stage state ──
  const [notifSubmitting, setNotifSubmitting] = useState(false)

  // Notifications are entirely optional and best-effort. EVERY possible
  // outcome of enablePushForThisDevice() — a clean success, an explicit
  // permission denial, an unsupported browser/non-installed iOS PWA, or
  // an actual subscription/config failure (missing VAPID key, not
  // configured, not authenticated, a server error, or an unexpected
  // exception) — advances onboarding immediately. A failed attempt must
  // never require a second user action before onboarding can continue:
  // there is no branch here that leaves the user stuck on this screen.
  // No retry is attempted and no fallback push logic is created —
  // Settings remains the one, unchanged place to turn notifications on
  // later. enablePushForThisDevice() itself already logs failures
  // in lib/push.ts without exposing secrets; nothing here shows the
  // user any technical detail (VAPID values, server internals, stack
  // traces, or raw API errors) at any point, matching "Not now"'s own
  // treatment below.
  async function handleEnableNotifications() {
    setNotifSubmitting(true)
    await enablePushForThisDevice()
    setNotifSubmitting(false)
    onNext()
  }

  function handleNotNow() {
    onNext()
  }

  return (
    <div className="dd-onboard-welcome relative flex flex-col h-full overflow-hidden" style={{ background: '#09090f' }}>
      {/* ── BG: same premium near-black base + subtle brand glow used by
          every other DateDuel screen — no photograph, no texture ── */}
      <div className="absolute inset-0" style={{ background: '#08070a' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 20%, rgba(255,51,132,0.15) 0%, transparent 62%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 80% 60%, rgba(139,123,255,0.1) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 15% 75%, rgba(139,123,255,0.07) 0%, transparent 60%)' }} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 mx-auto w-full"
        style={{ maxWidth: 390, paddingTop: 'var(--ow-outer-pad-top)', paddingBottom: 'var(--ow-outer-pad-bottom)' }}>

        {/* ── Top: step badge + 7-segment progress indicator. Identical
            across all three Step 1 sub-stages (welcome / location /
            notification) — still "1" / segment 0, since this is still
            one onboarding step. Pinned near the top via normal flow so
            it never drifts as the sub-stage content below changes. ── */}
        <div className="flex items-center flex-shrink-0" style={{ gap: 'var(--ow-badge-gap)' }}>
          <div className="flex items-center justify-center flex-shrink-0 font-extrabold text-white"
            style={{
              width: 'var(--ow-badge-s)', height: 'var(--ow-badge-s)', borderRadius: '50%',
              background: '#ff2d7a', fontSize: 'var(--ow-badge-font)',
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}>{CURRENT_STEP_INDEX + 1}</div>
          <div className="flex flex-1" style={{ gap: 'var(--ow-progress-gap)' }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="flex-1" style={{
                height: 'var(--ow-progress-h)', borderRadius: 999,
                background: i === CURRENT_STEP_INDEX ? 'linear-gradient(90deg,#ff3384,#ff5fa0)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {stage === 'welcome' && (
          /* ── Everything else fills the remaining height. On spacious
              screens (MODE A, >=900px height) it centers as a block, the
              same technique as AuthMain's justify-center — there's slack to
              spare, so centering reads as intentional breathing room. On
              real-phone heights (MODE B/C) centering was splitting the
              recovered space evenly above AND below the composition,
              leaving a large dead gap between the progress bar and the
              logo that the MASTER does not have. There the block is
              top-aligned instead (--ow-content-justify: flex-start) with
              only a small explicit gap (--ow-gap-tc) below the progress
              bar, and the freed space is spent enlarging the illustration
              and inter-section gaps instead of sitting empty. ── */
          <div className="flex-1 flex flex-col items-center min-h-0" style={{ justifyContent: 'var(--ow-content-justify)' }}>

            {/* Brand: ring + DD mark + "Welcome to" / "DateDuel" + tagline */}
            <div className="text-center flex-shrink-0" style={{ marginTop: 'var(--ow-gap-tc)' }}>
              {/* Ring wrapper is scoped to ONLY the mark image (not the
                  headings below) so the ring encircles the logo the way it
                  does in the MASTER, instead of being centered across the
                  whole heading block and bleeding into the text. */}
              <div className="relative mx-auto" style={{ width: 'fit-content' }}>
                {/* Thin circular ring behind the mark — a plain single-color
                    stroke circle in the MASTER (confirmed by direct visual
                    inspection, no gradient/texture), simple enough to remain a
                    CSS-drawn shape per the established "simple UI shapes may
                    stay SVG" convention rather than a raster crop. */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ width: 'var(--ow-ring)', height: 'var(--ow-ring)', border: '1px solid rgba(255,90,150,0.35)' }} />
                <img src={LOGO_MARK_SRC} alt="DesireDuel" className="relative mx-auto"
                  style={{ display: 'block', height: 'var(--ow-mark)', width: `calc(var(--ow-mark) * ${LOGO_MARK_RATIO})`, objectFit: 'contain' }} />
              </div>

              <h1 className="font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--ow-welcome-size)', marginTop: 'var(--ow-gap-mw)' }}>
                Welcome to
              </h1>
              <h1 className="font-extrabold italic" style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--ow-brand-size)', marginTop: 'var(--ow-gap-ww)',
                background: 'linear-gradient(100deg,#ff3384 15%,#c04ee0 55%,#8b7bff 90%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                DesireDuel
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--ow-tag-size)', marginTop: 'var(--ow-gap-bt)' }}>
                Play<span style={{ color: '#ff3384' }}>.</span> Connect<span style={{ color: '#ff3384' }}>.</span> Match<span style={{ color: '#ff3384' }}>.</span>
              </p>
            </div>

            {/* Divider: thin gradient lines + heart, same pattern already
                established on the Auth screens */}
            <div className="flex items-center flex-shrink-0" style={{ gap: 12, marginTop: 'var(--ow-gap-td)' }}>
              <div style={{ width: 'var(--ow-divider-w)', height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,51,132,0.55))' }} />
              <span style={{ fontSize: 15, color: '#ff3384' }}>♥</span>
              <div style={{ width: 'var(--ow-divider-w)', height: 1, background: 'linear-gradient(90deg,rgba(139,123,255,0.55),transparent)' }} />
            </div>

            {/* Body copy — exact Greek wording from the MASTER */}
            <p className="text-center flex-shrink-0" style={{
              color: 'rgba(255,255,255,0.55)', fontSize: 'var(--ow-body-size)', lineHeight: 'var(--ow-body-lh)',
              marginTop: 'var(--ow-gap-db)',
            }}>
              Το πιο διασκεδαστικό dating app<br />
              με παιχνίδια και αληθινές γνωριμίες.
            </p>

            {/* Illustration — exact MASTER-derived raster crop */}
            <img aria-hidden src={ILLUSTRATION_SRC} alt="" className="flex-shrink-0"
              style={{ width: 'var(--ow-illust-w)', height: 'auto', aspectRatio: `${ILLUSTRATION_RATIO}`, marginTop: 'var(--ow-gap-bi)', objectFit: 'contain' }} />

            {/* CTA — now begins the internal Step 1 permission-setup
                sequence instead of navigating straight to Step 2. */}
            <button onClick={() => setStage('location')}
              className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer flex-shrink-0"
              style={{
                marginTop: 'var(--ow-gap-ic)',
                paddingTop: 'var(--ow-cta-pad-y)', paddingBottom: 'var(--ow-cta-pad-y)',
                fontSize: 'var(--ow-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
                background: 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)',
                color: '#fff', boxShadow: '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)',
              }}>
              Let&apos;s go!
            </button>
          </div>
        )}

        {stage === 'location' && (
          <div className="flex-1 flex flex-col min-h-0" style={{ marginTop: 'var(--ow2-gap-tc)' }}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 'var(--ow2-icon-circle)', height: 'var(--ow2-icon-circle)', borderRadius: '50%',
                  background: 'rgba(255,51,132,0.12)', border: '1.5px solid rgba(255,51,132,0.35)',
                  color: '#ff5fa0', fontSize: 'var(--ow2-icon-size)',
                }}>
                <PinIcon color="#ff5fa0" />
              </div>
              <h1 className="font-extrabold text-white text-center" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--ow2-title-size)', marginTop: 'var(--ow2-gap-ict)' }}>
                Find people near you
              </h1>
              <p className="text-center" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--ow2-body-size)', lineHeight: 1.5, marginTop: 'var(--ow2-gap-tb)' }}>
                We use your location to show you people nearby.<br />
                Your precise location is never shown to other users.
              </p>
            </div>

            <div className="flex-shrink-0" style={{ marginTop: 'var(--ow2-gap-bf)' }}>
              {/* Primary CTA — the ONLY thing that ever triggers the native
                  geolocation permission prompt, and only on direct tap. */}
              <button type="button" onClick={handleUseLocation}
                disabled={locStatus === 'loading' || locStatus === 'unsupported' || locSubmitting}
                aria-live="polite"
                className="w-full flex items-center transition-all active:scale-[0.97] cursor-pointer disabled:cursor-not-allowed"
                style={{
                  borderRadius: 16, gap: 12,
                  paddingLeft: 16, paddingRight: 16,
                  paddingTop: 'var(--ow2-field-pad-y)', paddingBottom: 'var(--ow2-field-pad-y)',
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  background: locationResolvedForDisplay ? 'rgba(255,51,132,0.12)' : 'rgba(255,51,132,0.07)',
                  border: locationResolvedForDisplay ? '1.5px solid #ff3384' : '1.5px solid rgba(255,51,132,0.35)',
                  boxShadow: locationResolvedForDisplay ? '0 0 16px rgba(255,51,132,0.3)' : 'none',
                }}>
                <span className={(locStatus === 'loading' || locSubmitting) ? 'ow-spin' : ''}
                  style={{ fontSize: 'var(--ow2-row-icon)', display: 'flex', flexShrink: 0, color: locationResolvedForDisplay ? '#ff5fa0' : '#ff3384' }}>
                  {(locStatus === 'loading' || locSubmitting) ? <SpinnerIcon color="#ff3384" /> : <PinIcon color={locationResolvedForDisplay ? '#ff5fa0' : '#ff3384'} />}
                </span>
                <span className="text-left" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 'var(--ow2-field-size)', fontWeight: 700, color: locStatus === 'unsupported' ? 'rgba(255,255,255,0.35)' : '#fff' }}>
                    Use my location
                  </span>
                  <span className="truncate" style={{ fontSize: 'var(--ow2-row-sub-size)', fontWeight: 600, color: locationResolvedForDisplay ? '#ff5fa0' : 'rgba(255,255,255,0.5)' }}>
                    {locationSecondaryText}
                  </span>
                </span>
                {locationResolvedForDisplay && (
                  <span style={{ flexShrink: 0, display: 'flex', fontSize: '1.1em', color: '#ff5fa0' }}>
                    <CheckIcon color="#ff5fa0" />
                  </span>
                )}
              </button>

              {/* Manual fallback — always available, including after a
                  denied/unavailable/timeout/unsupported result. */}
              <div style={{ marginTop: 'var(--ow2-gap-lf)' }}>
                <button type="button" onClick={() => setManualOpen(o => !o)} disabled={locSubmitting}
                  className="cursor-pointer active:opacity-60 transition-opacity disabled:cursor-not-allowed"
                  style={{
                    fontSize: 'var(--ow2-row-sub-size)', fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)', textDecoration: 'underline',
                    background: 'transparent', border: 'none', padding: 0,
                  }}>
                  {manualOpen ? 'Hide manual entry' : 'Enter city manually'}
                </button>

                {manualOpen && (
                  <div style={{ marginTop: 'var(--ow2-gap-lf)' }}>
                    <div className="relative">
                      <input value={manualCity} onChange={e => setManualCity(e.target.value)}
                        maxLength={MAX_CITY_LENGTH}
                        placeholder="Enter your city" autoComplete="off"
                        disabled={locSubmitting}
                        className="w-full outline-none transition-all duration-200"
                        style={{
                          borderRadius: 14, paddingLeft: 16, paddingRight: 40,
                          paddingTop: 'var(--ow2-field-pad-y)', paddingBottom: 'var(--ow2-field-pad-y)',
                          fontSize: 'var(--ow2-field-size)', color: '#fff',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        }} />
                      <span className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ right: 14, color: 'rgba(255,51,132,0.6)', fontSize: '1em', display: 'flex' }}>
                        <PinIcon color="rgba(255,51,132,0.6)" />
                      </span>
                    </div>
                    {/* Explicit confirm/save action — coordinates are only
                        ever cleared here, never merely by opening this
                        field (see handleSaveManualCity's comment). */}
                    <button type="button" onClick={handleSaveManualCity} disabled={!manualCityValid || locSubmitting}
                      className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer disabled:cursor-not-allowed"
                      style={{
                        marginTop: 'var(--ow2-gap-lf)',
                        paddingTop: 'var(--ow2-field-pad-y)', paddingBottom: 'var(--ow2-field-pad-y)',
                        fontSize: 'var(--ow2-field-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
                        background: manualCityValid && !locSubmitting
                          ? 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)'
                          : 'rgba(255,255,255,0.08)',
                        color: manualCityValid && !locSubmitting ? '#fff' : 'rgba(255,255,255,0.3)',
                      }}>
                      {locSubmitting ? 'Saving…' : 'Save & continue'}
                    </button>
                  </div>
                )}
              </div>

              {locError && (
                <div className="px-3 py-1.5 rounded-lg"
                  style={{
                    marginTop: 10, fontSize: 12,
                    background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)',
                  }}>
                  {locError}
                </div>
              )}

              <p style={{ marginTop: 'var(--ow2-gap-lf)', color: 'rgba(255,255,255,0.35)', fontSize: 'var(--ow2-row-sub-size)', lineHeight: 1.3, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                <span style={{ display: 'flex', flexShrink: 0, marginTop: 2, fontSize: '1em' }}>
                  <LockIcon color="rgba(255,255,255,0.35)" />
                </span>
                Your precise location is never shown to other users.
              </p>

              {/* Resume-only affordance (Part I) — a returning user with a
                  valid location already on file can move on without
                  re-granting anything or re-entering a city. */}
              {showResumeContinue && (
                <button type="button" onClick={() => setStage('notification')}
                  className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer"
                  style={{
                    marginTop: 'var(--ow2-gap-bf)',
                    paddingTop: 'var(--ow2-field-pad-y)', paddingBottom: 'var(--ow2-field-pad-y)',
                    fontSize: 'var(--ow2-field-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
                    background: 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)',
                    color: '#fff', boxShadow: '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)',
                  }}>
                  Continue
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'notification' && (
          <div className="flex-1 flex flex-col min-h-0" style={{ marginTop: 'var(--ow2-gap-tc)' }}>
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 'var(--ow2-icon-circle)', height: 'var(--ow2-icon-circle)', borderRadius: '50%',
                  background: 'rgba(255,51,132,0.12)', border: '1.5px solid rgba(255,51,132,0.35)',
                  color: '#ff5fa0', fontSize: 'var(--ow2-icon-size)',
                }}>
                <BellIcon color="#ff5fa0" />
              </div>
              <h1 className="font-extrabold text-white text-center" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 'var(--ow2-title-size)', marginTop: 'var(--ow2-gap-ict)' }}>
                Stay in the game
              </h1>
              <p className="text-center" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--ow2-body-size)', lineHeight: 1.5, marginTop: 'var(--ow2-gap-tb)' }}>
                Turn on notifications so you know when you get<br />
                a new challenge, match or message.
              </p>
            </div>

            <div className="flex-shrink-0" style={{ marginTop: 'auto', paddingTop: 'var(--ow2-gap-bf)' }}>
              <button type="button" onClick={handleEnableNotifications} disabled={notifSubmitting}
                className="w-full rounded-2xl font-bold transition-all active:scale-[0.97] cursor-pointer disabled:cursor-not-allowed"
                style={{
                  paddingTop: 'var(--ow2-cta-pad-y)', paddingBottom: 'var(--ow2-cta-pad-y)',
                  fontSize: 'var(--ow2-cta-size)', fontFamily: "'Plus Jakarta Sans',sans-serif",
                  background: notifSubmitting ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ff3384 0%, #d84dd8 50%, #7c72ff 100%)',
                  color: notifSubmitting ? 'rgba(255,255,255,0.3)' : '#fff',
                  boxShadow: notifSubmitting ? 'none' : '0 12px 36px rgba(253,41,123,0.354), 0 0 50px rgba(200,80,192,0.094)',
                }}>
                {notifSubmitting ? 'Enabling…' : 'Enable notifications'}
              </button>
              <button type="button" onClick={handleNotNow} disabled={notifSubmitting}
                className="w-full cursor-pointer active:opacity-60 transition-opacity disabled:cursor-not-allowed"
                style={{
                  marginTop: 14, fontSize: 'var(--ow2-row-sub-size)', fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', padding: 0,
                }}>
                Not now
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── Same 3-MODE height-responsive philosophy as the Auth screens:
           MODE A — LARGE (>=900px height): base values below, no query needed.
           MODE B — MEDIUM/REAL-PHONE (700-899px): fluid clamp(MIN, calc(A+Cdvh), MAX)
             — MIN is safe down to 700px, MAX is reached right at ~852px
             (anchored at 860, just above the tallest required real-phone
             test point) so 390x844/393x852 render close to their full,
             "use the available height" size rather than partway there.
           MODE C — SHORT (<700px): flat, compact values, tuned so nothing
             clips even at 375x667. ── */
        .dd-onboard-welcome {
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
             --ow-outer-pad-bottom value below (which was reduced by
             exactly 8px in every tier to compensate — total bottom
             clearance is unchanged on a correctly-behaving browser).
             This part of the budget no longer depends on dvh/svh
             support, tier math, or safe-area-inset-bottom being non-zero
             (Android Chrome can legitimately report 0 there even when
             the visible chrome still makes the layout feel tight) — it's
             a hard floor that always applies. */
          padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));

          --ow-outer-pad-top: 14px;
          /* Bottom padding does double duty now that "Let's go!" is the
             last element: it's the closing margin under the composition,
             so it's deliberately larger than the old value (which only
             had to clear the legal/login block, not read as an ending).
             Reduced by 8px from its original value — that 8px now lives
             in the fixed padding-bottom above instead. Raised a further
             +14px (real-Android-phone CTA positioning correction) on top
             of that — the fixed safe-area floor above is untouched, only
             this responsive padding grew, which is what pushes the CTA
             further up from the edge. */
          --ow-outer-pad-bottom: 34px;
          --ow-content-justify: center;
          --ow-gap-tc: 0px;
          --ow-badge-gap: 10px;
          --ow-badge-s: 34px;
          --ow-badge-font: 15px;
          --ow-progress-h: 6px;
          --ow-progress-gap: 6px;
          --ow-ring: 112px;
          --ow-mark: 88px;
          --ow-gap-mw: 18px;
          --ow-welcome-size: 34px;
          --ow-gap-ww: 4px;
          --ow-brand-size: 42px;
          --ow-gap-bt: 14px;
          --ow-tag-size: 17px;
          --ow-gap-td: 28px;
          --ow-divider-w: 90px;
          --ow-gap-db: 28px;
          --ow-body-size: 15px;
          --ow-body-lh: 1.5;
          --ow-gap-bi: 34px;
          --ow-illust-w: 310px;
          --ow-gap-ic: 34px;
          --ow-cta-pad-y: 17px;
          --ow-cta-size: 16px;

          /* ── Sub-screen (location / notification) layout vars — same
             tiered-clamp philosophy, modeled directly on the former Step
             4's already real-device-tested --ol-* scaffold (same
             max-width 390 container, same "icon/title/body then
             interactive controls then CTA" composition shape), so these
             two new sub-screens inherit a layout system already proven
             to fit at all four required test viewports rather than an
             untested new one. ── */
          --ow2-gap-tc: 26px;
          --ow2-icon-circle: 64px;
          --ow2-icon-size: 26px;
          --ow2-gap-ict: 18px;
          --ow2-title-size: 26px;
          --ow2-gap-tb: 10px;
          --ow2-body-size: 14.5px;
          --ow2-gap-bf: 28px;
          --ow2-field-pad-y: 16px;
          --ow2-field-size: 15px;
          --ow2-row-icon: 20px;
          --ow2-row-sub-size: 13px;
          --ow2-gap-lf: 10px;
          --ow2-cta-pad-y: 17px;
          --ow2-cta-size: 16px;
        }
        @media (max-height: 899px) {
          .dd-onboard-welcome {
            --ow-outer-pad-top: clamp(8px, calc(0.09px + 0.92dvh), 12px);
            /* Now the closing margin under "Let's go!" (the legal/login
               block used to sit here) — deliberately larger than the old
               14px ceiling so the screen doesn't end abruptly. */
            --ow-outer-pad-bottom: clamp(30px, calc(-75.00px + 15.00dvh), 54px);
            --ow-content-justify: flex-start;
            --ow-gap-tc: clamp(20px, calc(-23.75px + 6.25dvh), 30px);
            --ow-badge-s: clamp(28px, calc(19.53px + 0.98dvh), 32px);
            --ow-badge-font: clamp(13px, calc(9.53px + 0.4dvh), 14.5px);
            --ow-progress-h: clamp(5px, calc(3.6px + 0.16dvh), 5.5px);
            --ow-ring: clamp(84px, calc(-29.75px + 16.25dvh), 110px);
            --ow-mark: clamp(66px, calc(-12.75px + 11.25dvh), 84px);
            --ow-gap-mw: clamp(13px, calc(-8.88px + 3.12dvh), 18px);
            --ow-welcome-size: clamp(25px, calc(-10.00px + 5.00dvh), 33px);
            --ow-gap-ww: clamp(4px, calc(-0.38px + 0.62dvh), 5px);
            --ow-brand-size: clamp(30px, calc(-13.75px + 6.25dvh), 40px);
            --ow-gap-bt: clamp(11px, calc(-10.88px + 3.12dvh), 16px);
            --ow-tag-size: clamp(13px, calc(-0.12px + 1.88dvh), 16px);
            --ow-gap-td: clamp(20px, calc(-32.50px + 7.50dvh), 32px);
            --ow-divider-w: clamp(60px, calc(-53.75px + 16.25dvh), 86px);
            --ow-gap-db: clamp(20px, calc(-32.50px + 7.50dvh), 32px);
            --ow-body-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --ow-gap-bi: clamp(26px, calc(-26.50px + 7.50dvh), 38px);
            --ow-illust-w: clamp(230px, calc(-163.75px + 56.25dvh), 320px);
            --ow-gap-ic: clamp(26px, calc(-26.50px + 7.50dvh), 38px);
            --ow-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --ow-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);

            --ow2-gap-tc: clamp(14px, calc(-29.75px + 6.25dvh), 24px);
            --ow2-icon-circle: clamp(52px, calc(19.00px + 3.75dvh), 60px);
            --ow2-icon-size: clamp(21px, calc(9.25px + 1.25dvh), 24px);
            --ow2-gap-ict: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --ow2-title-size: clamp(21px, calc(-3.75px + 3.75dvh), 25px);
            --ow2-gap-tb: clamp(7px, calc(-1.75px + 1.25dvh), 9px);
            --ow2-body-size: clamp(13px, calc(6.44px + 0.94dvh), 14.5px);
            --ow2-gap-bf: clamp(18px, calc(-13.75px + 5.00dvh), 26px);
            --ow2-field-pad-y: clamp(11px, calc(-2.12px + 1.88dvh), 14px);
            --ow2-field-size: clamp(13.5px, calc(9.12px + 0.62dvh), 14.5px);
            --ow2-row-icon: clamp(16px, calc(7.25px + 1.25dvh), 18px);
            --ow2-row-sub-size: clamp(11.5px, calc(7.62px + 0.5dvh), 12.5px);
            --ow2-gap-lf: clamp(7px, calc(-1.75px + 1.25dvh), 9px);
            --ow2-cta-pad-y: clamp(12px, calc(-5.50px + 2.50dvh), 16px);
            --ow2-cta-size: clamp(14px, calc(5.25px + 1.25dvh), 16px);
          }
        }
        @media (max-height: 699px) {
          /* Below 700px this used to jump to flat values noticeably
             SMALLER than MODE B's own 700px floor (e.g. illust-w dropped
             from 230px to 190px for a 1px height difference), which both
             under-used the 375x667 test viewport and created a visible
             discontinuity right at the tier boundary. Now a second clamp()
             interpolates between a conservative floor at 600px and MODE
             B's 700px floor values, so 667px (the required test point)
             lands close to the 700px numbers instead of the old
             compact-only values, and the transition across 699/700px is
             continuous. */
          .dd-onboard-welcome {
            --ow-content-justify: flex-start;
            --ow-outer-pad-top: clamp(6px, calc(-6.00px + 2.00dvh), 8px);
            --ow-outer-pad-bottom: clamp(20px, calc(-40.00px + 10.00dvh), 30px);
            --ow-gap-tc: clamp(10px, calc(-50.00px + 10.00dvh), 20px);
            --ow-badge-gap: clamp(8px, calc(-4.00px + 2.00dvh), 10px);
            --ow-badge-s: clamp(26px, calc(14.00px + 2.00dvh), 28px);
            --ow-badge-font: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ow-progress-h: clamp(4.5px, calc(1.50px + 0.50dvh), 5px);
            --ow-progress-gap: clamp(5px, calc(-1.00px + 1.00dvh), 6px);
            --ow-ring: clamp(70px, calc(-14.00px + 14.00dvh), 84px);
            --ow-mark: clamp(54px, calc(-18.00px + 12.00dvh), 66px);
            --ow-gap-mw: clamp(10px, calc(-8.00px + 3.00dvh), 13px);
            --ow-welcome-size: clamp(22px, calc(4.00px + 3.00dvh), 25px);
            --ow-gap-ww: clamp(2px, calc(-10.00px + 2.00dvh), 4px);
            --ow-brand-size: clamp(26px, calc(2.00px + 4.00dvh), 30px);
            --ow-gap-bt: clamp(8px, calc(-10.00px + 3.00dvh), 11px);
            --ow-tag-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ow-gap-td: clamp(14px, calc(-22.00px + 6.00dvh), 20px);
            --ow-divider-w: clamp(48px, calc(-24.00px + 12.00dvh), 60px);
            --ow-gap-db: clamp(14px, calc(-22.00px + 6.00dvh), 20px);
            --ow-body-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ow-body-lh: 1.4;
            --ow-gap-bi: clamp(18px, calc(-30.00px + 8.00dvh), 26px);
            --ow-illust-w: clamp(190px, calc(-50.00px + 40.00dvh), 230px);
            --ow-gap-ic: clamp(18px, calc(-30.00px + 8.00dvh), 26px);
            --ow-cta-pad-y: clamp(10px, calc(-2.00px + 2.00dvh), 12px);
            --ow-cta-size: clamp(13.5px, calc(10.50px + 0.50dvh), 14px);

            --ow2-gap-tc: clamp(8px, calc(-28.00px + 6.00dvh), 14px);
            --ow2-icon-circle: clamp(44px, calc(4.00px + 6.00dvh), 52px);
            --ow2-icon-size: clamp(18px, calc(2.00px + 2.00dvh), 21px);
            --ow2-gap-ict: clamp(8px, calc(-16.00px + 4.00dvh), 12px);
            --ow2-title-size: clamp(18px, calc(-6.00px + 4.00dvh), 21px);
            --ow2-gap-tb: clamp(5px, calc(-1.00px + 1.00dvh), 7px);
            --ow2-body-size: clamp(12px, calc(6.00px + 1.00dvh), 13px);
            --ow2-gap-bf: clamp(12px, calc(-24.00px + 6.00dvh), 18px);
            --ow2-field-pad-y: clamp(9px, calc(-3.00px + 2.00dvh), 11px);
            --ow2-field-size: clamp(13px, calc(10.00px + 0.50dvh), 13.5px);
            --ow2-row-icon: clamp(14px, calc(2.00px + 2.00dvh), 16px);
            --ow2-row-sub-size: clamp(11px, calc(6.50px + 0.75dvh), 11.5px);
            --ow2-gap-lf: clamp(5px, calc(-7.00px + 2.00dvh), 7px);
            --ow2-cta-pad-y: clamp(10px, calc(-2.00px + 2.00dvh), 12px);
            --ow2-cta-size: clamp(13.5px, calc(10.50px + 0.50dvh), 14px);
          }
        }
        .ow-spin { animation: ow-spin-rotate 0.9s linear infinite; }
        @keyframes ow-spin-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
