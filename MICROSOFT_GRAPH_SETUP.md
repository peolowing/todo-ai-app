# Microsoft Graph Integration Setup Guide

## Steg 1: Azure App Registration

### 1.1 Gå till Azure Portal
Besök: https://portal.azure.com/
- Logga in med ditt Microsoft-konto
- Navigera till **Azure Active Directory** (eller **Microsoft Entra ID**)

### 1.2 Skapa App Registration
1. Klicka på **App registrations** i vänstermenyn
2. Klicka på **+ New registration**
3. Fyll i:
   - **Name**: `Todo AI Mail Sync` (eller valfritt namn)
   - **Supported account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**:
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:3001` (för development)
     - Lägg även till: `https://din-production-url.com` (för production)
4. Klicka på **Register**

### 1.3 Konfigurera API Permissions
1. I din nya app, klicka på **API permissions** i vänstermenyn
2. Klicka på **+ Add a permission**
3. Välj **Microsoft Graph**
4. Välj **Delegated permissions**
5. Lägg till följande permissions:
   - `User.Read` (för användarinfo)
   - `Mail.Read` (för att läsa mail)
   - `Mail.ReadWrite` (för att markera mail som lästa)
   - `offline_access` (för refresh tokens)
6. Klicka på **Add permissions**
7. **VIKTIGT**: Klicka på **Grant admin consent for [Din organisation]**
   - Detta krävs för att användare inte ska behöva godkänna varje gång

### 1.4 Konfigurera Subscription Webhook (för Supabase Edge Function)
1. Gå till **Expose an API** (inte nödvändigt för denna setup)
2. **Certificates & secrets** behövs INTE för SPA (vi använder implicit flow)

### 1.5 Spara viktiga värden
Gå till **Overview** och kopiera:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Program-ID (klient)
:
2f527d59-6740-4c86-9d75-1a1a7d4590d3
Objekt-ID
:
60c447ec-627d-4128-8378-fb9e2c0e6a8f
Katalog-ID (klientorganisation)
:
52607fdf-0d52-432d-9c87-602bcfd101b5


Dessa värden behöver du i nästa steg!

---

## Steg 2: Konfigurera miljövariabler

Skapa en `.env.local` fil i projektroten:

```env
VITE_MS_CLIENT_ID=din-client-id-här
VITE_MS_TENANT_ID=din-tenant-id-här
VITE_MS_REDIRECT_URI=http://localhost:3001
```

**OBS**: Lägg till `.env.local` i din `.gitignore` om den inte redan finns där!

---

## Steg 3: Supabase Database Schema

Kör följande SQL i Supabase SQL Editor för att skapa nödvändiga tabeller:

```sql
-- Tabell för att spara Microsoft Graph tokens
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

-- Tabell för att spara Microsoft Graph subscriptions
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

-- Tabell för att logga synkade mail
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
CREATE INDEX IF NOT EXISTS idx_microsoft_subscriptions_user ON microsoft_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_user ON synced_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_emails_task ON synced_emails(task_id);
```

---

## Steg 4: Supabase Edge Functions

### 4.1 Installera Supabase CLI (om du inte har det)
```bash
npm install -g supabase
```

### 4.2 Logga in
```bash
supabase login
```

### 4.3 Edge Functions skapas i separata steg (se implementationen)

---

## Steg 5: Testa integrationen

1. Starta din lokala dev-server: `npm run dev`
2. Logga in i din todo-app
3. Gå till Settings/Inställningar
4. Klicka på "Connect Microsoft Outlook"
5. Logga in med ditt Microsoft-konto
6. Godkänn permissions
7. Flagga ett mail i Outlook
8. Mail ska automatiskt dyka upp som en task!

---

## Troubleshooting

### "Login failed" eller redirect error
- Kontrollera att redirect URI i Azure matchar exakt `http://localhost:3001`
- Kontrollera att client ID och tenant ID är korrekta i `.env.local`

### "Permission denied"
- Kontrollera att admin consent är given i Azure Portal
- Försök logga ut och logga in igen

### Webhook fungerar inte
- Webhook kräver en publikt tillgänglig URL
- För local testing: Använd ngrok eller Supabase local dev
- Kontrollera att Edge Function är deployad

### Token expired
- Refresh token implementationen ska hantera detta automatiskt
- Om problem kvarstår, koppla bort och återanslut Microsoft-kontot

---

## Nästa steg

När allt fungerar lokalt:
1. Uppdatera Azure App Registration redirect URI med din production URL
2. Uppdatera `.env` variabler för production
3. Deploya Supabase Edge Functions
4. Testa i production!
