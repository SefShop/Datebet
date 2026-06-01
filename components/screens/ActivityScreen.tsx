'use client'

import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { ACTIVITY_FEED } from '@/lib/activity'
import { ActivityEvent } from '@/types'

const URGENCY_DOT: Record<ActivityEvent['urgency'], string> = {
  high: '#fd297b',
  mid:  '#ff8c42',
  low:  '#6c63ff',
}

const URGENCY_GLOW: Record<ActivityEvent['urgency'], string> = {
  high: 'rgba(253,41,123,0.12)',
  mid:  'rgba(255,140,66,0.08)',
  low:  'rgba(109,99,255,0.08)',
}

export default function ActivityScreen() {
  const { navigate, resetGame } = useApp()
  const [feed, setFeed] = useState(ACTIVITY_FEED)
  const [visible, setVisible] = useState(true)

  const markSeen = (id: string) => {
    setFeed(prev => prev.map(e => e.id === id ? { ...e, seen: true } : e))
  }

  const handleTap = (event: ActivityEvent) => {
    markSeen(event.id)
    // Route to game for action-oriented events
    if (['waiting_to_play', 'incomplete_game', 'played_your_vibe', 'answered_question'].includes(event.type)) {
      resetGame()
      navigate('game')
    }
  }

  const unseen = feed.filter(e => !e.seen).length

  return (
    <div className="flex flex-col h-full"
      style={{ background: 'linear-gradient(170deg, #0a0a10 0%, #100814 60%, #080a14 100%)' }}>

      {/* Header */}
      <div className="px-6 pt-14 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate('home')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[18px]
              active:scale-90 transition-transform cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ←
          </button>
          {unseen > 0 && (
            <div className="text-[12px] font-bold px-3 py-1.5 rounded-full cursor-pointer active:opacity-60"
              style={{ background: 'rgba(253,41,123,0.12)', color: '#fd297b', border: '1px solid rgba(253,41,123,0.2)' }}
              onClick={() => setFeed(f => f.map(e => ({ ...e, seen: true })))}>
              mark all read
            </div>
          )}
        </div>

        <div className="mt-5">
          <div className="text-[28px] font-extrabold text-white tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            activity
          </div>
          <div className="text-[14px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {unseen > 0
              ? <>{unseen} things happened while you were gone.</>
              : <>you're all caught up. for now.</>
            }
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Section: unread */}
        {feed.some(e => !e.seen) && (
          <>
            <div className="text-[10px] font-bold tracking-[2px] uppercase mb-3 mt-1"
              style={{ color: 'rgba(255,255,255,0.2)' }}>new</div>
            {feed.filter(e => !e.seen).map((event, i) => (
              <ActivityCard key={event.id} event={event} onTap={handleTap} delay={i * 60} />
            ))}
          </>
        )}

        {/* Section: earlier */}
        {feed.some(e => e.seen) && (
          <>
            <div className="text-[10px] font-bold tracking-[2px] uppercase mb-3 mt-5"
              style={{ color: 'rgba(255,255,255,0.12)' }}>earlier</div>
            {feed.filter(e => e.seen).map((event, i) => (
              <ActivityCard key={event.id} event={event} onTap={handleTap} delay={i * 40} dimmed />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ── Activity Card ─────────────────────────────────────────────

interface CardProps {
  event: ActivityEvent
  onTap: (e: ActivityEvent) => void
  delay?: number
  dimmed?: boolean
}

function ActivityCard({ event, onTap, delay = 0, dimmed = false }: CardProps) {
  const [pressed, setPressed] = useState(false)
  const isActionable = ['waiting_to_play', 'incomplete_game', 'played_your_vibe', 'answered_question'].includes(event.type)
  const dotColor  = URGENCY_DOT[event.urgency]
  const glowColor = URGENCY_GLOW[event.urgency]

  return (
    <div
      onClick={() => onTap(event)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="flex items-start gap-3.5 rounded-2xl p-4 mb-2.5 cursor-pointer transition-all"
      style={{
        background: dimmed
          ? 'rgba(255,255,255,0.02)'
          : event.seen ? 'rgba(255,255,255,0.03)' : glowColor,
        border: dimmed
          ? '1px solid rgba(255,255,255,0.04)'
          : event.seen
            ? '1px solid rgba(255,255,255,0.06)'
            : `1px solid ${dotColor}30`,
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        opacity: dimmed ? 0.55 : 1,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-[22px]"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {event.emoji}
        </div>
        {/* Urgency dot */}
        {!event.seen && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{
              background: dotColor,
              borderColor: '#0a0a10',
              boxShadow: `0 0 6px ${dotColor}`,
            }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold leading-tight mb-1"
          style={{
            color: dimmed ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.92)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
          {event.headline}
        </div>
        <div className="text-[12px] leading-snug"
          style={{ color: dimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.38)' }}>
          {event.sub}
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {event.timestamp}
        </div>
        {isActionable && !dimmed && (
          <div className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              background: `${dotColor}18`,
              color: dotColor,
              border: `1px solid ${dotColor}30`,
            }}>
            tap →
          </div>
        )}
      </div>
    </div>
  )
}
