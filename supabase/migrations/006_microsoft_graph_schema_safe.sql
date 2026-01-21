-- Microsoft Graph Integration Schema - Safe Migration
-- Detta script hanterar befintliga tabeller och policies

-- Skapa tabeller (IF NOT EXISTS säkerställer att de inte skapas om de redan finns)
CREATE TABLE IF NOT EXISTS microsoft_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS microsoft_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  change_type TEXT NOT NULL,
  notification_url TEXT NOT NULL,
  expiration_date_time TIMESTAMPTZ NOT NULL,
  client_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS synced_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  email_id TEXT NOT NULL,
  email_subject TEXT,
  email_from TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email_id, user_id)
);

-- Index för performance
CREATE INDEX IF NOT EXISTS idx_microsoft_tokens_user ON microsoft_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_microsoft_tokens_expires ON microsoft_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_microsoft_subscriptions_user ON microsoft_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_microsoft_subscriptions_subscription ON microsoft_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_microsoft_subscriptions_expiration ON microsoft_subscriptions(expiration_date_time);

CREATE INDEX IF NOT EXISTS idx_synced_emails_user ON synced_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_task ON synced_emails(task_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_email ON synced_emails(email_id);

-- Aktivera RLS
ALTER TABLE microsoft_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE microsoft_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_emails ENABLE ROW LEVEL SECURITY;

-- Ta bort befintliga policies (om de finns) och skapa nya
DROP POLICY IF EXISTS "Users can view own tokens" ON microsoft_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON microsoft_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON microsoft_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON microsoft_tokens;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON microsoft_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON microsoft_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON microsoft_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON microsoft_subscriptions;

DROP POLICY IF EXISTS "Users can view own synced emails" ON synced_emails;
DROP POLICY IF EXISTS "Users can insert own synced emails" ON synced_emails;
DROP POLICY IF EXISTS "Users can delete own synced emails" ON synced_emails;

-- Skapa policies för microsoft_tokens
CREATE POLICY "Users can view own tokens"
  ON microsoft_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON microsoft_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON microsoft_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON microsoft_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Skapa policies för microsoft_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON microsoft_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON microsoft_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON microsoft_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON microsoft_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Skapa policies för synced_emails
CREATE POLICY "Users can view own synced emails"
  ON synced_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synced emails"
  ON synced_emails FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own synced emails"
  ON synced_emails FOR DELETE
  USING (auth.uid() = user_id);

-- Function för att automatiskt rensa utgångna tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ta bort tokens som gått ut för mer än 7 dagar sedan
  DELETE FROM microsoft_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';

  -- Ta bort subscriptions som gått ut
  DELETE FROM microsoft_subscriptions
  WHERE expiration_date_time < NOW();
END;
$$;
