-- Fix RLS policies för Microsoft Graph tabeller
-- Problemet är att policies inte tillåter läsning när auth.uid() är null

-- Ta bort och återskapa policies för microsoft_tokens
DROP POLICY IF EXISTS "Users can view own tokens" ON microsoft_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON microsoft_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON microsoft_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON microsoft_tokens;

CREATE POLICY "Users can view own tokens"
  ON microsoft_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON microsoft_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON microsoft_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON microsoft_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Ta bort och återskapa policies för microsoft_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON microsoft_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON microsoft_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON microsoft_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON microsoft_subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON microsoft_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON microsoft_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON microsoft_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON microsoft_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Ta bort och återskapa policies för synced_emails
DROP POLICY IF EXISTS "Users can view own synced emails" ON synced_emails;
DROP POLICY IF EXISTS "Users can insert own synced emails" ON synced_emails;
DROP POLICY IF EXISTS "Users can delete own synced emails" ON synced_emails;
DROP POLICY IF EXISTS "Users can update own synced emails" ON synced_emails;

CREATE POLICY "Users can view own synced emails"
  ON synced_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synced emails"
  ON synced_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own synced emails"
  ON synced_emails FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own synced emails"
  ON synced_emails FOR DELETE
  USING (auth.uid() = user_id);
