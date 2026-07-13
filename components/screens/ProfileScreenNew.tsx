'use client'
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/AppContext'
import { APP_COPY } from '@/lib/copy'
import { setCurrentMatch, fetchProfiles, UserProfile } from '@/lib/profiles'
import { appLangToIso } from '@/lib/langDetect'
import { sendGameInvite, setPendingInvite } from '@/lib/gameInvites'
import { getPairProgress, PairProgress } from '@/lib/pairProgress'
import { supabase } from '@/lib/supabase'



type State = 'loading' | 'ready' | 'empty' | 'error'

export default function ProfileScreenNew() {
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
  const [showFullBio, setShowFullBio] = useState(false)  // layout-only: expands a bio detail sheet so the fixed card never grows
  const [translatedBio, setTranslatedBio] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState(false)

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

  // Global presence refresh — updates ALL visible profiles' online status in state (no page reload)
  const refreshPresenceStatuses = useCallback(async () => {
    console.log('PRESENCE GLOBAL REFRESH STARTED')
    let ids: string[] = []
    setProfiles(prev => { ids = prev.map(pr => pr.id); return prev })
    if (ids.length === 0) return
    console.log('VISIBLE PROFILE IDS:', ids.length)

    const { data } = await supabase.from('profiles').select('id, is_online, last_seen').in('id', ids)
    if (!data) return
    console.log('PRESENCE DATA RECEIVED:', data.length)

    const presMap = new Map(data.map((r: any) => {
      const lastSeen = r.last_seen ? new Date(r.last_seen).getTime() : 0
      const online = !!r.is_online && (Date.now() - lastSeen) <= 2 * 60 * 1000
      return [r.id, { online, lastSeen: r.last_seen || null }]
    }))

    // Update online/lastSeen in place — preserve deck order, index, everything else
    setProfiles(prev => prev.map(pr => {
      const pres = presMap.get(pr.id)
      return pres ? { ...pr, online: pres.online, lastSeen: pres.lastSeen } : pr
    }))
    console.log('DISCOVER PRESENCE STATE UPDATED')
  }, [])

  // Interval + visibility (single interval, cleared on unmount)
  useEffect(() => {
    refreshPresenceStatuses()  // on Discover open
    console.log('PRESENCE INTERVAL STARTED')
    const t = setInterval(refreshPresenceStatuses, 10000)  // every 10s
    function onVisible() { if (document.visibilityState === 'visible') refreshPresenceStatuses() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVisible)
      console.log('PRESENCE INTERVAL CLEARED')
    }
  }, [refreshPresenceStatuses])

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

  // Layout-only: collapse the bio detail sheet when the card changes.
  // Fully independent from the privacy/unlock effect above.
  useEffect(() => { setShowFullBio(false) }, [p?.id])

  // Reset any shown translation when the card changes — never carry a
  // translation of one person's bio onto another profile.
  useEffect(() => {
    setTranslatedBio(null)
    setTranslating(false)
    setTranslateError(false)
  }, [p?.id])

  // If the viewer changes the app's EN/GR language while a translation is
  // showing, revert to the original bio — the Translate button reappears if
  // a new translation is needed for the new language. The original bio
  // itself is never touched.
  useEffect(() => {
    setTranslatedBio(null)
    setTranslateError(false)
  }, [lang])

  function transition(dir: 'left'|'right', then: () => void) {
    if (locked) return
    setLocked(true)
    setAnim(dir === 'left' ? 'out-left' : 'out-right')
    setTimeout(() => { then(); setAnim('in'); setTimeout(() => setLocked(false), 350) }, 280)
  }

  function pass() { transition('left', () => setIdx(i => i + 1)); refreshPresenceStatuses() }

  function like() {
    if (!p) return
    setPickerProfile(p)
    setShowPicker(true)
  }

  async function pickGame(gameType: string) {
    if (!pickerProfile) return
    console.log('GAME OPTION SELECTED:', gameType)
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

  async function translateBio() {
    if (!p || !p.bio[lang] || translating) return
    const targetIso = appLangToIso(lang)
    console.log('BIO TRANSLATION REQUESTED:', p.id, p.bioLanguage, '->', targetIso)
    setTranslating(true)
    setTranslateError(false)
    try {
      const res = await fetch('/api/translate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: p.id, bio: p.bio[lang], sourceLang: p.bioLanguage, targetLang: targetIso }),
      })
      const data = await res.json()
      if (!res.ok || !data.translated) throw new Error(data.error || 'Translation failed')
      console.log('BIO TRANSLATION SUCCESS:', p.id, targetIso, data.cached ? '(from cache)' : '(new)')
      setTranslatedBio(data.translated)
    } catch (e: any) {
      console.error('BIO TRANSLATION ERROR:', e?.message)
      setTranslateError(true)
    } finally {
      setTranslating(false)
    }
  }

  function showOriginalBio() {
    console.log('SHOWING ORIGINAL BIO:', p?.id)
    setTranslatedBio(null)
    setTranslateError(false)
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
    <div className="mc-profile-shell flex flex-col overflow-hidden" style={{ background:'#0a0a10', height: '100dvh', maxHeight: '100dvh', position: 'relative' }}>

      {/* Top spacer — compact, fixed height; the account menu/language switch live
          outside this component (rendered by the app shell) and are unaffected */}
      <div className="mc-profile-top pt-8 pb-1 flex-shrink-0" />

      {/* Game picker modal */}
      {showPicker && (
        <>
          <div className="absolute inset-0 z-[110]" style={{ background:'rgba(6,6,10,0.7)', backdropFilter:'blur(6px)', animation:'fadeIn 0.25s ease both' }} onClick={() => setShowPicker(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-[111] px-4 pb-6" style={{ animation:'sheetUp 0.4s cubic-bezier(0.34,1.4,0.64,1) both' }}>
            <div className="rounded-3xl p-6" style={{ background:'rgba(15,12,25,0.96)', backdropFilter:'blur(28px)', border:'1px solid rgba(253,41,123,0.295)', boxShadow:'0 -8px 60px rgba(253,41,123,0.236)' }}>
              <div className="text-center mb-5">
                <div className="text-[32px] mb-2">🎮</div>
                <h2 className="text-[18px] font-extrabold text-white">{lang==='gr'?'Διάλεξε παιχνίδι':'Choose a game'}</h2>
                <p className="text-[12px] mt-1" style={{ color:'rgba(255,255,255,0.472)' }}>{lang==='gr'?`Πρόσκληση προς ${pickerProfile?.name}`:`Invite ${pickerProfile?.name}`}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => pickGame('tic_tac_toe')} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer" style={{ background:'linear-gradient(135deg,#ff3384,#d84dd8)', color:'#fff', boxShadow:'0 8px 24px rgba(253,41,123,0.354)' }}>⭕ Tic Tac Toe</button>
                <button onClick={() => pickGame('connect_4')} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer" style={{ background:'rgba(108,99,255,0.177)', color:'#b79cfc', border:'1px solid rgba(108,99,255,0.295)' }}>🔴 Connect 4</button>
                <button onClick={() => pickGame('mystery_choice')} className="w-full rounded-2xl py-4 text-[15px] font-bold active:scale-95 transition-transform cursor-pointer" style={{ background:'rgba(216,77,216,0.177)', color:'#f0a8f0', border:'1px solid rgba(216,77,216,0.295)' }}>🎭 Mystery Choice</button>
                <button onClick={() => setShowPicker(false)} className="w-full py-2.5 text-[13px] font-medium active:opacity-60 cursor-pointer" style={{ color:'rgba(255,255,255,0.413)' }}>{lang==='gr'?'Άκυρο':'Cancel'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Challenge sent toast */}
      {challengeMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl text-[13px] font-bold text-white"
          style={{ background:'rgba(253,41,123,1)', backdropFilter:'blur(12px)', boxShadow:'0 8px 24px rgba(253,41,123,0.472)', animation:'fadeSlide 0.3s ease both' }}>
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
              style={{ background:'linear-gradient(135deg,#ff3384,#ff7a6e)', color:'#fff' }}>
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

      {/* ── READY — show profile card (v2 design) ── */}
      {state === 'ready' && p && (
        <>
          <div className="discover-card-area-v2 mc-profile-card-area flex-1 min-h-0 flex items-center justify-center overflow-hidden" style={{ padding: '4px 10px' }}>
            <div key={p.id + idx} className="discover-card-v2 mc-profile-card rounded-[28px] overflow-hidden relative flex flex-col"
              style={{
                width: 'calc(100% - 16px)', maxWidth: 460, height: '100%', margin: '0 auto',
                transform: `translateX(${tx}) rotate(${rot})`, opacity: op,
                transition: anim === 'in' ? 'none' : 'all 0.28s ease',
                animation: anim === 'in' ? 'cardReveal 0.35s cubic-bezier(0.34,1.3,0.64,1) both' : 'none',
                boxShadow: '0 20px 70px rgba(0,0,0,0.65)',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(15,12,25,0.6)',
                backdropFilter: 'blur(12px)',
              }}>

              {/* Photo — takes ~47% of the card's actual available height (never vh-based,
                  so it always fits alongside the info section and action bar below) */}
              <div className="mc-photo-zone relative overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{ flex: '0 0 47%', minHeight: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(108,99,255,0.295) 0%, transparent 55%), radial-gradient(ellipse at 50% 70%, rgba(253,41,123,0.236) 0%, transparent 55%), linear-gradient(160deg, #1c1628 0%, #100a1a 100%)' }}>

                {canShowPhoto ? (
                  <img src={p.photo} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    {/* Mystery glow orbs */}
                    <div className="absolute" style={{ width: 220, height: 220, top: '22%', left: '50%', transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(253,41,123,0.236) 0%, transparent 70%)', filter: 'blur(34px)', animation: 'mysteryPulse 4s ease-in-out infinite' }} />

                    {/* Mask icon */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="text-[96px]" style={{ filter: 'drop-shadow(0 6px 24px rgba(253,41,123,0.472))', animation: 'mysteryFloat 5s ease-in-out infinite' }}>🎭</div>
                    </div>
                  </>
                )}

                {/* Photo progress segments — supports the profile's existing photo(s).
                    There is currently one photo per profile, so this shows one full
                    segment; the structure is ready for more without any data change. */}
                <div className="absolute top-3 left-3 right-3 z-20 flex gap-1.5">
                  {[p.photo].map((_, segIdx) => (
                    <div key={segIdx} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
                      <div className="h-full rounded-full" style={{ width: '100%', background: 'rgba(255,255,255,0.95)' }} />
                    </div>
                  ))}
                </div>

                {/* Tap left/right zones for photo navigation — inert with a single
                    photo (no-op), ready to page through more without layout change.
                    Never enables anything beyond the existing unlock state. */}
                <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-default" />
                <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-default" />

                {/* Gradient bottom — dark overlay so text stays readable over any photo */}
                <div className="absolute inset-0" style={{
                  background: 'linear-gradient(180deg, transparent 32%, rgba(6,6,10,0.55) 68%, rgba(6,6,10,0.92) 92%, rgba(6,6,10,1) 100%)'
                }} />

                {/* Online status */}
                <div className="online-badge-v2 absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full z-20"
                  style={{ top: 16, left: 16, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: p.online ? '#4ade80' : '#777',
                    boxShadow: p.online ? '0 0 6px #4ade80' : 'none' }} />
                  <span className="text-[10px] font-bold" style={{ color: p.online ? '#4ade80' : 'rgba(255,255,255,0.6)' }}>{p.online ? 'online' : 'offline'}</span>
                </div>

                {/* Mystery Player badge — now lives on the photo overlay, next to the name */}
                {!canShowPhoto && (
                  <div className="absolute z-20" style={{ top: 16, right: 16 }}>
                    <span className="inline-flex items-center text-[9.5px] font-bold uppercase tracking-[1.5px] px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(253,41,123,0.22)', color: '#ff8fbb', border: '1px solid rgba(253,41,123,0.4)', backdropFilter: 'blur(8px)' }}>
                      🎭 {lang === 'gr' ? 'Μυστήριο' : 'Mystery Player'}
                    </span>
                  </div>
                )}

                {/* Name / Age / location — over the lower part of the photo */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 z-20">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[30px] font-extrabold text-white tracking-tight leading-tight"
                      style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", textShadow:'0 2px 14px rgba(0,0,0,0.6)', wordBreak:'break-word' }}>
                      {p.name}
                    </span>
                    {p.age > 0 && <span className="text-[20px] font-semibold text-white/70">{p.age}</span>}
                  </div>
                  {p.location[lang] && (
                    <div className="text-[13px] text-white/55 mt-1 flex items-center gap-1">
                      <span>📍</span>{p.location[lang]}
                    </div>
                  )}
                </div>
              </div>

              {/* Info — compact sections filling the remaining ~53% of the card, no scroll */}
              <div className="mc-info-zone px-5 py-3 flex flex-col" style={{ background:'#08080c', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>

                {/* Interests — single row, max 3, never wraps */}
                <div className="mc-interests-zone mb-2.5 flex-shrink-0">
                  <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-1.5 flex items-center gap-1.5"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>
                    🏷 {lang === 'gr' ? 'Ενδιαφέροντα' : 'Interests'}
                  </div>
                  <div className="flex gap-1.5 overflow-hidden" style={{ height: 26, flexWrap: 'nowrap' }}>
                    {p.interests.length > 0 ? (
                      p.interests.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap overflow-hidden"
                          style={{ background:'rgba(108,99,255,0.12)', color:'rgba(255,255,255,0.85)', border:'1px solid rgba(108,99,255,0.24)', textOverflow: 'ellipsis', maxWidth: 140 }}>
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11.5px] italic" style={{ color:'rgba(255,255,255,0.35)' }}>
                        {lang === 'gr' ? 'Χωρίς ενδιαφέροντα ακόμα' : 'No interests yet'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio — max 2-line preview; "More" opens a detail sheet, card itself never grows */}
                {p.bio[lang] && (
                  <div className="mc-bio-zone mb-2.5 flex-shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-[1.5px] mb-1 flex items-center gap-1.5"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                      📝 Bio
                    </div>
                    <p className="text-[12.5px] leading-snug italic"
                      style={{
                        color:'rgba(255,255,255,0.78)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                      "{translatedBio || p.bio[lang]}"
                    </p>
                    <div className="flex items-center gap-2.5 mt-0.5" style={{ height: 14 }}>
                      {p.bio[lang].length > 80 && !translatedBio && (
                        <button onClick={() => setShowFullBio(true)}
                          className="text-[11px] font-bold cursor-pointer"
                          style={{ color: '#ff8fbb' }}>
                          {lang === 'gr' ? 'Περισσότερα' : 'More'}
                        </button>
                      )}
                      {translating ? (
                        <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {lang === 'gr' ? 'Μετάφραση...' : 'Translating...'}
                        </span>
                      ) : translatedBio ? (
                        <button onClick={showOriginalBio}
                          className="text-[11px] font-bold cursor-pointer"
                          style={{ color: '#7c72ff' }}>
                          {lang === 'gr' ? 'Εμφάνιση πρωτοτύπου' : 'Show original'}
                        </button>
                      ) : translateError ? (
                        <>
                          <span className="text-[10.5px]" style={{ color: 'rgba(248,113,113,0.85)' }}>
                            {lang === 'gr' ? 'Η μετάφραση δεν είναι διαθέσιμη αυτή τη στιγμή.' : 'Translation is unavailable right now.'}
                          </span>
                          <button onClick={translateBio} className="text-[11px] font-bold cursor-pointer" style={{ color: '#ff8fbb' }}>
                            {lang === 'gr' ? 'Ξανά' : 'Retry'}
                          </button>
                        </>
                      ) : (
                        !!p.bioLanguage && p.bioLanguage !== 'und' && p.bioLanguage !== appLangToIso(lang) && (
                          <button onClick={translateBio}
                            className="text-[11px] font-bold cursor-pointer"
                            style={{ color: '#7c72ff' }}>
                            🌐 {lang === 'gr' ? 'Μετάφραση' : 'Translate'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Reveal progress + unlock status — anchored to the bottom of the card;
                    never moves regardless of bio/interests content */}
                <div className="mc-reveal-zone rounded-2xl p-3 mt-auto flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(253,41,123,0.1), rgba(108,99,255,0.075))', border: '1px solid rgba(253,41,123,0.18)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px]">🔓</span>
                      <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {lang === 'gr' ? 'Πρόοδος Reveal' : 'Reveal Progress'}
                      </span>
                    </div>
                    <span className="text-[11px] font-extrabold" style={{ color: '#ff3384' }}>
                      {progress.games_completed} / 10
                    </span>
                  </div>
                  <div className="w-full h-[4px] rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress.games_completed * 10)}%`, background: 'linear-gradient(90deg, #ff3384, #d84dd8)', boxShadow: '0 0 8px rgba(253,41,123,0.6)', transition: 'width 0.4s' }} />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="flex-1 text-center text-[9px] font-bold py-1.5 rounded-lg"
                      style={{ background: progress.photo_unlocked ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                               color: progress.photo_unlocked ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                      {progress.photo_unlocked ? '📸 ' + (lang === 'gr' ? 'Ξεκλείδωτη' : 'Unlocked') : '🔒 ' + (lang === 'gr' ? 'Φωτό (5)' : 'Photo (5)')}
                    </div>
                    <div className="flex-1 text-center text-[9px] font-bold py-1.5 rounded-lg"
                      style={{ background: progress.chat_unlocked ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                               color: progress.chat_unlocked ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                      {progress.chat_unlocked ? '💬 ' + (lang === 'gr' ? 'Ξεκλείδωτο' : 'Unlocked') : '🔒 ' + (lang === 'gr' ? 'Chat (10)' : 'Chat (10)')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full bio detail sheet — transient overlay only, the main card stays fixed */}
          {showFullBio && p.bio[lang] && (
            <>
              <div className="absolute inset-0 z-[105]" style={{ background:'rgba(6,6,10,0.7)', backdropFilter:'blur(6px)', animation:'fadeIn 0.25s ease both' }} onClick={() => setShowFullBio(false)} />
              <div className="absolute bottom-0 left-0 right-0 z-[106] px-4 pb-6" style={{ animation:'sheetUp 0.4s cubic-bezier(0.34,1.4,0.64,1) both' }}>
                <div className="rounded-3xl p-6 max-h-[60vh] overflow-y-auto" style={{ background:'rgba(15,12,25,0.97)', backdropFilter:'blur(28px)', border:'1px solid rgba(255,255,255,0.1)', boxShadow:'0 -8px 60px rgba(0,0,0,0.5)' }}>
                  <div className="text-[11px] font-bold uppercase tracking-[1.5px] mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>📝 Bio — {p.name}</div>
                  <p className="text-[14px] leading-relaxed italic mb-5" style={{ color:'rgba(255,255,255,0.85)' }}>"{p.bio[lang]}"</p>
                  <button onClick={() => setShowFullBio(false)} className="w-full py-3 rounded-2xl text-[13px] font-bold cursor-pointer" style={{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.7)' }}>
                    {lang === 'gr' ? 'Κλείσιμο' : 'Close'}
                  </button>
                </div>
              </div>
            </>
          )}
          {/* Action buttons — same DateDuel actions, unchanged handlers */}
          <div className="discover-actions-v2 mc-profile-actions flex-shrink-0 flex items-center justify-center gap-5 px-6 pt-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', background: 'linear-gradient(to top, #0a0a10 60%, transparent)' }}>
            <button onClick={pass} disabled={locked}
              className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background:'rgba(255,255,255,0.07)', border:'2px solid rgba(255,255,255,0.14)' }}>
              ❌
            </button>
            <button onClick={playDirect} disabled={locked}
              className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background:'rgba(56,189,248,0.15)', border:'2px solid rgba(56,189,248,0.3)' }}>
              ⚡
            </button>
            <button onClick={() => { if(!p||locked)return; if(!progress.chat_unlocked){ setChallengeMsg(lang==='gr'?'Παίξε περισσότερα για chat (10)':'Play more games to unlock chat.'); setTimeout(()=>setChallengeMsg(null),2200); return } setCurrentMatch(p); navigate('chat') }} disabled={locked}
              className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background: progress.chat_unlocked ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.05)', border: progress.chat_unlocked ? '2px solid rgba(167,139,250,0.35)' : '2px solid rgba(255,255,255,0.094)', opacity: progress.chat_unlocked ? 1 : 0.5 }}>
              {progress.chat_unlocked ? '💬' : '🔒'}
            </button>
            <button onClick={like} disabled={locked}
              className="w-16 h-16 rounded-full flex items-center justify-center text-[22px] active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              style={{ background:'rgba(253,41,123,0.18)', border:'2px solid rgba(253,41,123,0.42)', boxShadow:'0 0 22px rgba(253,41,123,0.25)' }}>
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

        /* ── Mobile fixed shell (below 768px only) ──────────────────────
           Replaces flex-distributed sizing with explicit fixed zones so the
           card and action bar never move between profiles, photos, or
           content lengths. Desktop/tablet keep their existing flex layout
           entirely untouched — none of these rules apply above 767px. */
        @media (max-width: 767.98px) {
          .mc-profile-shell {
            height: 100dvh !important;
            min-height: 100dvh !important;
            max-height: 100dvh !important;
            width: 100% !important;
            overflow: hidden !important;
            position: relative !important;
          }
          .mc-profile-top {
            flex: 0 0 0px !important;
            height: 0px !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Card area + action bar heights are derived from the SAME calc()
             expression for the bottom bar, so they always stay in sync.
             Top offset is now safe-area-only — the account icon overlays
             the card via z-index rather than the card leaving room for it. */
          .mc-profile-card-area {
            position: absolute !important;
            top: calc(env(safe-area-inset-top, 0px) + 4px) !important;
            left: 0 !important;
            right: 0 !important;
            bottom: calc(64px + 8px + env(safe-area-inset-bottom, 0px) + 16px) !important;
            padding: 4px 10px !important;
            display: flex !important;
            align-items: stretch !important;
            justify-content: center !important;
            overflow: hidden !important;
          }
          .mc-profile-card {
            width: calc(100% - 16px) !important;
            max-width: 460px !important;
            height: 100% !important;
            position: relative !important;
          }
          /* Photo dominates the card — 65% of its fixed height, Tinder-style.
             Everything below flows naturally in the remaining ~33%; nothing
             here is absolutely offset from the photo, so an empty bio or
             empty interests row simply doesn't reserve any space — the
             sections that DO have content sit flush against each other,
             and Reveal Progress (mt-auto in the base layout) absorbs
             whatever room is left, staying pinned just above the actions. */
          .mc-photo-zone {
            flex: 0 0 65% !important;
          }
          .mc-info-zone {
            padding: 8px 16px !important;
          }
          .mc-interests-zone {
            margin-bottom: 6px !important;
          }
          .mc-bio-zone {
            margin-bottom: 6px !important;
          }
          .mc-reveal-zone {
            padding: 8px 10px !important;
          }
          .mc-profile-actions {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            height: calc(64px + 8px + env(safe-area-inset-bottom, 0px) + 16px) !important;
            padding-top: 8px !important;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px) !important;
          }
        }

        /* Tablet: centered card, balanced width */
        @media (min-width: 640px) and (max-width: 1023px) {
          .discover-card-area-v2 { padding: 20px 16px 8px !important; }
          .discover-card-v2 { width: 440px !important; max-width: 440px !important; margin: 0 auto !important; }
          .discover-actions-v2 { padding-top: 20px !important; padding-bottom: 24px !important; max-width: 440px; margin: 0 auto; width: 100%; }
        }
        /* Desktop: centered card, ~430-480px wide — never stretched */
        @media (min-width: 1024px) {
          .discover-card-area-v2 { padding: 24px 16px 8px !important; }
          .discover-card-v2 { width: 460px !important; max-width: 460px !important; margin: 0 auto !important; }
          .discover-actions-v2 { padding-top: 20px !important; padding-bottom: 28px !important; max-width: 460px; margin: 0 auto; width: 100%; }
        }
      `}</style>
    </div>
  )
}
