import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Fetch unread count for current user
export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null)

    if (error) { console.error('UNREAD COUNT error:', error); return 0 }
    console.log('UNREAD COUNT:', count)
    return count ?? 0
  } catch { return 0 }
}

// Mark messages from a partner as read
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

    if (error) console.error('MARK READ error:', error)
    else console.log('MARKED READ: messages from', partnerId)
  } catch (e) { console.error('MARK READ catch:', e) }
}
