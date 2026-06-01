'use client'

import { PresenceEvent } from '@/lib/presence'

interface SofiaAvatarProps {
  event: PresenceEvent | null
  locked: boolean
}

export default function SofiaAvatar({ event, locked }: SofiaAvatarProps) {
  const pulse  = event?.avatarPulse ?? 'none'
  const glow   = locked ? 'rgba(253,41,123,0.9)' : (event?.avatarGlow ?? 'rgba(109,99,255,0.3)')
  const status = event?.status

  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>

      {/* Outer glow ring — breathes when active */}
      {pulse !== 'none' && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: pulse === 'strong' ? -14 : -8,
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
            animation: pulse === 'strong'
              ? 'breatheStrong 1.2s ease-in-out infinite'
              : 'breatheSoft 2.2s ease-in-out infinite',
            transition: 'all 0.6s ease',
          }}
        />
      )}

      {/* Ripple ring — only on strong pulse */}
      {pulse === 'strong' && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -4,
            border: `1.5px solid ${glow}`,
            animation: 'ripple 1.6s ease-out infinite',
          }}
        />
      )}

      {/* Avatar circle */}
      <div
        className="w-[64px] h-[64px] rounded-full flex items-center justify-center text-[28px] relative z-10"
        style={{
          background: locked
            ? `linear-gradient(135deg, #fd297b33, #ff655b22)`
            : `linear-gradient(135deg, #6c63ff22, #a855f722)`,
          border: `2px solid ${glow}`,
          boxShadow: pulse !== 'none' ? `0 0 20px ${glow}` : 'none',
          transition: 'border-color 0.6s ease, box-shadow 0.6s ease',
          animation: status === 'typing'
            ? 'nudge 0.4s ease-in-out infinite alternate'
            : status === 'hesitating'
            ? 'drift 4s ease-in-out infinite'
            : 'float 3s ease-in-out infinite',
        }}
      >
        👩
      </div>

      {/* Typing dots — overlaid bottom center */}
      {status === 'typing' && (
        <div
          className="absolute -bottom-2 left-1/2 flex gap-1 items-center px-2 py-1 rounded-full z-20"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(253,41,123,0.9)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-white"
              style={{ animation: `typingDot 0.9s ease-in-out ${i * 0.22}s infinite` }}
            />
          ))}
        </div>
      )}

      {/* Lock badge */}
      {locked && (
        <div
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[12px] z-20"
          style={{
            background: 'linear-gradient(135deg, #fd297b, #ff655b)',
            boxShadow: '0 2px 8px rgba(253,41,123,0.6)',
            animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          🔒
        </div>
      )}

      <style>{`
        @keyframes breatheSoft {
          0%,100% { opacity:.5; transform:scale(1); }
          50%      { opacity:1;  transform:scale(1.08); }
        }
        @keyframes breatheStrong {
          0%,100% { opacity:.7; transform:scale(1); }
          50%      { opacity:1;  transform:scale(1.15); }
        }
        @keyframes ripple {
          0%   { transform:scale(1);   opacity:.8; }
          100% { transform:scale(1.7); opacity:0; }
        }
        @keyframes float {
          0%,100% { transform:translateY(0) rotate(-0.5deg); }
          50%      { transform:translateY(-3px) rotate(0.5deg); }
        }
        @keyframes drift {
          0%,100% { transform:translateX(0) rotate(-1deg); }
          33%      { transform:translateX(-2px) rotate(0.5deg); }
          66%      { transform:translateX(2px) rotate(-0.5deg); }
        }
        @keyframes nudge {
          from { transform:translateY(0); }
          to   { transform:translateY(-2px); }
        }
        @keyframes typingDot {
          0%,100% { transform:translateY(0); opacity:.5; }
          50%      { transform:translateY(-3px); opacity:1; }
        }
        @keyframes popIn {
          from { transform:scale(0); opacity:0; }
          to   { transform:scale(1); opacity:1; }
        }
      `}</style>
    </div>
  )
}
