import { supabase, isSupabaseConfigured } from '@/lib/supabase'

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

    // Avoid duplicate pending
    const { data: existing } = await supabase
      .from('game_invites')
      .select('id')
      .eq('sender_id', user.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) return { ok: false, error: 'Invite already sent' }

    const { data, error } = await supabase.from('game_invites').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      game_type: gameType,
      status: 'pending',
      message: `${senderName} invited you to play`,
    }).select().single()

    if (error) { console.error('GAME INVITE error:', error); return { ok: false, error: error.message } }
    console.log('GAME INVITE SENT:', receiverId, gameType)
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
    return { board: Array(42).fill(''), currentTurn: null, winner: null, status: 'active', moves: 0 }
  }
  // tic_tac_toe / default
  return { board: ['','','','','','','','',''], currentTurn: null, winner: null, status: 'active', moves: 0 }
}

// Create a session when an invite is accepted (receiver side)
export async function createGameSession(invite: GameInvite): Promise<{ session?: GameSession; error?: string }> {
  try {
    // Check if session already exists for this invite
    const { data: existing } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('invite_id', invite.id)
      .maybeSingle()

    if (existing) {
      console.log('GAME SESSION LOADED:', existing.id)
      return { session: existing }
    }

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        invite_id: invite.id,
        player_one_id: invite.sender_id,
        player_two_id: invite.receiver_id,
        game_type: invite.game_type,
        status: 'active',
        state: initStateFor(invite.game_type),
      })
      .select()
      .single()

    if (error) { console.error('GAME SESSION error:', error); return { error: error.message } }
    console.log('GAME SESSION CREATED:', data.id)
    return { session: data }
  } catch (e: any) { return { error: e.message } }
}

// Load session by invite (sender side, after acceptance)
export async function loadSessionByInvite(inviteId: string): Promise<GameSession | null> {
  try {
    const { data } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('invite_id', inviteId)
      .maybeSingle()
    if (data) console.log('GAME SESSION LOADED:', data.id)
    return data
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
