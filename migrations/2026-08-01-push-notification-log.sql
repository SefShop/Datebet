-- Web Push Phase 3: push_notification_log table.
-- Run this once in the Supabase SQL editor.
--
-- Server-side idempotency guard for push sends. The unique constraint
-- on (event_type, event_id, recipient_id) is the actual mechanism: the
-- send route inserts a row BEFORE sending, and if that insert fails
-- with a unique violation, the event has already been handled — the
-- route returns duplicate: true and sends nothing, rather than the
-- route trying to detect duplicates by some less atomic check.

CREATE TABLE IF NOT EXISTS push_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, event_id, recipient_id)
);

-- No RLS/client access needed — this table is only ever read or written
-- by server-only route code using the service-role key. Ordinary
-- clients have no reason to query it directly, so it intentionally has
-- no public policies at all (RLS stays disabled, matching the fact that
-- no anon/authenticated role is ever granted access to it).
