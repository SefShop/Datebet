'use client'
import { useState } from 'react'
import { useApp } from '@/lib/AppContext'
import { BET_AMOUNTS } from '@/lib/data'
import { getCurrentMatch } from '@/lib/profiles'
import { APP_COPY } from '@/lib/copy'

export default function BetScreen() {
  const { navigate, game, bet, setBetAmount, commitBet, lang } = useApp()
  const t = APP_COPY[lang]
  const [pulse, setPulse] = useState(false)

  const handleCommit = () => {
    setPulse(true)
    setTimeout(() => { setPulse(false); commitBet() }, 600)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'linear-gradient(170deg, #0a0a10 0%, #100814 60%, #080a14 100%)' }}>

      <div className="flex justify-between px-7 pt-4 text-[13px] font-semibold flex-shrink-0"
        style={{ color: 'rgba(255,255,255,0.25)' }}>
        <span>9:41</span><span>●●● 100%</span>
      </div>

      <div className="px-6 pt-3 pb-0 flex-shrink-0">
        <button onClick={() => navigate('result')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] active:scale-90 transition-transform cursor-pointer"
          style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.08)' }}>
          ←
        </button>

        {/* Profile */}
        <div className="flex items-center gap-4 mt-6 mb-2">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2d1b2e] to-[#1a1040]
            flex items-center justify-center text-[28px] ring-2 ring-white/10">
            {"🎮"}
          </div>
          <div className="flex-1">
            <div className="text-[24px] font-extrabold text-white tracking-tight"
              style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{(getCurrentMatch()?.name || "Player")}</div>
            <div className="text-[12px]" style={{ color:'rgba(255,255,255,0.3)' }}>
              {(getCurrentMatch()?.location?.en || "")} · {""}
            </div>
          </div>
          <div className="text-[13px] font-bold px-3 py-1.5 rounded-full"
            style={{ background:'rgba(253,41,123,0.12)', color:'#fd297b', border:'1px solid rgba(253,41,123,0.2)' }}>
            ⚡ {game.compatibilityScore || "85"}%
          </div>
        </div>

        <p className="text-[14px] leading-relaxed mb-0 mt-3"
          style={{ color:'rgba(255,255,255,0.4)', fontFamily:"'Plus Jakarta Sans',sans-serif", whiteSpace:'pre-line' }}>
          {t.bet.backHint}
        </p>
      </div>

      {/* Credit stake selector */}
      <div className="px-6 mt-6 flex-shrink-0">
        <div className="text-[10px] font-bold tracking-[2px] uppercase mb-3"
          style={{ color:'rgba(255,255,255,0.25)' }}>{t.bet.yourStake}</div>
        <div className="flex gap-2">
          {BET_AMOUNTS.map(a => {
            const sel = bet.amount === a.value
            return (
              <div key={a.value} onClick={()=>setBetAmount(a.value)}
                className="flex-1 rounded-2xl p-4 text-center cursor-pointer transition-all active:scale-95"
                style={{
                  background: sel ? 'rgba(253,41,123,0.12)' : 'rgba(255,255,255,0.04)',
                  border: sel ? '1.5px solid rgba(253,41,123,0.4)' : '1.5px solid rgba(255,255,255,0.07)',
                }}>
                <div className="text-[22px] font-extrabold"
                  style={{ color:sel?'#fd297b':'rgba(255,255,255,0.7)', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                  {a.value}
                </div>
                <div className="text-[11px] mt-0.5 font-medium" style={{ color:'rgba(255,255,255,0.3)' }}>
                  {a.label}
                </div>
              </div>
            )
          })}\
        </div>
      </div>

      {/* What happens */}
      <div className="mx-6 mt-5 rounded-2xl overflow-hidden flex-shrink-0">
        <div className="px-5 py-4 flex items-center gap-4"
          style={{ background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-[22px]">✅</span>
          <div>
            <div className="text-[13px] font-bold text-white">{t.bet.bothShow}</div>
            <div className="text-[12px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>
              <span dangerouslySetInnerHTML={{__html: t.bet.bothShowSub.replace('{x}', String(bet.amount*2))}} />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-4"
          style={{ background:'rgba(255,255,255,0.04)' }}>
          <span className="text-[22px]">👻</span>
          <div>
            <div className="text-[13px] font-bold text-white">{t.bet.noShow}</div>
            <div className="text-[12px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>
              <span dangerouslySetInnerHTML={{__html: t.bet.noShowSub.replace('{x}', String(bet.amount))}} />
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 mt-5 pb-10 flex-shrink-0">
        <button onClick={handleCommit}
          className="w-full rounded-2xl py-[18px] text-[16px] font-bold cursor-pointer"
          style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            background: pulse
              ? 'linear-gradient(135deg, #c4185e, #d44a30)'
              : 'linear-gradient(135deg, #fd297b, #ff655b)',
            color:'white',
            boxShadow: pulse ? '0 0 40px rgba(253,41,123,0.6)' : '0 12px 40px rgba(253,41,123,0.3)',
            transform: pulse ? 'scale(0.97)' : 'scale(1)',
            transition:'all 0.2s ease',
          }}>
          {t.bet.cta}
        </button>
        <div className="text-center text-[11px] mt-3" style={{ color:'rgba(255,255,255,0.18)' }}>
          {t.bet.ctaHint}
        </div>
      </div>
    </div>
  )
}
