import { Client, Room } from '@colyseus/sdk'

// Singleton — avoids creating multiple global clients / duplicate
// underlying connections. Created lazily so this module has no effect
// at all unless the Colyseus engine is actually used.
let client: Client | null = null

function getClient(): Client {
  const url = process.env.NEXT_PUBLIC_COLYSEUS_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_COLYSEUS_URL is not set')
  }
  if (!client) {
    client = new Client(url)
  }
  return client
}

// Tracks an in-flight join for a given matchId, so a second call while
// one is already in progress (e.g. a fast re-render/effect re-run)
// reuses the same promise instead of starting a second, competing join
// attempt for the same room.
const inFlightJoins = new Map<string, Promise<Room>>()

/**
 * Joins (or creates, if this device is first) the Tic Tac Toe Colyseus
 * room for the given canonical DateDuel session id. The Supabase access
 * token is attached via the Colyseus client's own auth mechanism —
 * verified server-side in TicTacToeRoom.onAuth(); never trusted as-is by
 * the room. matchId is the only join option sent; the room derives
 * everything else (participants, symbols, turn) from Supabase itself.
 */
export async function joinTicTacToeRoom(matchId: string, accessToken: string): Promise<Room> {
  const existing = inFlightJoins.get(matchId)
  if (existing) return existing

  const join = (async () => {
    const c = getClient()
    c.auth.token = accessToken
    try {
      return await c.joinOrCreate('tic_tac_toe', { matchId })
    } finally {
      inFlightJoins.delete(matchId)
    }
  })()

  inFlightJoins.set(matchId, join)
  return join
}

/**
 * Leaves a room cleanly. Safe to call even if the room reference is
 * already gone/stale — never throws.
 */
export async function leaveRoom(room: Room | null | undefined): Promise<void> {
  if (!room) return
  try {
    await room.leave()
  } catch {
    // Already disconnected / room already gone — nothing further to do.
  }
}
