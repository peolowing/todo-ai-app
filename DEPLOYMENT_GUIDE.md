# Microsoft Graph Integration - Deployment Guide

## 📋 Översikt

Denna guide visar steg-för-steg hur du deployer Microsoft Graph-integrationen.

---

## Steg 1: Azure App Registration

Följ instruktionerna i [MICROSOFT_GRAPH_SETUP.md](./MICROSOFT_GRAPH_SETUP.md) för att:
1. Skapa Azure App Registration
2. Konfigurera API permissions
3. Få Client ID och Tenant ID

---

## Steg 2: Lokala miljövariabler

1. Kopiera `.env.local.example` till `.env.local`:
```bash
cp .env.local.example .env.local
```

2. Fyll i dina Microsoft-värden i `.env.local`:
```env
VITE_MS_CLIENT_ID=din-client-id-från-azure
VITE_MS_TENANT_ID=din-tenant-id-från-azure
VITE_MS_REDIRECT_URI=http://localhost:3001
```

---

## Steg 3: Supabase Database Setup

### 3.1 Kör migrations

1. Öppna Supabase Dashboard
2. Gå till SQL Editor
3. Kör SQL-filen `supabase/migrations/microsoft_graph_schema.sql`

Detta skapar:
- `microsoft_tokens` - Tabell för access tokens
- `microsoft_subscriptions` - Tabell för webhook subscriptions
- `synced_emails` - Tabell för att logga synkade mail
- RLS policies för säkerhet
- Index för performance

### 3.2 Verifiera tabeller

Kör i SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'microsoft_%';
```

Du ska se:
- microsoft_tokens
- microsoft_subscriptions

Och:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'synced_emails';
```

---

## Steg 4: Deploy Supabase Edge Functions

### 4.1 Installera Supabase CLI (om du inte har det)

```bash
npm install -g supabase
```

### 4.2 Logga in på Supabase

```bash
supabase login
```

### 4.3 Länka till ditt projekt

```bash
supabase link --project-ref din-projekt-ref
```

Din projekt-ref hittar du i Supabase Dashboard URL:
`https://supabase.com/dashboard/project/[PROJEKT-REF]`

### 4.4 Deploy Edge Functions

```bash
# Deploy webhook function
supabase functions deploy ms-webhook

# Deploy create subscription function
supabase functions deploy create-ms-subscription

# Deploy remove subscription function
supabase functions deploy remove-ms-subscription
```

### 4.5 Sätt miljövariabler för Edge Functions

I Supabase Dashboard:
1. Gå till **Edge Functions** → **Settings**
2. Lägg till secrets:
   - `SUPABASE_URL` = din Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY` = din Service Role Key (finns under Settings → API)

Eller via CLI:
```bash
supabase secrets set SUPABASE_URL=https://din-projekt.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
```

---

## Steg 5: Uppdatera Azure Redirect URIs

1. Gå till Azure Portal → App registrations
2. Välj din app
3. Gå till **Authentication**
4. Lägg till din webhook URL under **Web** platform:
   ```
   https://din-projekt.supabase.co/functions/v1/ms-webhook
   ```
5. Lägg även till din production frontend URL under **Single-page application**:
   ```
   https://din-app-url.com
   ```

---

## Steg 6: Testa lokalt

### 6.1 Starta dev server

```bash
npm run dev
```

### 6.2 Testa integrationen

1. Öppna `http://localhost:3001`
2. Logga in på din todo-app
3. Gå till **Inställningar** → **Microsoft Outlook**
4. Klicka på **"Anslut Microsoft Outlook"**
5. Logga in med ditt Microsoft-konto
6. Godkänn permissions

### 6.3 Testa manuell synk

1. Flagga ett mail i Outlook
2. Klicka på **"Synka nu"** i todo-appen
3. Kontrollera att mailet blev en task

**OBS**: Webhook fungerar INTE lokalt eftersom Microsoft Graph inte kan nå localhost. För att testa webhooks lokalt:

1. Använd **ngrok** för att exponera din lokala server:
   ```bash
   ngrok http 54321
   ```
2. Uppdatera `notificationUrl` i `create-ms-subscription/index.ts` till ngrok URL
3. Eller använd Supabase local development (se nedan)

---

## Steg 7: Production Deployment

### 7.1 Uppdatera production miljövariabler

I din hosting-plattform (Vercel, Netlify, etc.), sätt:
```env
VITE_MS_CLIENT_ID=din-client-id
VITE_MS_TENANT_ID=din-tenant-id
VITE_MS_REDIRECT_URI=https://din-production-url.com
```

### 7.2 Deploy frontend

```bash
npm run build
# eller
vercel deploy --prod
```

### 7.3 Testa i production

1. Gå till din production URL
2. Anslut Microsoft Outlook
3. Flagga ett mail i Outlook
4. Vänta upp till 5 minuter
5. Kontrollera att mailet blev en task

---

## 🔧 Troubleshooting

### Edge Functions körs inte

**Problem**: Edge Functions ger timeout eller error

**Lösning**:
1. Kontrollera logs i Supabase Dashboard → Edge Functions → Logs
2. Verifiera att secrets är satta korrekt
3. Kör `supabase functions deploy FUNCTION_NAME --debug`

### Webhook får ingen data

**Problem**: Mail synkas inte automatiskt

**Lösning**:
1. Kontrollera att subscription är aktiv i databas:
   ```sql
   SELECT * FROM microsoft_subscriptions;
   ```
2. Kontrollera expiration_date_time - subscriptions går ut efter 1 timme
3. Implementera subscription renewal (kom ihåg att förnya innan den går ut)
4. Kontrollera logs i Edge Functions

### "Permission denied" error

**Problem**: Kan inte logga in på Microsoft

**Lösning**:
1. Kontrollera att admin consent är given i Azure
2. Kontrollera att redirect URI matchar exakt
3. Testa logga ut och logga in igen
4. Kontrollera att scopes är korrekt i `msAuthConfig.js`

### Token expired

**Problem**: "Token expired" efter en tid

**Lösning**:
1. Implementera token refresh (använd `offline_access` scope)
2. Kontrollera att `expires_at` uppdateras korrekt
3. Använd `acquireTokenSilent()` för att hämta nya tokens

### Dubletter av tasks

**Problem**: Samma mail skapar flera tasks

**Lösning**:
1. Kontrollera att `synced_emails` tabell används korrekt
2. UNIQUE constraint på (email_id, user_id) förhindrar dubletter
3. Kontrollera webhook-logiken

---

## 📊 Monitoring

### Övervaka subscriptions

Kör i SQL Editor för att se aktiva subscriptions:
```sql
SELECT
  user_id,
  subscription_id,
  expiration_date_time,
  created_at
FROM microsoft_subscriptions
WHERE expiration_date_time > NOW()
ORDER BY expiration_date_time;
```

### Övervaka synkade mail

```sql
SELECT
  email_subject,
  email_from,
  synced_at,
  COUNT(*) as count
FROM synced_emails
GROUP BY email_subject, email_from, synced_at
ORDER BY synced_at DESC
LIMIT 20;
```

### Edge Function logs

I Supabase Dashboard:
1. Gå till **Edge Functions**
2. Välj function
3. Klicka på **Logs**

---

## 🔄 Subscription Renewal

Microsoft Graph subscriptions går ut efter en viss tid (max 3 dagar för mail).

För production, implementera automatisk renewal:

### Option 1: Scheduled Edge Function

Skapa en scheduled Edge Function som körs varje timme och förnyr subscriptions:

```typescript
// supabase/functions/renew-ms-subscriptions/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Hitta subscriptions som går ut inom 1 timme
  const { data: expiring } = await supabase
    .from('microsoft_subscriptions')
    .select('*')
    .lt('expiration_date_time', new Date(Date.now() + 3600000).toISOString())

  for (const sub of expiring || []) {
    // Förnya subscription via Microsoft Graph
    // ... (implementera renewal-logik)
  }

  return new Response('OK')
})
```

Schemalägg med Supabase Cron:
```sql
SELECT cron.schedule(
  'renew-ms-subscriptions',
  '0 * * * *', -- Varje timme
  'SELECT net.http_post(
    url := ''https://din-projekt.supabase.co/functions/v1/renew-ms-subscriptions'',
    headers := ''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}''::jsonb
  )'
);
```

---

## ✅ Checklist för Go-Live

- [ ] Azure App Registration konfigurerad
- [ ] API permissions godkända av admin
- [ ] Redirect URIs satta för både dev och prod
- [ ] Supabase tabeller skapade
- [ ] RLS policies aktiverade
- [ ] Edge Functions deployade
- [ ] Edge Function secrets satta
- [ ] Production miljövariabler konfigurerade
- [ ] Frontend deployad
- [ ] Testat ansluta Microsoft-konto
- [ ] Testat flagga mail och se det som task
- [ ] Webhook fungerar i production
- [ ] Monitoring/logging implementerat
- [ ] Subscription renewal implementerat (för production)

---

## 📚 Nästa steg

Efter deployment, överväg att lägga till:

1. **Bi-direktional sync** - Markera mail som läst när task blir klar
2. **Kalender-integration** - Synka Outlook-kalender med tasks
3. **Mer filtreringsalternativ** - Kategori, avsändare, ämnesrad
4. **Batch-synk** - Synka äldre mail
5. **Notifikationer** - Real-time notiser när mail synkas
6. **Analytics** - Dashboard för synk-statistik

God lycka! 🚀
