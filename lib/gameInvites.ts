import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { generateMysteryQuestions, toRoundData } from '@/lib/mysteryChoiceQuestions'

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
    // any number of questions without any change needed here.
    // Each round keeps id/question/optionA/optionB (for validation) PLUS the
    // existing emoji/en/gr fields the game screen already renders — the UI
    // is unaffected, it just gets a couple of extra, unused fields.
    const generated = generateMysteryQuestions().map(q => {
      const base = toRoundData(q)
      return { id: q.id, question: q.question, optionA: q.optionA, optionB: q.optionB, ...base }
    })
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
export function setCurrentSession(s: GameSession) { _session = s; console.log('SESSION ID:', s.id) }
export function getCurrentSession(): GameSession | null { return _session }

// ── Opponent name holder (for game screens) ─────────────────────
let _opponentName: string | null = null
export function setOpponentName(n: string) { _opponentName = n; console.log('OPPONENT PROFILE:', n) }
export function getOpponentName(): string | null { return _opponentName }

// ── Pending invite holder (for waiting screen) ──────────────────
let _pendingInvite: { id: string; receiverName: string; gameType: string } | null = null
export function setPendingInvite(p: { id: string; receiverName: string; gameType: string }) { _pendingInvite = p }
export function getPendingInvite() { return _pendingInvite }


// ── Map game_type → screen name ─────────────────────────────────
export function gameScreenFor(gameType: string): string {
  if (gameType === 'connect_4') return 'connect4'
  if (gameType === 'mystery_choice') return 'mystery_choice'
  return 'tictactoe'  // tic_tac_toe + default
}
