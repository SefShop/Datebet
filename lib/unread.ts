import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { console.log('UNREAD: no user'); return 0 }

    console.log('UNREAD QUERY USER:', user.id)

    // Try with read_at filter first
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null)

    if (error) {
      console.error('UNREAD COUNT error:', error.message)
      // Fallback: count ALL received messages (read_at column may not exist)
      const { count: fallbackCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
      console.log('UNREAD FALLBACK COUNT:', fallbackCount)
      return fallbackCount ?? 0
    }

    console.log('UNREAD COUNT RESULT:', count)
    return count ?? 0
  } catch (e: any) {
    console.error('UNREAD catch:', e)
    return 0
  }
}

export async function markAsRead(partnerId: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('receiver_id', user.id)
      .eq('sender_id', partnerId)
      .is('read_at', null)

    if (error) console.error('MARK READ error:', error.message)
    else console.log('MARKED READ: messages from', partnerId)
  } catch (e) { console.error('MARK READ catch:', e) }
}
