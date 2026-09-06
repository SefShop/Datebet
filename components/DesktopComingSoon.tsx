'use client'

import { ReactNode, useLayoutEffect, useRef, useState } from 'react'

// Desktop holding screen — shown only for real desktop/laptop browsers while
// DateDuel is mobile-first. Purely presentational: no game state, no
// Supabase calls, no auth.
//
// ── MASTER-CANVAS ARCHITECTURE ──────────────────────────────────────────
// This screen is built as ONE fixed 1536×1024 design (matching the
// approved MASTER reference image exactly, 3:2), with every element
// positioned in that fixed coordinate space. The whole 1536×1024 stage is
// then scaled UNIFORMLY (one transform: scale(), never independent X/Y
// stretching) to fit whatever the real viewport is, and centered — so the
// relative geometry between every section (left branding, DD logo,
// wordmark, tagline, divider, heading, "coming soon!", monitor icon,
// description, social icons, center phone, phone glow, QR panel, QR code,
// store badges, footer) can never drift apart independently the way a
// flex-wrap/reflow layout would. If the viewport's aspect ratio differs
// from 3:2, unused space is left as black letterbox/pillarbox bars rather
// than distorting the design.
const MASTER_W = 1536
const MASTER_H = 1024

const PINK = '#fd297b'
const PURPLE = '#6c63ff'
const GRADIENT = `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)`
const FONT = "'Plus Jakarta Sans', sans-serif"

// Approved DateDuel brand assets — static PNGs, source of truth for the DD
// mark. Not redrawn/recreated in code; only scaled proportionally.
const LOGO_FULL_SRC = '/brand/dateduel-logo-master.png'   // DD mark + wordmark + tagline
const LOGO_FULL_RATIO = 840 / 636                          // asset's native aspect ratio

// The center phone is NOT CSS-built. Per explicit direction, it is a raster
// crop taken directly from the approved MASTER reference image itself (the
// same pixels — full 3D phone, physical frame, reflections, screen artwork,
// and neon floor glow — cropped straight out of the master canvas), so the
// live page shows the same visual, not a CSS/perspective approximation of
// it. See public/brand/dateduel-desktop-phone-master.png. The crop's edges
// are alpha-feathered (not hard-cut) so it blends into this page's
// near-black background without a visible rectangular seam; the phone,
// frame, and glow ring themselves are fully opaque, untouched pixels from
// the master.
const PHONE_MASTER_SRC = '/brand/dateduel-desktop-phone-master.png'
// Crop box was taken directly from the 1536×1024 MASTER canvas coordinate
// space: left 605, top 20, right 1198, bottom 966 (593×946 native). The
// raster asset itself is untouched — same pixels, same aspect ratio, same
// baked-in angle. Displayed here at a uniform 96% of native size (593×946
// → 569.3×908.2) per a micro-polish request that the phone read as
// slightly less dominant in a real browser; left/top are shifted so the
// displayed image keeps the EXACT SAME VISUAL CENTER (901.5, 493) as the
// original 1:1 placement — a pure uniform scale + recenter, no crop, no
// aspect-ratio change, no CSS 3D transform of any kind.
const PHONE_MASTER_LEFT = 616.9
const PHONE_MASTER_TOP = 38.9
const PHONE_MASTER_W = 569.3
const PHONE_MASTER_H = 908.2

function BrandLogoFull({ height }: { height: number }) {
  return (
    <img
      src={LOGO_FULL_SRC}
      alt="DesireDuel — Play · Connect · Match"
      style={{ display: 'block', height, width: height * LOGO_FULL_RATIO, objectFit: 'contain' }}
    />
  )
}

function GradientText({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      background: GRADIENT,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      ...style,
    }}>
      {children}
    </span>
  )
}

// Abstract, neutral decorative marks — deliberately not tied to any one
// game (no X/O, no four-in-a-row discs, no suited playing cards), so the
// screen stays accurate as more DateDuel games are added later.
function HeartOutline({ size = 14, color = PINK }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4 6 3.2c2.4-.5 4.3.6 6 3 1.7-2.4 3.6-3.5 6-3 4 .8 5.5 4.8 4 8.5C19.5 16.4 12 21 12 21Z" stroke={color} strokeWidth="1.6" fill="none" /></svg>
}

function MonitorHeartIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="4" width="19" height="13" rx="2" stroke={PINK} strokeWidth="1.5" />
      <path d="M9 21h6M12 17v4" stroke={PINK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13.2s-3.6-2.1-3.6-4.6c0-1.3 1-2.1 2-2.1.8 0 1.3.4 1.6.9.3-.5.8-.9 1.6-.9 1 0 2 .8 2 2.1 0 2.5-3.6 4.6-3.6 4.6Z" fill={PINK} />
    </svg>
  )
}

// Right-panel icon — a portrait phone silhouette with a small heart on its
// screen ("get DateDuel on your phone"), distinct from the left section's
// landscape monitor icon.
function PhoneHeartIcon({ width = 34, height = 50 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 34 50" fill="none">
      <rect x="1.5" y="1.5" width="31" height="47" rx="7" stroke={PINK} strokeWidth="2" />
      <rect x="13" y="4.5" width="8" height="2" rx="1" fill={PINK} opacity="0.8" />
      <path d="M17 30.5s-6.5-3.8-6.5-8.3c0-2.3 1.8-4 3.9-4 1.4 0 2.1.7 2.6 1.5.5-.8 1.2-1.5 2.6-1.5 2.1 0 3.9 1.7 3.9 4 0 4.5-6.5 8.3-6.5 8.3Z" fill={PINK} />
    </svg>
  )
}

function SocialIcon({ children }: { children: ReactNode }) {
  return (
    <a href="#" onClick={(e) => e.preventDefault()} aria-hidden="true" tabIndex={-1} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: PINK, cursor: 'default',
    }}>
      {children}
    </a>
  )
}

function SocialDivider() {
  return <div style={{ width: 1, height: 34, background: 'rgba(255,255,255,0.14)' }} />
}

// ── Static, non-functional QR-look graphic ──────────────────────────────
// Deliberately NOT a real QR encoder: per explicit direction, this stays a
// visual-only module grid matching MASTER's density/finder-pattern style
// (no new dependency, no hand-rolled encoder, no source drift beyond this
// file). It encodes nothing and is not scannable — it exists purely so the
// panel's visual hierarchy matches MASTER instead of showing a "QR SOON"
// placeholder tile, and can be swapped for a real generated QR image later
// without touching the surrounding panel layout. Pattern is a fixed
// (seeded) pseudo-random grid, not Math.random(), so it renders identically
// every time rather than flickering between reloads.
function StaticQRGraphic({ size = 178 }: { size?: number }) {
  const GRID = 21
  const cell = size / GRID
  // Deterministic pseudo-random bit per cell (mulberry32-style, fixed seed)
  function bitAt(x: number, y: number) {
    let h = (x * 374761393 + y * 668265263) ^ 0x9e3779b9
    h = (h ^ (h >>> 13)) * 1274126177
    h = h ^ (h >>> 16)
    return (h & 1) === 1
  }
  const FINDER = 7
  function inFinder(x: number, y: number) {
    const zones = [[0, 0], [GRID - FINDER, 0], [0, GRID - FINDER]]
    return zones.some(([zx, zy]) => x >= zx && x < zx + FINDER && y >= zy && y < zy + FINDER)
  }
  function finderCell(x: number, y: number, zx: number, zy: number) {
    const lx = x - zx, ly = y - zy
    const onOuter = lx === 0 || lx === FINDER - 1 || ly === 0 || ly === FINDER - 1
    const onInner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
    return onOuter || onInner
  }
  const cells: ReactNode[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      let on: boolean
      const zones: [number, number][] = [[0, 0], [GRID - FINDER, 0], [0, GRID - FINDER]]
      const zone = zones.find(([zx, zy]) => x >= zx && x < zx + FINDER && y >= zy && y < zy + FINDER)
      if (zone) on = finderCell(x, y, zone[0], zone[1])
      else on = bitAt(x, y)
      if (!on) continue
      cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#12111a" />)
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code placeholder — not a functional code">
      <rect x="0" y="0" width={size} height={size} fill="#ffffff" />
      {cells}
    </svg>
  )
}

function AppleGlyph() {
  return (
    <svg width="19" height="22" viewBox="0 0 19 22" fill="#fff">
      <path d="M15.6 11.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.6.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.8 2.4 3.1 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.7-4.1ZM13.2 4.6c.6-.8 1.1-1.9 1-3-1 .1-2.2.7-2.9 1.5-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.6 2.9-1.4Z" />
    </svg>
  )
}

function GooglePlayGlyph() {
  return (
    <svg width="19" height="21" viewBox="0 0 19 21" fill="none">
      <path d="M1 1.3v18.4c0 .5.3.9.6 1.1l10.4-10.3L1.6.2C1.3.4 1 .8 1 1.3Z" fill="#00D2FF" />
      <path d="M15.6 8.9 12 5.4 1.6.2c-.2-.1-.4-.2-.6-.2L12 11.5l3.6-2.6Z" fill="#00F076" />
      <path d="M12 11.5 1 21.7c.2 0 .4-.1.6-.2L12 16.4l3.6-2.6-3.6-2.3Z" fill="#F73448" />
      <path d="M18.1 9.8 15.6 8.3 12 11.5l3.6 3.6 2.5-1.5c.9-.5.9-1.8 0-2.3Z" fill="#FFCF00" />
    </svg>
  )
}

function AppStoreBadge({ width = 207, height = 66 }: { width?: number; height?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 12, background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.16)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11,
    }}>
      <AppleGlyph />
      <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.82)' }}>Download on the</div>
        <div style={{ fontSize: 19, color: '#fff', fontWeight: 700, fontFamily: FONT, letterSpacing: -0.3 }}>App Store</div>
      </div>
    </div>
  )
}

function GooglePlayBadge({ width = 207, height = 67 }: { width?: number; height?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 12, background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.16)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11,
    }}>
      <GooglePlayGlyph />
      <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
        <div style={{ fontSize: 9.5, letterSpacing: 0.6, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' }}>Get it on</div>
        <div style={{ fontSize: 17.5, color: '#fff', fontWeight: 700, fontFamily: FONT, letterSpacing: -0.2 }}>Google Play</div>
      </div>
    </div>
  )
}

// Right panel — pink/violet rounded border, dark translucent interior,
// phone-heart icon, "Scan to get DateDuel on your phone", QR block (see
// StaticQRGraphic — visual-only, per explicit direction, not a functional
// code and not a real destination), App Store / Google Play badges below.
// Larger than the previous implementation, matching MASTER's proportions.
function MobileAccessPanel() {
  return (
    <div style={{
      width: 270,
      height: 655,
      borderRadius: 26,
      border: `1.5px solid rgba(253,41,123,0.4)`,
      background: 'linear-gradient(180deg, rgba(253,41,123,0.08) 0%, rgba(108,99,255,0.08) 100%)',
      boxShadow: '0 0 56px rgba(253,41,123,0.09)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '31px 24px 0',
      boxSizing: 'border-box',
      textAlign: 'center',
    }}>
      <PhoneHeartIcon width={46} height={68} />

      <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.88)', lineHeight: 1.25, marginTop: 24 }}>
        Scan to get
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15, marginTop: 8 }}>
        <GradientText>DesireDuel</GradientText>
      </div>
      <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.88)', lineHeight: 1.25, marginTop: 8 }}>
        on your phone
      </div>

      {/* QR block — visual-only placeholder module grid (see note on
          StaticQRGraphic above), isolated in its own tile so a real,
          generated QR image can be dropped in later without any other
          change to this panel. */}
      <div style={{
        marginTop: 18, width: 222, height: 222,
        borderRadius: 16, background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      }}>
        <StaticQRGraphic size={188} />
      </div>

      <div style={{ marginTop: 16 }}><AppStoreBadge /></div>
      <div style={{ marginTop: 10 }}><GooglePlayBadge /></div>
    </div>
  )
}

// Measures the available viewport and computes the single uniform scale
// factor for the fixed 1536×1024 master stage — min(availW/1536,
// availH/1024), i.e. CSS `contain` behavior. Applied as one transform:
// scale() on the whole stage, never on individual elements, so the
// composition's internal geometry is invariant across every viewport size.
function useStageScale() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const recompute = () => {
      const availW = wrapper.clientWidth
      const availH = wrapper.clientHeight
      if (!availW || !availH) return
      setScale(Math.min(availW / MASTER_W, availH / MASTER_H))
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(wrapper)
    window.addEventListener('resize', recompute)
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute) }
  }, [])

  return { wrapperRef, scale }
}

export default function DesktopComingSoon() {
  const { wrapperRef, scale } = useStageScale()
  return (
    <>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap" rel="stylesheet" />
    {/* 100dvh (dynamic viewport height) overrides 100vh where supported, so
        browser-chrome resizing can't reintroduce a scrollbar; 100vh is the
        safe fallback everywhere else. */}
    <style>{`.dd-desktop-hero { height: 100vh; height: 100dvh; }`}</style>
    <main ref={wrapperRef} className="dd-desktop-hero" style={{
      width: '100vw',
      height: '100dvh',
      background: '#030304',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
    }}>
      {/* Ambient background glow — subtle, localized blue/violet, near-black
          base, no hard gradient boundaries — matches MASTER's cinematic,
          not-flat feel. Sits behind the stage, unaffected by its scale. */}
      <div style={{
        position: 'absolute', top: '10%', left: '30%', width: '55%', height: '65%',
        background: `radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', right: '5%', width: '45%', height: '55%',
        background: `radial-gradient(circle, rgba(253,41,123,0.08) 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* ── FIXED 1536×1024 MASTER STAGE ──
          Every child below is positioned with absolute left/top/width in
          this fixed coordinate space (measured directly off the approved
          MASTER image). The whole stage is scaled as ONE unit and
          centered; nothing inside ever reflows independently. */}
      <div style={{
        position: 'relative',
        width: MASTER_W,
        height: MASTER_H,
        flexShrink: 0,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>

        {/* ── LEFT BRAND AREA (master x:90–580, y:90–905) — MASTER is
            CENTER-aligned within this column (measured: every line's
            horizontal center sits within a few px of x≈345), not
            left-aligned like the previous implementation. ── */}
        <div style={{
          position: 'absolute', left: 90, top: 90, width: 500,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center',
        }}>
          {/* Single approved asset (DD mark + DateDuel wordmark + tagline)
              — not rebuilt from text/SVG, so it can never drift from the
              approved artwork. Scaled to match MASTER's measured
              mark+wordmark+tagline block height (~305px). */}
          <div style={{ marginTop: 8 }}><BrandLogoFull height={305} /></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 31 }}>
            <div style={{ height: 1, width: 145, background: 'linear-gradient(90deg, transparent, rgba(253,41,123,0.5))' }} />
            <HeartOutline size={24} />
            <div style={{ height: 1, width: 145, background: 'linear-gradient(90deg, rgba(108,99,255,0.5), transparent)' }} />
          </div>

          <div style={{ fontWeight: 800, fontSize: 42, color: '#fff', lineHeight: 1.15, marginTop: 21 }}>
            Desktop experience
          </div>
          <div style={{ fontSize: 74, lineHeight: 1, marginTop: 6, position: 'relative', display: 'inline-block' }}>
            <GradientText style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}>coming soon!</GradientText>
            {/* Short hand-drawn brush stroke under the right portion of the
                phrase only — not a full-width text-decoration underline. */}
            <svg width="161" height="25" viewBox="0 0 161 25" style={{ position: 'absolute', right: -7, bottom: -11, overflow: 'visible' }}>
              <defs>
                <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={PINK} />
                  <stop offset="100%" stopColor={PURPLE} />
                </linearGradient>
              </defs>
              <path d="M4 13 C 38 4, 79 21, 157 7" stroke="url(#strokeGrad)" strokeWidth="6.8" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <div style={{ display: 'flex', marginTop: 38 }}>
            <MonitorHeartIcon size={52} />
          </div>

          <div style={{ fontSize: 21, color: 'rgba(255,255,255,0.72)', marginTop: 30, lineHeight: 1.55, maxWidth: 480 }}>
            For the best <GradientText style={{ fontWeight: 700 }}>DesireDuel</GradientText> experience,<br />continue on your phone.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 26, marginTop: 50 }}>
            <SocialIcon>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke={PINK} strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke={PINK} strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill={PINK} /></svg>
            </SocialIcon>
            <SocialDivider />
            <SocialIcon>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M16 3c.3 2 1.7 3.6 4 3.9v3c-1.5 0-2.9-.5-4-1.3v6.1a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v3.1a2.2 2.2 0 1 0 1.5 2.1V3H16Z" stroke={PINK} strokeWidth="1.5" fill="none" strokeLinejoin="round" /></svg>
            </SocialIcon>
            <SocialDivider />
            <SocialIcon>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="19" height="14" rx="3" stroke={PINK} strokeWidth="1.7" /><path d="M10 9.5l5 2.5-5 2.5v-5Z" fill={PINK} /></svg>
            </SocialIcon>
          </div>
        </div>

        {/* ── CENTER PHONE — raster crop taken directly from the approved
            MASTER image (see PHONE_MASTER_* constants above), NOT a CSS/
            perspective approximation. Placed at the exact left/top it was
            cropped from in the master's own 1536×1024 coordinate space, so
            it reproduces the master's phone position, tilt, frame, and
            neon glow pixel-for-pixel. Only uniform sizing/positioning is
            applied here — no additional rotation/perspective transform is
            layered on top of the asset. */}
        <img
          src={PHONE_MASTER_SRC}
          alt="DesireDuel app preview on phone"
          style={{
            position: 'absolute',
            left: PHONE_MASTER_LEFT,
            top: PHONE_MASTER_TOP,
            width: PHONE_MASTER_W,
            height: PHONE_MASTER_H,
            display: 'block',
            pointerEvents: 'none',
          }}
        />

        {/* ── RIGHT DOWNLOAD PANEL (master x:1206–1476, y:165–820) ── */}
        <div style={{ position: 'absolute', left: 1206, top: 165 }}>
          <MobileAccessPanel />
        </div>

        {/* ── FOOTER (bottom-centered, master y≈969–988) ── */}
        <div style={{
          position: 'absolute', left: 0, top: 967, width: MASTER_W,
          textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.32)',
        }}>
          &copy; {new Date().getFullYear()} <span style={{ color: PINK }}>DesireDuel</span>. All rights reserved.
        </div>
      </div>
    </main>
    </>
  )
}
