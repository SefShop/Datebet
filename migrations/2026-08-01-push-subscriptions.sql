-- Web Push Phase 1: push_subscriptions table.
-- Run this once in the Supabase SQL editor.
--
-- One row per browser/device subscription. Multiple rows per user_id
-- are expected and required — a user signed in on phone + desktop +
-- tablet needs one subscription per device, none of which should ever
-- overwrite another.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_label text NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user can only ever see, create, modify, or delete their OWN
-- subscriptions — never another user's endpoint, p256dh, or auth key.
-- No policy here grants any client the ability to read or target
-- another user's row. Sending pushes (a later phase) will use the
-- service-role key server-side, which bypasses RLS by design — that is
-- safe only because that code runs exclusively in server-only route
-- files and the key is never exposed to the browser.

CREATE POLICY "select own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
