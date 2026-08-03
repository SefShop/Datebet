-- Web Push refinement: active_chat_presence table.
-- Run this once in the Supabase SQL editor.
--
-- Server-visible, trustworthy record of which conversation a user is
-- currently viewing — used by the message-push route to suppress a
-- push when the recipient is already looking at the exact conversation.
-- Never trusts a client-supplied boolean; the sender's request can
-- never claim this on the recipient's behalf, since this row is only
-- ever written by the viewing user themselves, about their own device.

CREATE TABLE IF NOT EXISTS active_chat_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  other_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_key text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, other_user_id, device_key)
);

CREATE INDEX IF NOT EXISTS active_chat_presence_lookup_idx
  ON active_chat_presence(user_id, other_user_id, active, last_seen);

ALTER TABLE active_chat_presence ENABLE ROW LEVEL SECURITY;

-- A user can only ever see, create, modify, or delete rows about their
-- OWN presence — never write a row on someone else's behalf, and never
-- read another user's active-chat state. The message-push route reads
-- this via the service-role key server-side, which bypasses RLS by
-- design — safe only because that code runs exclusively in server-only
-- route files.

CREATE POLICY "select own active chat presence" ON active_chat_presence
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own active chat presence" ON active_chat_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own active chat presence" ON active_chat_presence
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete own active chat presence" ON active_chat_presence
  FOR DELETE USING (auth.uid() = user_id);
