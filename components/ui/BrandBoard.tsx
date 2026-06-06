'use client'
import { useState, useEffect } from 'react'

interface Props {
  size?: number        // cell size in px
  showHearts?: boolean // burst hearts from win line
  animate?: boolean    // stagger entrance
  glow?: boolean       // neon glow intensity
  mini?: boolean       // compact mode for inline use
}

// The iconic DateDuel board: X wins the diagonal ↘
const CELLS = ['X','','O', '','X','', 'O','','X']
const WIN_LINE = [0, 4, 8]  // diagonal win

export default function BrandBoard({ size = 64, showHearts = true, animate = true, glow = true, mini = false }: Props) {
  const [step, setStep] = useState(animate ? 0 : 9)
  const [heartsVisible, setHearts] = useState(false)
  const gap = mini ? 2 : 4
  const radius = mini ? 8 : 12
  const fontSize = size * 0.44

  useEffect(() => {
    if (!animate) return
    const timers: ReturnType<typeof setTimeout>[] = []
    CELLS.forEach((_, i) => {
      if (CELLS[i]) timers.push(setTimeout(() => setStep(s => Math.max(s, i + 1)), 300 + i * 120))
    })
    if (showHearts) timers.push(setTimeout(() => setHearts(true), 300 + 9 * 120 + 400))
    return () => timers.forEach(clearTimeout)
  }, [animate, showHearts])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Glow behind board */}
      {glow && (
        <div style={{ position: 'absolute', inset: mini ? -15 : -30, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,41,123,0.15) 0%, rgba(108,99,255,0.08) 40%, transparent 70%)',
          filter: `blur(${mini ? 12 : 24}px)`, pointerEvents: 'none', animation: 'boardGlow 3s ease-in-out infinite alternate' }} />
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap, position: 'relative', zIndex: 1 }}>
        {CELLS.map((cell, i) => {
          const isWin = WIN_LINE.includes(i)
          const visible = !animate || step > i
          return (
            <div key={i} style={{
              width: size, height: size,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isWin && visible && cell ? 'rgba(253,41,123,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isWin && visible && cell ? 'rgba(253,41,123,0.25)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: radius,
              transition: 'all 0.4s ease',
            }}>
              {cell && visible && (
                <span style={{
                  fontSize, fontWeight: 900, lineHeight: 1,
                  color: cell === 'X' ? '#fd297b' : '#6c63ff',
                  textShadow: `0 0 ${mini ? 8 : 20}px ${cell === 'X' ? 'rgba(253,41,123,0.6)' : 'rgba(108,99,255,0.6)'}`,
                  animation: animate ? `cellReveal 0.4s cubic-bezier(0.34,1.56,0.64,1) both` : 'none',
                }}>
                  {cell === 'X' ? '✕' : '○'}
                </span>
              )}
            </div>
          )
        })}

        {/* Win line glow overlay */}
        {step >= 9 && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: size, height: size,
            background: 'transparent',
            pointerEvents: 'none',
            zIndex: 2,
          }}>
            <svg width={size * 3 + gap * 2} height={size * 3 + gap * 2}
              style={{ position: 'absolute', top: 0, left: 0 }}>
              <line
                x1={size * 0.5} y1={size * 0.5}
                x2={size * 2.5 + gap * 2} y2={size * 2.5 + gap * 2}
                stroke="#fd297b" strokeWidth={mini ? 2 : 3} strokeLinecap="round"
                opacity={0.6}
                style={{ filter: `drop-shadow(0 0 ${mini ? 4 : 10}px rgba(253,41,123,0.8))`,
                         animation: 'lineGlow 2s ease-in-out infinite alternate' }}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Heart burst from win cells */}
      {showHearts && heartsVisible && WIN_LINE.map((cellIdx, hi) => {
        const row = Math.floor(cellIdx / 3)
        const col = cellIdx % 3
        const cx = col * (size + gap) + size / 2
        const cy = row * (size + gap) + size / 2
        return Array.from({ length: 3 }).map((_, pi) => (
          <div key={`${hi}-${pi}`} style={{
            position: 'absolute', left: cx, top: cy,
            fontSize: 8 + pi * 2, color: '#fd297b',
            opacity: 0, pointerEvents: 'none',
            animation: `heartBurst 1.8s ${hi * 0.2 + pi * 0.15}s ease-out forwards`,
            zIndex: 3,
          }}>♥</div>
        ))
      })}

      <style>{`
        @keyframes cellReveal { from{opacity:0;transform:scale(0.3) rotate(-10deg)} to{opacity:1;transform:scale(1) rotate(0)} }
        @keyframes boardGlow { from{opacity:0.6} to{opacity:1} }
        @keyframes lineGlow { from{opacity:0.4} to{opacity:0.8} }
        @keyframes heartBurst {
          0%{opacity:0;transform:translate(-50%,-50%) scale(0)}
          20%{opacity:0.7;transform:translate(-50%,-50%) scale(1.2)}
          100%{opacity:0;transform:translate(calc(-50% + ${Math.random()>0.5?'':'-'}${10+Math.random()*20}px), calc(-50% - ${30+Math.random()*30}px)) scale(0.6)}
        }
      `}</style>
    </div>
  )
}
