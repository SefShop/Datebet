'use client'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { setCurrentMatch, fetchProfiles, UserProfile } from '@/lib/profiles'
import { sendGameInvite, setPendingInvite } from '@/lib/gameInvites'
import { getPairProgress, PairProgress } from '@/lib/pairProgress'



type State = 'loading' | 'ready' | 'empty' | 'error'

export default function ProfileScreen() {
  const { navigate, lang } = useApp()
  const t = APP_COPY[lang].dating

  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [state, setState]       = useState<State>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [idx, setIdx]           = useState(0)
  const [anim, setAnim]         = useState<'in'|'out-left'|'out-right'>('in')
  const [locked, setLocked]     = useState(false)
  const [checking, setChecking] = useState(false)
  const [challengeMsg, setChallengeMsg] = useState<string|null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [progress, setProgress] = useState<PairProgress>({ games_completed: 0, photo_unlocked: false, chat_unlocked: false })
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [pickerProfile, setPickerProfile] = useState<UserProfile|null>(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    setState('loading')
    const result = await fetchProfiles()
    if (result.error) { setErrorMsg(result.error); setState('error'); return }
    if (result.profiles.length === 0) { setState('empty'); return }
    setProfiles(result.profiles)
    setIdx(0)
    setState('ready')
  }

  const p = profiles.length > 0 ? profiles[idx % profiles.length] : null

  useEffect(() => {
    // PRIVACY: reset to LOCKED immediately on every card change (before any fetch)
    console.log('CARD CHANGED - PHOTO LOCK RESET')
    setProgressLoaded(false)
    setProgress({ games_completed: 0, photo_unlocked: false, chat_unlocked: false })

    let cancelled = false
    if (p?.id) {
      console.log('PAIR PROGRESS LOADING')
      const cardId = p.id
      getPairProgress(cardId).then(prog => {
        // Guard against stale response (user may have skipped to next card)
        if (cancelled || p?.id !== cardId) return
        setProgress(prog)
        setProgressLoaded(true)
        console.log('PHOTO LOCK CHECK:', prog.games_completed, '/10, unlocked:', prog.photo_unlocked)
      })
    }
    return () => { cancelled = true }
  }, [p?.id])

  function transition(dir: 'left'|'right', then: () => void) {
    if (locked) return
    setLocked(true)
    setAnim(dir === 'left' ? 'out-left' : 'out-right')
    setTimeout(() => { then(); setAnim('in'); setTimeout(() => setLocked(false), 350) }, 280)
  }

  function pass() { transition('left', () => setIdx(i => i + 1)) }

  function like() {
    if (!p) return
    setPickerProfile(p)
    setShowPicker(true)
  }

  async function pickGame(gameType: string) {
    if (!pickerProfile) return
    console.log('GAME PICKED:', gameType)
    setShowPicker(false)
    setChecking(true)
    const result = await sendGameInvite(pickerProfile.id, gameType)
    setChecking(false)
    if (result.ok && result.inviteId) {
      console.log('INVITE CREATED:', result.inviteId)
      console.log('NAVIGATING TO WAITING:', { id: result.inviteId, name: pickerProfile.name, gameType })
      setPendingInvite({ id: result.inviteId, receiverName: pickerProfile.name, gameType })
      navigate('waiting')
    } else {
      setChallengeMsg(result.error || 'Error')
      setTimeout(() => setChallengeMsg(null), 2000)
    }
  }

  function playDirect() {
    if (locked || !p) return
    setCurrentMatch(p)
    navigate('game_select')
  }

  const tx = anim==='out-left' ? '-110%' : anim==='out-right' ? '110%' : '0'
  const rot = anim==='out-left' ? '-6deg' : anim==='out-right' ? '6deg' : '0deg'
  const op = anim.startsWith('out') ? 0 : 1

  // PRIVACY GATE: only show real photo after progress is loaded AND unlock confirmed
  const canShowPhoto = progressLoaded === true &&
    (progress.photo_unlocked === true || progress.games_completed >= 5) &&
    !!p?.photo
  if (p) {
    if (canShowPhoto) console.log('PHOTO UNLOCKED SHOWING')
    else console.log('PHOTO HIDDEN')
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ background:'#06060a', height: '100dvh', maxHeight: '100dvh' }}>

      {/* Top spacer */}
      <div className="pt-12 pb-1" />

      {/* Game picker modal */}
      {showPicker && (
        <>
          <div className="absolute inset-0 z-[110]" style={{ background:'rgba(6,6,10,0.7)', backdropFilter:'blur(6px)', animation:'fadeIn 0.25s ease both' }} onClick={() => setShowPicker(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-[111] px-4 pb-6" style={{ animation:'sheetUp 0.4s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-3xl p-6" style={{ background:'rgba(15,12,25,0.96)', backdropFilter:'blur(28px)', border:'1px solid rgba(253,41,123,0.25)', boxShadow:'0 -8px 60px rgba(253,41,123,0.2)' }}>
              <div className="text-center mb-5">
                <div className="text-[32px] mb-2">🎮</div>
                <h2 className="text-[18px] font-extrabold text-white">{lang==='gr'?'Διάλεξε παιχνίδι':'Choose a game'}</h2>
                <p className="text-[12px] mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>{lang==='gr'?`Πρόσκληση προς ${pickerProfile?.name}`:`Invite ${pickerProfile?.name}`}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => pickGame('tic_tac_toe')} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer" style={{ background:'linear-gradient(135deg,#fd297b,#c850c0)', color:'#fff', boxShadow:'0 8px 24px rgba(253,41,123,0.3)' }}>⭕ Tic Tac Toe</button>
                <button onClick={() => pickGame('connect_4')} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer" style={{ background:'rgba(108,99,255,0.15)', color:'#a78bfa', border:'1px solid rgba(108,99,255,0.25)' }}>🔴 Connect 4</button>
                <button onClick={() => setShowPicker(false)} className="w-full py-2.5 text-[13px] font-medium active:opacity-60 cursor-pointer" style={{ color:'rgba(255,255,255,0.35)' }}>{lang==='gr'?'Άκυρο':'Cancel'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Challenge sent toast */}
      {challengeMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-[13px] font-bold text-white"
          style={{ background:'rgba(253,41,123,0.9)', backdropFilter:'blur(12px)', boxShadow:'0 8px 24px rgba(253,41,123,0.4)', animation:'fadeSlide 0.3s ease both' }}>
          {challengeMsg}
        </div>
      )}

      {/* Checking overlay */}
      {checking && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background:'rgba(6,6,10,0.7)', backdropFilter:'blur(4px)' }}>
          <div className="text-center">
            <div className="text-[32px] mb-3" style={{ animation:'pulse 1s infinite' }}>💫</div>
            <div className="text-[14px] font-bold text-white/70">{lang==='gr'?'ελέγχουμε...':'checking...'}</div>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {state === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[36px] mb-3" style={{ animation:'pulse 1s infinite' }}>🎮</div>
            <div className="text-[14px] font-semibold text-white/50">
              {lang==='gr' ? 'Φόρτωση παικτών...' : 'Loading players...'}
            </div>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {state === 'error' && (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center">
            <div className="text-[36px] mb-3">⚠️</div>
            <div className="text-[16px] font-bold text-white mb-2">
              {lang==='gr' ? 'Δεν ήταν δυνατή η φόρτωση.' : 'Could not load players.'}
            </div>
            <div className="text-[12px] text-white/30 mb-5">{errorMsg}</div>
            <button onClick={loadProfiles}
              className="rounded-2xl px-6 py-3 text-[14px] font-bold active:scale-95 transition-transform cursor-pointer"
              style={{ background:'linear-gradient(135deg,#fd297b,#ff655b)', color:'#fff' }}>
              {lang==='gr' ? 'Δοκίμασε ξανά' : 'Try again'}
            </button>
          </div>
        </div>
      )}

      {/* ── EMPTY — no real users yet ── */}
      {state === 'empty' && (
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center">
            <div className="text-[48px] mb-4">🎮</div>
            <div className="text-[18px] font-bold text-white mb-2">
              {lang==='gr' ? 'Δεν υπάρχουν παίκτες ακόμα.' : 'No players yet.'}
            </div>
            <div className="text-[14px] text-white/40 mb-6">
              {lang==='gr' ? 'Κάλεσε κάποιον να παίξει.' : 'Invite someone to play.'}
            </div>

          </div>
        </div>
      )}

      {/* ── READY — show profile card ── */}
      {state === 'ready' && p && (
        <>
          <div className="flex-1 min-h-0 px-3 pb-2 flex items-start justify-center overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <div key={p.id + idx} className="w-full max-w-[400px] rounded-3xl overflow-hidden relative my-auto"
              style={{
                transform: `translateX(${tx}) rotate(${rot})`, opacity: op,
                transition: anim === 'in' ? 'none' : 'all 0.28s ease',
                animation: anim === 'in' ? 'cardReveal 0.35s cubic-bezier(0.34,1.3,0.64,1) both' : 'none',
                boxShadow: '0 16px 60px rgba(0,0,0,0.6)',
              }}>

              {/* Photo — revealed at 5 games, else Mystery Mode */}
              <div className="relative overflow-hidden flex items-center justify-center"
                style={{ height: 'clamp(200px, 34vh, 340px)', background: 'radial-gradient(ellipse at 50% 40%, rgba(108,99,255,0.25) 0%, transparent 55%), radial-gradient(ellipse at 50% 70%, rgba(253,41,123,0.2) 0%, transparent 55%), linear-gradient(160deg, #14101f 0%, #0a0612 100%)' }}>

                {canShowPhoto ? (
                  <img src={p.photo} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    {/* Mystery glow orbs */}
                    <div className="absolute" style={{ width: 180, height: 180, top: '20%', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,41,123,0.2) 0%, transparent 70%)', filter: 'blur(30px)', animation: 'mysteryPulse 4s ease-in-out infinite' }} />

                    {/* Mask icon */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="text-[80px]" style={{ filter: 'drop-shadow(0 6px 24px rgba(253,41,123,0.4))', animation: 'mysteryFloat 5s ease-in-out infinite' }}>🎭</div>
                      <div className="mt-3 text-[11px] font-bold uppercase tracking-[2px] px-3 py-1 rounded-full"
                        style={{ background: 'rgba(253,41,123,0.12)', color: 'rgba(253,41,123,0.8)', border: '1px solid rgba(253,41,123,0.2)' }}>
                        {lang === 'gr' ? 'Μυστήριο' : 'Mystery Player'}
                      </div>
                    </div>
                  </>
                )}

                {/* Gradient bottom */}
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(180deg, transparent 40%, rgba(6,6,10,0.85) 90%, rgba(6,6,10,1) 100%)'
                }} />

                {/* Online status */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: p.online ? '#4ade80' : '#555',
                    boxShadow: p.online ? '0 0 6px #4ade80' : 'none' }} />
                  <span className="text-[10px] font-bold text-white/70">{p.online ? (lang === 'gr' ? 'σε σύνδεση' : 'online') : (lang === 'gr' ? 'εκτός' : 'offline')}</span>
                </div>

                {/* Name/age/location */}
                <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold text-white tracking-tight"
                      style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", textShadow:'0 2px 12px rgba(0,0,0,0.5)' }}>
                      {p.name}
                    </span>
                    {p.age > 0 && <span className="text-[20px] font-semibold text-white/60">{p.age}</span>}
                  </div>
                  {p.location[lang] && <div className="text-[13px] text-white/45 mt-0.5">{p.location[lang]}</div>}
                </div>
              </div>

              {/* Info */}
              <div className="px-5 py-5" style={{ background:'rgba(6,6,10,1)' }}>

                {/* Interests */}
                <div className="mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.35)' }}>
                    🏷 {lang === 'gr' ? 'Ενδιαφέροντα' : 'Interests'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(p.interests.length > 0 ? p.interests : ['☕ Coffee', '✈️ Travel', '🎬 Movies']).map(tag => (
                      <span key={tag} className="text-[12px] font-medium px-3 py-1.5 rounded-full"
                        style={{ background:'rgba(108,99,255,0.1)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(108,99,255,0.2)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                {p.bio[lang] && (
                  <div className="mb-4">
                    <div className="text-[11px] font-bold uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5"
                      style={{ color: 'rgba(255,255,255,0.35)' }}>
                      📝 Bio
                    </div>
                    <p className="text-[14px] leading-relaxed italic" style={{ color:'rgba(255,255,255,0.65)' }}>
                      "{p.bio[lang]}"
                    </p>
                  </div>
                )}

                {/* Reveal progress */}
                <div className="rounded-2xl p-4 mt-4"
                  style={{ background: 'linear-gradient(135deg, rgba(253,41,123,0.08), rgba(108,99,255,0.06))', border: '1px solid rgba(253,41,123,0.15)' }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px]">🔓</span>
                      <span className="text-[12px] font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {lang === 'gr' ? 'Πρόοδος Reveal' : 'Reveal Progress'}
                      </span>
                    </div>
                    <span className="text-[12px] font-extrabold" style={{ color: '#fd297b' }}>
                      {progress.games_completed} / 10 {lang === 'gr' ? 'παιχνίδια' : 'games'}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.games_completed * 10)}%`, background: 'linear-gradient(90deg, #fd297b, #c850c0)', boxShadow: '0 0 8px rgba(253,41,123,0.5)', transition: 'width 0.4s' }} />
                  </div>
                  {/* Unlock states */}
                  <div className="flex gap-2">
                    <div className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg"
                      style={{ background: progress.photo_unlocked ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                               color: progress.photo_unlocked ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
                      {progress.photo_unlocked ? '📸 ' + (lang === 'gr' ? 'Φωτό ξεκλείδωτη' : 'Photo unlocked') : '🔒 ' + (lang === 'gr' ? 'Φωτό (5)' : 'Photo (5)')}
                    </div>
                    <div className="flex-1 text-center text-[10px] font-bold py-1.5 rounded-lg"
                      style={{ background: progress.chat_unlocked ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                               color: progress.chat_unlocked ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
                      {progress.chat_unlocked ? '💬 ' + (lang === 'gr' ? 'Chat ξεκλείδωτο' : 'Chat unlocked') : '🔒 ' + (lang === 'gr' ? 'Chat (10)' : 'Chat (10)')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons — always visible at bottom */}
          <div className="flex-shrink-0 flex items-center justify-center gap-5 px-6 pt-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', background: 'linear-gradient(to top, #06060a 60%, transparent)' }}>
            <button onClick={pass} disabled={locked}
              className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background:'rgba(255,255,255,0.06)', border:'2px solid rgba(255,255,255,0.12)' }}>
              ❌
            </button>
            <button onClick={playDirect} disabled={locked}
              className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background:'rgba(56,189,248,0.15)', border:'2px solid rgba(56,189,248,0.3)' }}>
              ⚡
            </button>
            <button onClick={() => { if(!p||locked)return; if(!progress.chat_unlocked){ setChallengeMsg(lang==='gr'?'Παίξε περισσότερα για chat (10)':'Play more games to unlock chat.'); setTimeout(()=>setChallengeMsg(null),2200); return } setCurrentMatch(p); navigate('chat') }} disabled={locked}
              className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background: progress.chat_unlocked ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)', border: progress.chat_unlocked ? '2px solid rgba(167,139,250,0.3)' : '2px solid rgba(255,255,255,0.08)', opacity: progress.chat_unlocked ? 1 : 0.5 }}>
              {progress.chat_unlocked ? '💬' : '🔒'}
            </button>
            <button onClick={like} disabled={locked}
              className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background:'rgba(253,41,123,0.15)', border:'2px solid rgba(253,41,123,0.35)', boxShadow:'0 0 20px rgba(253,41,123,0.2)' }}>
              🎮
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes sheetUp { from{opacity:0;transform:translateY(60px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeSlide { from{opacity:0;transform:translate(-50%,-8px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes mysteryPulse { 0%,100%{opacity:0.5;transform:translateX(-50%) scale(1)} 50%{opacity:0.9;transform:translateX(-50%) scale(1.15)} }
        @keyframes mysteryFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes cardReveal { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
      `}</style>
    </div>
  )
}
