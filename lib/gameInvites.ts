import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateMysteryQuestions, toRoundData } from '@/lib/mysteryChoiceQuestions'
import { setCurrentMatch, UserProfile } from '@/lib/profiles'

export interface GameInvite {
  id: string
  created_at: string
  sender_id: string
  receiver_id: string
  game_type: string
  status: 'pending' | 'accepted' | 'declined'
  message: string | null
  // joined
  sender_name?: string
  sender_photo?: string
  receiver_name?: string
}

export async function sendGameInvite(receiverId: string, gameType = 'mystery'): Promise<{ ok: boolean; error?: string; inviteId?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Not configured' }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Not logged in' }

    // Get sender name for message
    const { data: myProfile } = await supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
    const senderName = myProfile?.name || 'Someone'
    const message = gameType === 'mystery_choice'
      ? `${senderName} invited you to play Mystery Choice`
      : `${senderName} invited you to play`

    // ALWAYS insert a brand-new invite. No history checks, no dedup.
    console.log('PLAY AGAIN PRESSED / sending invite')
    const { data, error } = await supabase.from('game_invites').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      game_type: gameType,
      status: 'pending',
      message,
    }).select().single()

    if (error) { console.error('GAME INVITE error:', error); return { ok: false, error: error.message } }
    console.log('NEW INVITE CREATED')
    console.log('NEW INVITE ID:', data.id)
    console.log('GAME INVITE SENT:', receiverId, gameType)
    if (gameType === 'mystery_choice') console.log('MYSTERY CHOICE INVITE CREATED:', data.id)
    return { ok: true, inviteId: data.id }
  } catch (e: any) { return { ok: false, error: e.message } }
}

export async function getIncomingInvites(): Promise<GameInvite[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('game_invites')
      .select('*')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error || !data) { console.error('INCOMING INVITES error:', error); return [] }

    const ids = data.map(i => i.sender_id)
    const { data: profiles } = await supabase.from('profiles').select('id, name, photo').in('id', ids)
    const pMap = new Map(profiles?.map(p => [p.id, p]) || [])

    const result = data.map(i => ({
      ...i,
      sender_name: pMap.get(i.sender_id)?.name || 'Player',
      sender_photo: pMap.get(i.sender_id)?.photo || '',
    }))
    console.log('INCOMING INVITES:', result.length)
    return result
  } catch { return [] }
}

export async function getOutgoingInvites(): Promise<GameInvite[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('game_invites')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error || !data) return []

    const ids = data.map(i => i.receiver_id)
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', ids)
    const pMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return data.map(i => ({
      ...i,
      receiver_name: pMap.get(i.receiver_id)?.name || 'Player',
    }))
  } catch { return [] }
}

export async function respondInvite(inviteId: string, accept: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('game_invites')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', inviteId)
    if (error) return { ok: false, error: error.message }
    console.log(accept ? 'INVITE ACCEPTED:' : 'INVITE DECLINED:', inviteId)
    return { ok: true }
  } catch (e: any) { return { ok: false, error: e.message } }
}

export async function getInviteCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const { count } = await supabase
      .from('game_invites')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    return count ?? 0
  } catch { return 0 }
}

// ── Game Sessions ──────────────────────────────────────────────
export interface GameSession {
  id: string
  created_at: string
  invite_id: string
  player_one_id: string
  player_two_id: string
  game_type: string
  status: string
  state: any
}

function initStateFor(gameType: string): any {
  if (gameType === 'connect_4') {
    return { board: Array(42).fill(''), currentTurn: null, winner: null, status: 'active', moves: 0, gameNumber: 1, parentSessionId: null }
  }
  if (gameType === 'mystery_choice') {
    // Question Engine: randomly generates 10 questions (3 easy, 4 medium, 3 deep)
    // from the full question bank in lib/mysteryChoiceQuestions.ts. Scales to
    // any number of questions without any change needed here. Supports mixed
    // question types (binary / multi-select / preference) — toRoundData()
    // already returns everything the game screen needs to render any type.
    const generated = generateMysteryQuestions().map(toRoundData)
    const rounds = generated.length === 10 ? generated : MYSTERY_CHOICE_ROUNDS
    return {
      game_type: 'mystery_choice',
      current_round: 0,
      rounds,
      player_one_choice: null,
      player_two_choice: null,
      player_one_ready: false,
      player_two_ready: false,
      round_result: null,
      matches: 0,
      status: 'active',
      progressCounted: false,
    }
  }
  // tic_tac_toe / default
  return { board: ['','','','','','','','',''], currentTurn: null, winner: null, status: 'active', moves: 0, progressCounted: false, gameNumber: 1, parentSessionId: null }
}

// Static fallback (used only if the question engine ever returns fewer than 10 rounds)
export const MYSTERY_CHOICE_ROUNDS = [
  { emoji: ['☕','🍷'], en: ['Coffee', 'Wine'],               gr: ['Καφές', 'Κρασί'] },
  { emoji: ['🏖️','🏔️'], en: ['Beach', 'Mountains'],           gr: ['Παραλία', 'Βουνό'] },
  { emoji: ['🐶','🐱'], en: ['Dog', 'Cat'],                   gr: ['Σκύλος', 'Γάτα'] },
  { emoji: ['📞','💬'], en: ['Call', 'Text'],                 gr: ['Κλήση', 'Μήνυμα'] },
  { emoji: ['🌃','🛋️'], en: ['Night out', 'Cozy night'],      gr: ['Έξοδος', 'Χαλαρή βραδιά'] },
  { emoji: ['🍕','🍣'], en: ['Pizza', 'Sushi'],                gr: ['Πίτσα', 'Σούσι'] },
  { emoji: ['🧭','🧘'], en: ['Adventure', 'Relax'],            gr: ['Περιπέτεια', 'Χαλάρωση'] },
  { emoji: ['😂','🎬'], en: ['Comedy', 'Thriller'],            gr: ['Κωμωδία', 'Θρίλερ'] },
  { emoji: ['🌅','🌙'], en: ['Early bird', 'Night owl'],       gr: ['Πρωινός τύπος', 'Νυχτοπούλι'] },
  { emoji: ['📋','🌊'], en: ['Plan everything', 'Go with the flow'], gr: ['Σχεδιάζω τα πάντα', 'Πάω με το ρεύμα'] },
]

// Create a session when an invite is accepted (receiver side)
export async function createGameSession(invite: GameInvite): Promise<{ session?: GameSession; error?: string }> {
  try {
    // Check if session already exists for this invite (deterministic: earliest)
    const { data: existingRows } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('invite_id', invite.id)
      .order('created_at', { ascending: true })
      .limit(1)
    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null

    if (existing) {
      console.log('GAME SESSION LOADED:', existing.id)
      return { session: existing }
    }

    // Log how many sessions this pair has (history, no limit)
    const { count } = await supabase
      .from('game_sessions')
      .select('*', { count: 'exact', head: true })
      .or(`and(player_one_id.eq.${invite.sender_id},player_two_id.eq.${invite.receiver_id}),and(player_one_id.eq.${invite.receiver_id},player_two_id.eq.${invite.sender_id})`)
    console.log('SESSION COUNT FOR PAIR:', count)
    console.log('NO LIMIT REACHED')

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        invite_id: invite.id,
        player_one_id: invite.sender_id,
        player_two_id: invite.receiver_id,
        game_type: invite.game_type,
        status: 'active',
        state: { ...initStateFor(invite.game_type), currentTurn: invite.sender_id },
      })
      .select()
      .single()

    if (error) { console.error('GAME SESSION error:', error); return { error: error.message } }
    console.log('NEW GAME SESSION CREATED:', data.id)
    if (invite.game_type === 'mystery_choice') {
      console.log('MYSTERY CHOICE SESSION CREATED:', data.id)
      console.log('MYSTERY SESSION CREATED:', data.id, 'players', invite.sender_id, invite.receiver_id)
    }
    return { session: data }
  } catch (e: any) { return { error: e.message } }
}

// Load session by invite (sender side, after acceptance)
export async function loadSessionByInvite(inviteId: string): Promise<GameSession | null> {
  try {
    // Order by created_at so BOTH users deterministically pick the SAME (earliest) session
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('invite_id', inviteId)
      .order('created_at', { ascending: true })
      .limit(1)
    const session = data && data.length > 0 ? data[0] : null
    if (session) console.log('GAME SESSION LOADED:', session.id)
    return session
  } catch { return null }
}

// ── Current session holder (in-memory) ──────────────────────────
let _session: GameSession | null = null
type SessionListener = (s: GameSession | null) => void
const _sessionListeners = new Set<SessionListener>()

export function setCurrentSession(s: GameSession) {
  _session = s
  console.log('SESSION ID:', s.id)
  // Notify every subscriber immediately — this is what makes an
  // already-mounted-but-hidden screen (the app keeps all game screens
  // mounted at once) find out about a new session right away, instead of
  // only picking it up whenever it next happens to re-render for some
  // unrelated reason.
  _sessionListeners.forEach(fn => { try { fn(s) } catch (e) { console.error('session listener error:', e) } })
}
export function getCurrentSession(): GameSession | null { return _session }

// Clears only the in-memory active session pointer — used when the user
// leaves a finished game via the back arrow, so it's no longer registered
// as the app's "current" session. Does not touch the database row/history.
export function clearCurrentSession() {
  console.log('CURRENT SESSION CLEARED (back arrow)')
  _session = null
  _sessionListeners.forEach(fn => { try { fn(null) } catch (e) { console.error('session listener error:', e) } })
}

// Subscribe to be notified immediately whenever setCurrentSession() is
// called anywhere in the app. Returns an unsubscribe function.
export function subscribeCurrentSession(listener: SessionListener): () => void {
  _sessionListeners.add(listener)
  return () => { _sessionListeners.delete(listener) }
}

// ── Reconciliation: recover a missed realtime accept event ──────────
// Called once on auth completion (app/app/page.tsx). Covers the case where
// the sender wasn't actively on WaitingScreen when their invite was
// accepted (so its realtime listener/poll never ran) — e.g. they navigated
// away, or the very first accept for a brand-new pair happened before the
// listener finished subscribing. Only considers invites from the last few
// minutes so it can never resurrect an old, already-finished game.
const _reconciledInviteIds = new Set<string>()
export function markInviteReconciled(inviteId: string) { _reconciledInviteIds.add(inviteId) }

// ── Authoritative session validity check ─────────────────────────
// The single source of truth for "is this session actually enterable right
// now, by this exact user". Used both by the top-level screen invariant
// (app/app/page.tsx) and anywhere else that needs to decide whether a
// session is real and current rather than stale/finished/belonging to
// someone else.
export function isValidActiveGameSession(session: GameSession | null | undefined, authenticatedUserId: string | null | undefined): boolean {
  if (!session || !session.id) return false
  if (!authenticatedUserId) return false
  if (session.player_one_id !== authenticatedUserId && session.player_two_id !== authenticatedUserId) return false
  if (!session.state) return false
  if (session.state.status === 'finished') return false
  const supportedTypes = ['tic_tac_toe', 'mystery_choice', 'connect_4']
  if (session.game_type && !supportedTypes.includes(session.game_type)) return false
  return true
}

export async function reconcilePendingAcceptedInvite(loginStartedAt: string): Promise<{ invite: GameInvite; session: GameSession } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // IMPORTANT: this must only ever recover an accept that happened
    // DURING the current login — e.g. the sender wasn't on WaitingScreen
    // when their invite got accepted moments ago. A blanket "created within
    // the last 5 minutes" window doesn't distinguish that from an invite
    // that was accepted BEFORE a logout that happened to occur within the
    // same 5 minutes — which is exactly what let a logged-out session get
    // resurrected on the next login. Using the exact moment this login
    // started as the lower bound makes that impossible: nothing from
    // before this login can ever match.
    const { data: invites, error } = await supabase
      .from('game_invites')
      .select('*')
      .eq('sender_id', user.id)
      .eq('status', 'accepted')
      .gte('created_at', loginStartedAt)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !invites || invites.length === 0) return null
    const invite = invites[0] as GameInvite
    if (_reconciledInviteIds.has(invite.id)) return null
    if (_session && _session.invite_id === invite.id) { _reconciledInviteIds.add(invite.id); return null }

    // Bounded retry — mirrors WaitingScreen's own retry window, in case the
    // session write is still a moment behind the status flip.
    let session = await loadSessionByInvite(invite.id)
    let tries = 0
    while (!session && tries < 6) {
      await new Promise(r => setTimeout(r, 400))
      session = await loadSessionByInvite(invite.id)
      tries++
    }

    if (!isValidActiveGameSession(session, user.id)) {
      console.log('RECONCILIATION: session not valid/active, not resumable', session?.id)
      return null
    }

    _reconciledInviteIds.add(invite.id)
    console.log('RECONCILIATION: recovered missed accept for invite', invite.id, 'session', session!.id)
    return { invite, session: session! }
  } catch (e: any) {
    console.error('reconcilePendingAcceptedInvite:', e.message)
    return null
  }
}

// ── Opponent name holder (for game screens) ─────────────────────
let _opponentName: string | null = null
export function setOpponentName(n: string) { _opponentName = n; console.log('OPPONENT PROFILE:', n) }
export function getOpponentName(): string | null { return _opponentName }

// ── Pending invite holder (for waiting screen) ──────────────────
let _pendingInvite: { id: string; receiverName: string; gameType: string } | null = null
type PendingInviteListener = (p: { id: string; receiverName: string; gameType: string } | null) => void
const _pendingInviteListeners = new Set<PendingInviteListener>()

export function setPendingInvite(p: { id: string; receiverName: string; gameType: string }) {
  _pendingInvite = p
  _pendingInviteListeners.forEach(fn => { try { fn(p) } catch (e) { console.error('pending invite listener error:', e) } })
}
export function getPendingInvite() { return _pendingInvite }

// Subscribe to be notified immediately whenever setPendingInvite() is
// called — was previously a plain module variable only re-read whenever
// WaitingScreen happened to re-render for some unrelated reason (same
// class of bug the current-session store had). Since WaitingScreen stays
// permanently mounted (hidden via CSS) between uses, a Play Again on a
// SECOND game could leave it still watching the FIRST game's invite id if
// that incidental re-render didn't line up — and if an even older invite
// between the same two users had genuinely been declined at some point,
// polling that stale id would immediately (and incorrectly) report
// status: 'declined' for the brand new invite.
export function subscribePendingInvite(listener: PendingInviteListener): () => void {
  _pendingInviteListeners.add(listener)
  return () => { _pendingInviteListeners.delete(listener) }
}

// ── Logout cleanup ────────────────────────────────────────────────
// Clears only temporary active-game/navigation state — never touches
// profile data, messages, pair_progress, or anything persisted server-side.
// Called once on SIGNED_OUT (app/app/page.tsx) so a finished or in-progress
// game can never reopen automatically after the next login.
export function clearGameState() {
  console.log('CLEAR GAME STATE (logout)')
  _session = null
  _opponentName = null
  _pendingInvite = null
  _navigatingInviteIds.clear()
  _reconciledInviteIds.clear()
  _pendingInviteListeners.forEach(fn => { try { fn(null) } catch (e) { console.error('pending invite listener error:', e) } })
}


// ── Map game_type → screen name ─────────────────────────────────
export function gameScreenFor(gameType: string): string {
  if (gameType === 'connect_4') return 'connect4'
  if (gameType === 'mystery_choice') return 'mystery_choice'
  return 'tictactoe'  // tic_tac_toe + default
}

// ── ONE central function for entering an accepted game ───────────────
// Used by all three places that can bring a user into a game after an
// invite is accepted: the receiver (right after pressing Accept), the
// sender (via the realtime "accepted" event), and reconciliation (missed
// event recovery). Every one of these previously had its own separate,
// slightly-different copy of this logic — this replaces all of them.
//
// Does everything except the actual screen navigation, since `navigate()`
// only exists inside React components (useApp()) — callers do exactly:
//   const result = await enterAcceptedGame(invite, currentUserId)
//   if (result.ok) navigate(result.screen as any)
export interface EnterAcceptedGameResult {
  ok: boolean
  session?: GameSession
  screen?: string
  opponentId?: string
  error?: string
  // True only when this call was skipped because another concurrent call
  // for the same invite is already handling entry (e.g. realtime and the
  // poll fallback both firing). This is NOT a failure — the other call is
  // already navigating. Callers must never treat this as rejection/error.
  skipped?: boolean
}

const _navigatingInviteIds = new Set<string>()

export async function enterAcceptedGame(
  invite: { id: string; sender_id: string; receiver_id: string; game_type: string },
  currentUserId: string
): Promise<EnterAcceptedGameResult> {

  const guardKey = `${invite.id}`
  if (_navigatingInviteIds.has(guardKey)) {
    return { ok: false, error: 'already navigating', skipped: true }
  }
  _navigatingInviteIds.add(guardKey)

  try {
    if (currentUserId !== invite.sender_id && currentUserId !== invite.receiver_id) {
      return { ok: false, error: 'not a participant' }
    }

    // Resolve the ONE shared session — bounded retry (covers a brief
    // read-after-write lag), create only as an absolute last resort, never
    // more than once per invite (createGameSession itself is idempotent:
    // it checks for an existing row by invite_id before ever inserting).
    let session = await loadSessionByInvite(invite.id)
    let tries = 0
    while (!session && tries < 5) {
      await new Promise(r => setTimeout(r, 400))
      session = await loadSessionByInvite(invite.id)
      tries++
    }
    if (!session) {
      const created = await createGameSession(invite as GameInvite)
      session = created.session || null
      if (created.error) console.error('session creation error', created.error)
    }
    if (!session) {
      return { ok: false, error: 'no session' }
    }

    // Stale-async guard: if the user logged out (or a different account
    // logged in) while this call was awaiting the network, the identity we
    // started with is no longer the one actually signed in. Never publish
    // a session in that case — this protects every caller (Accept, the
    // sender's realtime handler, and reconciliation) uniformly, since they
    // all funnel through this one function.
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
    if (!currentAuthUser || currentAuthUser.id !== currentUserId) {
      console.log('ENTER GAME BLOCKED: authenticated user changed since this call started')
      return { ok: false, error: 'stale user' }
    }

    if (!isValidActiveGameSession(session, currentUserId)) {
      return { ok: false, error: 'session not valid/active for this user' }
    }

    setCurrentSession(session)

    const opponentId = currentUserId === session.player_one_id ? session.player_two_id : session.player_one_id
    const { data: opp } = await supabase.from('profiles').select('*').eq('id', opponentId).maybeSingle()
    if (opp) {
      const profile: UserProfile = {
        id: opp.id, name: opp.name || 'Player', age: opp.age || 0,
        photo: opp.photo || '', gradient: 'linear-gradient(135deg,#ff3384,#ff7a6e)',
        location: { en: opp.location || '', gr: opp.location || '' },
        online: true, interests: [], bio: { en: opp.bio || '', gr: opp.bio || '' },
      }
      setCurrentMatch(profile)
      setOpponentName(opp.name || 'Player')
    }

    const screen = gameScreenFor(session.game_type)

    return { ok: true, session, screen, opponentId }
  } finally {
    _navigatingInviteIds.delete(guardKey)
  }
}
