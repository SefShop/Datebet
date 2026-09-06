'use client'

interface Props {
  /** Called when "Let's go!" is pressed. The locked onboarding sequence is
   * Welcome (this screen, Step 1) → About You (2) → Who You're Interested
   * In (3) → Location + Interests (4) → Photos (5) → About You/Bio (6) →
   * Preferences (7) — authentication happens before onboarding and is not
   * one of these steps. Step 2 (About You) does not exist in this codebase
   * yet, so this prop is currently wired (outside this component) to a
   * temporary placeholder for localhost integration testing only — NOT the
   * final destination. It never writes onboarding_completed or any
   * onboarding-progress field, and never fakes completion. */
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
// locked 7-step sequence is: 1 Welcome, 2 About You, 3 Who You're
// Interested In, 4 Location + Interests, 5 Photos, 6 About You (Bio), 7
// Preferences.
const CURRENT_STEP_INDEX = 0

export default function OnboardingWelcomeScreen({ onNext }: Props) {
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

        {/* ── Top: step badge + 7-segment progress indicator. Pinned near
            the top via normal flow (NOT part of the centered block below)
            so it always sits at a fixed, predictable position regardless
            of how much spare height the centered content leaves — exactly
            matching the MASTER, where the progress row never drifts. ── */}
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

        {/* ── Everything else fills the remaining height. On spacious
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
            and inter-section gaps instead of sitting empty. ── */}
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

          {/* CTA */}
          <button onClick={onNext}
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
          {/* The 18+ notice, Terms/Privacy paragraph, and "Already have an
              account? Log in" row that used to live here have been
              removed: this screen is now reached AFTER the Sign In / Sign
              Up auth flow, where that legal copy and login path are
              already handled. Repeating them here would duplicate what
              the user just went through. "Let's go!" is now the final
              element of the composition; the space they used to occupy
              was redistributed into the gaps above (see the CSS vars
              below) plus a deliberately generous closing margin under the
              button, rather than left as a single dead block. */}
        </div>
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
             clips even at 375x667. */
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
          }
        }
      `}</style>
    </div>
  )
}
