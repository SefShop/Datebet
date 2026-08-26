'use client'

import { ReactNode, useLayoutEffect, useRef, useState } from 'react'

// Desktop holding screen — shown only at >= 1024px viewports while
// DateDuel is mobile-first. Purely presentational: no game state, no
// Supabase calls, no auth. Set SHOW_MOBILE_ACCESS_LINKS to true once
// real App Store / Google Play links and a real QR destination exist —
// the panel is already structurally in place, just showing clearly
// non-functional placeholders instead of fake functionality until then.
const SHOW_MOBILE_ACCESS_LINKS = false

const PINK = '#fd297b'
const PURPLE = '#6c63ff'
const GRADIENT = `linear-gradient(135deg, ${PINK} 0%, ${PURPLE} 100%)`
const FONT = "'Plus Jakarta Sans', sans-serif"

// Approved DateDuel brand assets — static PNGs, source of truth for the
// DD mark. Not redrawn/recreated in code; only scaled proportionally.
const LOGO_FULL_SRC = '/brand/dateduel-logo-master.png'   // DD mark + wordmark + tagline
const LOGO_MARK_SRC = '/brand/dateduel-mark-master.png'   // DD mark only
const LOGO_FULL_RATIO = 840 / 636                          // asset's native aspect ratio
const LOGO_MARK_RATIO = 686 / 386

function BrandLogoFull({ height }: { height: number }) {
  return (
    <img
      src={LOGO_FULL_SRC}
      alt="DateDuel — Play · Connect · Match"
      style={{ display: 'block', height, width: height * LOGO_FULL_RATIO, objectFit: 'contain' }}
    />
  )
}

function BrandMark({ height }: { height: number }) {
  return (
    <img
      src={LOGO_MARK_SRC}
      alt="DateDuel"
      style={{ display: 'block', height, width: height * LOGO_MARK_RATIO, objectFit: 'contain' }}
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
function SparkleIcon({ size = 16, color = PURPLE, opacity = 0.85 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z" fill={color} opacity={opacity} />
    </svg>
  )
}

function DiamondIcon({ size = 20, color = PURPLE, opacity = 0.9 }: { size?: number; color?: string; opacity?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" opacity={opacity}><rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth="1.6" transform="rotate(45 12 12)" /></svg>
}

function ChatBubblesIcon({ size = 30, opacity = 0.92 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 30 26" fill="none" opacity={opacity}>
      <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h11A2.5 2.5 0 0 1 18 4.5v6A2.5 2.5 0 0 1 15.5 13H8l-3 3v-3H4.5A2.5 2.5 0 0 1 2 10.5v-6Z"
        stroke={PURPLE} strokeWidth="1.5" fill="rgba(108,99,255,0.1)" />
      <path d="M13 10.5A2.5 2.5 0 0 1 15.5 8h9A2.5 2.5 0 0 1 27 10.5v5A2.5 2.5 0 0 1 24.5 18H23v3l-3-3h-4.5A2.5 2.5 0 0 1 13 15.5v-5Z"
        stroke={PINK} strokeWidth="1.5" fill="rgba(253,41,123,0.1)" />
    </svg>
  )
}

function QuestionMarkIcon({ size = 28, color = PURPLE }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.6" fill="rgba(108,99,255,0.1)" />
      <path d="M9.3 9.5a2.7 2.7 0 1 1 4 2.4c-.9.5-1.3 1-1.3 2" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.3" r="0.9" fill={color} />
    </svg>
  )
}

function CardShapeIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 24 28" fill="none">
      <rect x="2" y="2" width="14" height="20" rx="3" stroke={PURPLE} strokeWidth="1.4" fill="rgba(108,99,255,0.08)" transform="rotate(-10 9 12)" />
      <rect x="8" y="4" width="14" height="20" rx="3" stroke={PINK} strokeWidth="1.4" fill="rgba(253,41,123,0.08)" transform="rotate(8 15 14)" />
      <path d="M11 15.2c-1.6-1.7-.4-3.7 1-3 .5.3.9.9 1 1.4.1-.5.5-1.1 1-1.4 1.4-.7 2.6 1.3 1 3l-2 2-2-2Z" fill={PINK} transform="rotate(8 15 14)" />
    </svg>
  )
}

function SmileNodeIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={PINK} strokeWidth="1.6" fill="rgba(253,41,123,0.1)" />
      <circle cx="8.5" cy="10" r="1.1" fill={PINK} />
      <circle cx="15.5" cy="10" r="1.1" fill={PINK} />
      <path d="M8 14.5c1.1 1.3 2.6 2 4 2s2.9-.7 4-2" stroke={PINK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

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

function HamburgerIcon({ color = 'rgba(255,255,255,0.88)' }: { color?: string }) {
  return (
    <svg width="20" height="14" viewBox="0 0 24 16" fill="none">
      <rect y="0" width="24" height="2.4" rx="1.2" fill={color} />
      <rect y="6.8" width="24" height="2.4" rx="1.2" fill={color} />
      <rect y="13.6" width="24" height="2.4" rx="1.2" fill={color} />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2.5h16L18 16Z" stroke="rgba(255,255,255,0.88)" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <path d="M9.5 20.5a2.5 2.5 0 0 0 5 0" stroke="rgba(255,255,255,0.88)" strokeWidth="1.6" />
      <circle cx="18" cy="6" r="4" fill={PINK} />
    </svg>
  )
}

// ── Status bar hardware glyphs ─────────────────────────────────
function SignalIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      <rect x="0" y="7" width="3" height="5" rx="0.6" fill="#fff" />
      <rect x="5" y="4.5" width="3" height="7.5" rx="0.6" fill="#fff" />
      <rect x="10" y="2" width="3" height="10" rx="0.6" fill="#fff" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}
function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <path d="M1 4.5a10 10 0 0 1 14 0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M3.6 7.3a6.3 6.3 0 0 1 8.8 0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="8" cy="10.2" r="1.3" fill="#fff" />
    </svg>
  )
}
function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
      <rect x="0.75" y="0.75" width="20.5" height="10.5" rx="2.6" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <rect x="2.25" y="2.25" width="17.5" height="7.5" rx="1.5" fill="#fff" />
      <rect x="22" y="4" width="2" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
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
  return <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.14)' }} />
}

// ── Orbital neon scene (inside the phone) ──────────────────────
function OrbitScene() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* orbit rings */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '92%', height: '62%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%) rotate(18deg)', width: '68%', height: '92%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '38%', height: '38%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,41,123,0.22) 0%, rgba(108,99,255,0.12) 55%, transparent 75%)', filter: 'blur(2px)' }} />

      {/* center DD mark, anchoring the composition */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
        <BrandMark height={46} />
      </div>

      {/* positioned icons */}
      <div style={{ position: 'absolute', left: '14%', top: '10%' }}><SmileNodeIcon size={34} /></div>
      <div style={{ position: 'absolute', left: '58%', top: '6%' }}><ChatBubblesIcon size={40} /></div>
      <div style={{ position: 'absolute', left: '86%', top: '38%' }}><DiamondIcon size={20} /></div>
      <div style={{ position: 'absolute', left: '10%', top: '58%' }}><QuestionMarkIcon size={28} /></div>
      <div style={{ position: 'absolute', left: '68%', top: '66%' }}><CardShapeIcon size={30} /></div>
      <div style={{ position: 'absolute', left: '30%', top: '2%' }}><SparkleIcon size={11} color={PURPLE} /></div>
      <div style={{ position: 'absolute', left: '4%', top: '32%' }}><SparkleIcon size={9} color={PINK} opacity={0.7} /></div>
      <div style={{ position: 'absolute', left: '92%', top: '8%' }}><SparkleIcon size={10} color={PINK} opacity={0.75} /></div>
      <div style={{ position: 'absolute', left: '44%', top: '82%' }}><SparkleIcon size={12} color={PURPLE} opacity={0.8} /></div>
      <div style={{ position: 'absolute', left: '80%', top: '82%' }}><SparkleIcon size={8} color={PINK} opacity={0.6} /></div>
    </div>
  )
}

function PhonePreview() {
  return (
    <div style={{ position: 'relative' }}>
      {/* neon base ring — crisp gradient ellipse, not a blurred blob */}
      <svg width={470} height={112} viewBox="0 0 470 112" style={{
        position: 'absolute', left: '50%', bottom: -42, transform: 'translateX(-50%)', overflow: 'visible', pointerEvents: 'none',
      }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={PINK} />
            <stop offset="100%" stopColor={PURPLE} />
          </linearGradient>
        </defs>
        <ellipse cx="235" cy="56" rx="220" ry="26" fill="none" stroke="url(#ringGrad)" strokeWidth="10" opacity="0.28" style={{ filter: 'blur(10px)' }} />
        <ellipse cx="235" cy="56" rx="220" ry="26" fill="none" stroke="url(#ringGrad)" strokeWidth="3" opacity="0.95" style={{ filter: 'drop-shadow(0 0 8px rgba(253,41,123,0.6))' }} />
      </svg>

      <div style={{
        position: 'relative',
        width: 430,
        height: 850,
        borderRadius: 54,
        background: 'linear-gradient(165deg, #16161d 0%, #0a0a0e 55%, #060608 100%)',
        border: '2px solid rgba(255,255,255,0.16)',
        boxShadow: '46px 60px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), inset 0 0 0 1px rgba(255,255,255,0.03)',
        padding: '23px 20px',
        overflow: 'hidden',
        transform: 'perspective(1500px) rotateY(-13deg) rotateX(2deg) rotateZ(-0.4deg)',
        transformStyle: 'preserve-3d',
      }}>
        {/* specular edge highlight along the right side, simulating frame depth */}
        <div style={{
          position: 'absolute', top: 14, right: 3, bottom: 14, width: 3, borderRadius: 3,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.35) 100%)',
          opacity: 0.55,
        }} />
        {/* soft top-left glass highlight */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '60%', height: '30%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 128, height: 26, background: '#050508', borderRadius: '0 0 18px 18px',
        }} />

        {/* status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 6px 0', marginBottom: 22 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SignalIcon /><WifiIcon /><BatteryIcon />
          </div>
        </div>

        {/* menu / bell row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', marginBottom: 16 }}>
          <HamburgerIcon />
          <BellIcon />
        </div>

        {/* brand header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><BrandMark height={40} /></div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 25, color: '#fff', letterSpacing: -0.5 }}>
            Date<GradientText>Duel</GradientText>
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: 2.6, color: 'rgba(255,255,255,0.42)', marginTop: 6, fontWeight: 600 }}>
            PLAY &middot; CONNECT &middot; MATCH
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '13px 0 10px' }}>
            <div style={{ height: 1, width: 38, background: 'linear-gradient(90deg, transparent, rgba(253,41,123,0.45))' }} />
            <HeartOutline size={12} />
            <div style={{ height: 1, width: 38, background: 'linear-gradient(90deg, rgba(108,99,255,0.45), transparent)' }} />
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)' }}>
            Fun games, <GradientText style={{ fontWeight: 700 }}>real</GradientText> connections.
          </div>
        </div>

        {/* orbital scene */}
        <div style={{ position: 'relative', height: 400, marginTop: 20 }}>
          <OrbitScene />
        </div>
      </div>
    </div>
  )
}

function MobileAccessPanel() {
  return (
    <div style={{
      width: 228,
      borderRadius: 24,
      border: `1px solid rgba(253,41,123,0.35)`,
      background: 'linear-gradient(180deg, rgba(253,41,123,0.07) 0%, rgba(108,99,255,0.07) 100%)',
      boxShadow: '0 0 40px rgba(253,41,123,0.07)',
      padding: '26px 20px',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <MonitorHeartIcon size={27} />
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45 }}>
        Scan to get<br /><GradientText style={{ fontWeight: 700 }}>DateDuel</GradientText><br />on your phone
      </div>

      {SHOW_MOBILE_ACCESS_LINKS ? (
        <div style={{ marginTop: 18 }}>
          {/* Real QR code + App Store / Google Play badges go here once
              real download links exist. */}
        </div>
      ) : (
        <>
          {/* Non-functional QR placeholder — a scan-frame outline on a
              light tile (matching the reference's bright QR silhouette),
              not a real or invented scannable pattern, so nothing here
              could be mistaken for a working code. */}
          <div style={{
            marginTop: 18, width: 154, height: 154, marginLeft: 'auto', marginRight: 'auto',
            borderRadius: 12, background: 'rgba(255,255,255,0.94)',
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {[['4px', '4px', '0', '0'], ['4px', '0', '0', '4px'], ['0', '4px', '4px', '0']].map(([t, r, b, l], i) => (
              <div key={i} style={{
                position: 'absolute',
                top: i === 0 || i === 2 ? 10 : undefined,
                bottom: i === 1 ? 10 : undefined,
                left: i === 0 || i === 1 ? 10 : undefined,
                right: i === 2 ? 10 : undefined,
                width: 22, height: 22,
                borderTop: t !== '0' ? `2.5px solid ${PURPLE}` : 'none',
                borderRight: r !== '0' ? `2.5px solid ${PURPLE}` : 'none',
                borderBottom: b !== '0' ? `2.5px solid ${PURPLE}` : 'none',
                borderLeft: l !== '0' ? `2.5px solid ${PURPLE}` : 'none',
                opacity: 0.75,
              }} />
            ))}
            <span style={{ fontSize: 10.5, letterSpacing: 1.4, color: 'rgba(20,20,26,0.55)', fontWeight: 700, textTransform: 'uppercase' }}>
              QR soon
            </span>
          </div>

          {/* Non-functional store badge placeholders — deliberately not a
              replica of the official Apple/Google artwork, and not links,
              since there is no real destination yet. */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              { glyph: '', label: 'App Store' },
              { glyph: '▶', label: 'Google Play' },
            ].map((s) => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 13, padding: '10px 12px',
              }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{s.glyph}</span>
                <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{s.label}</span>
                <span style={{
                  fontSize: 8.5, letterSpacing: 0.6, fontWeight: 700, textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 5, padding: '1.5px 4px', marginLeft: 2,
                }}>soon</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Shrinks the hero row (left column + phone + right panel) down — never
// up past its natural size — so the whole hero plus footer always fits
// inside one viewport with no vertical/horizontal scroll, on any of the
// desktop sizes this screen is gated to render at. Pure measure-and-scale:
// no element's own layout/spacing changes, so the approved design is
// preserved exactly, just uniformly smaller on shorter viewports.
function useFitScale() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    const content = contentRef.current
    if (!wrapper || !content) return

    const recompute = () => {
      const cw = content.offsetWidth
      const ch = content.offsetHeight
      if (!cw || !ch) return
      const availW = wrapper.clientWidth
      const availH = wrapper.clientHeight
      setScale(Math.min(1, availW / cw, availH / ch))
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(wrapper)
    ro.observe(content)
    window.addEventListener('resize', recompute)
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute) }
  }, [])

  return { wrapperRef, contentRef, scale }
}

export default function DesktopComingSoon() {
  const { wrapperRef, contentRef, scale } = useFitScale()
  return (
    <>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap" rel="stylesheet" />
    {/* 100dvh (dynamic viewport height) overrides 100vh where supported,
        so mobile/desktop browser chrome resizing can't reintroduce a
        scrollbar; 100vh is the safe fallback everywhere else. */}
    <style>{`.dd-desktop-hero { height: 100vh; height: 100dvh; }`}</style>
    <main className="dd-desktop-hero" style={{
      width: '100%',
      background: '#030304',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: FONT,
    }}>
      {/* Ambient background glow — subtle, localized, no hard gradient
          boundaries, matching the reference's near-black base. */}
      <div style={{
        position: 'absolute', top: '-6%', left: '-6%', width: '46%', height: '62%',
        background: `radial-gradient(circle, rgba(253,41,123,0.14) 0%, transparent 68%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-8%', width: '52%', height: '72%',
        background: `radial-gradient(circle, rgba(108,99,255,0.16) 0%, transparent 68%)`,
        pointerEvents: 'none',
      }} />

      {/* Available space for the hero row, after the footer's own flow
          height is subtracted by the flex column above — this is what
          useFitScale measures against. */}
      <div ref={wrapperRef} style={{
        position: 'relative', flex: '1 1 auto', minHeight: 0, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: '12px 32px',
      }}>
      <div ref={contentRef} style={{
        position: 'relative',
        width: '100%',
        maxWidth: 1260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 44,
        flexWrap: 'wrap',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}>
        {/* Left column — brand + message */}
        <div style={{ flex: '1 1 400px', minWidth: 320, maxWidth: 480 }}>
          {/* Full approved logo asset (DD mark + DateDuel wordmark + tagline)
              used as a single unit — not rebuilt from text/SVG here, so it
              can never drift from the approved artwork. */}
          <BrandLogoFull height={190} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ height: 1, width: 52, background: 'linear-gradient(90deg, transparent, rgba(253,41,123,0.5))' }} />
            <HeartOutline size={15} />
            <div style={{ height: 1, width: 52, background: 'linear-gradient(90deg, rgba(108,99,255,0.5), transparent)' }} />
          </div>

          <div style={{ fontWeight: 800, fontSize: 30, color: '#fff', lineHeight: 1.15 }}>
            Desktop experience
          </div>
          <div style={{ fontSize: 42, lineHeight: 1, marginTop: 4, position: 'relative', display: 'inline-block' }}>
            <GradientText style={{ fontFamily: "'Caveat', cursive", fontWeight: 700 }}>coming soon!</GradientText>
            {/* Short hand-drawn brush stroke under the right portion of the
                phrase only — not a full-width text-decoration underline. */}
            <svg width="92" height="14" viewBox="0 0 92 14" style={{ position: 'absolute', right: -4, bottom: -6, overflow: 'visible' }}>
              <defs>
                <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={PINK} />
                  <stop offset="100%" stopColor={PURPLE} />
                </linearGradient>
              </defs>
              <path d="M2 8 C 22 2, 45 12, 90 4" stroke="url(#strokeGrad)" strokeWidth="4" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          <div style={{ display: 'flex', margin: '22px 0 2px' }}>
            <MonitorHeartIcon size={24} />
          </div>

          <div style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.72)', marginTop: 12, lineHeight: 1.55, maxWidth: 400 }}>
            For the best <GradientText style={{ fontWeight: 700 }}>DateDuel</GradientText> experience,<br />continue on your phone.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
            <SocialIcon>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke={PINK} strokeWidth="1.7" /><circle cx="12" cy="12" r="4" stroke={PINK} strokeWidth="1.7" /><circle cx="17.2" cy="6.8" r="1.1" fill={PINK} /></svg>
            </SocialIcon>
            <SocialDivider />
            <SocialIcon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M16 3c.3 2 1.7 3.6 4 3.9v3c-1.5 0-2.9-.5-4-1.3v6.1a5.3 5.3 0 1 1-5.3-5.3c.3 0 .6 0 .9.1v3.1a2.2 2.2 0 1 0 1.5 2.1V3H16Z" stroke={PINK} strokeWidth="1.5" fill="none" strokeLinejoin="round" /></svg>
            </SocialIcon>
            <SocialDivider />
            <SocialIcon>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5" width="19" height="14" rx="3" stroke={PINK} strokeWidth="1.7" /><path d="M10 9.5l5 2.5-5 2.5v-5Z" fill={PINK} /></svg>
            </SocialIcon>
          </div>
        </div>

        {/* Center — phone preview */}
        <div style={{ flex: '0 0 auto' }}>
          <PhonePreview />
        </div>

        {/* Right — mobile access panel */}
        <div style={{ flex: '0 0 auto', alignSelf: 'center' }}>
          <MobileAccessPanel />
        </div>
      </div>
      </div>

      {/* Footer lives in normal flex flow (not absolutely positioned), so
          the column layout above always reserves its height and it can
          never sit below the fold or collide with scaled-down content. */}
      <div style={{
        flexShrink: 0, width: '100%',
        textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.32)',
        padding: '4px 0 14px',
      }}>
        &copy; {new Date().getFullYear()} <span style={{ color: PINK }}>DateDuel</span>. All rights reserved.
      </div>
    </main>
    </>
  )
}
