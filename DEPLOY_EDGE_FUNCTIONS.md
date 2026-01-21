# Deploy Supabase Edge Functions - Steg-för-steg Guide

## 🎯 Mål
Deploya Edge Functions för automatisk synk av flaggade Outlook-mail via webhooks.

---

## Steg 1: Hämta Supabase Access Token

1. **Öppna Supabase Dashboard**: https://supabase.com/dashboard
2. Gå till **Account** (klicka på din profil längst upp till höger)
3. Gå till **Access Tokens**
4. Klicka **"Generate New Token"**
5. Namnge den: `CLI Deployment Token`
6. Kopiera token (sparas bara en gång!)

---

## Steg 2: Sätt miljövariabel

Öppna en ny terminal och kör:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_0e9c9691a03a91bf25c8dd6c2f82d31082f81871
```

**OBS**: Detta gäller bara för denna terminal-session.

---

## Steg 3: Hitta ditt Project ID

1. Gå till Supabase Dashboard
2. Välj ditt projekt
3. Gå till **Settings** → **General**
4. Under **Reference ID**, kopiera projekt-ID:t
   - Det ser ut typ: zkpqndfuwthiyzgyjwim

---

## Steg 4: Länka till projektet

I terminalen, kör:

```bash
cd /Users/ola/Documents/todo-ai-app
npx supabase link --project-ref zkpqndfuwthiyzgyjwim
```

Ersätt `DITT-PROJECT-ID` med det ID du kopierade i steg 3.

---

## Steg 5: Deploy Edge Functions

Kör dessa kommandon ett i taget:

```bash
# Deploy webhook function (tar emot notifikationer från Microsoft)
npx supabase functions deploy ms-webhook

# Deploy create subscription function (skapar webhooks)
npx supabase functions deploy create-ms-subscription

# Deploy remove subscription function (tar bort webhooks)
npx supabase functions deploy remove-ms-subscription
```

---

## Steg 6: Sätt Edge Function Secrets

Edge Functions behöver access till Supabase för att fungera.

### 6.1 Hämta Supabase URL och Keys

I Supabase Dashboard:
1. Gå till **Settings** → **API**
2. Kopiera:
   - **Project URL** (t.ex. `https://xxx.supabase.co`)
   - **anon/public key** (den publika nyckeln)
   - **service_role key** (den hemliga nyckeln, rulla ner)

### 6.2 Sätt secrets

Kör i terminalen:

```bash
# Sätt Supabase URL
npx supabase secrets set SUPABASE_URL=https://zkpqndfuwthiyzgyjwim.supabase.co

# Sätt Service Role Key (VIKTIGT: använd service_role, inte anon)
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcHFuZGZ1d3RoaXl6Z3lqd2ltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA2MjI4OCwiZXhwIjoyMDgzNjM4Mjg4fQ.WR-fsws3QaXoIXeCPca0djLmpKHCB2bTPr6cRe1lyS8

# Sätt Anon Key (för client-requests)
npx supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcHFuZGZ1d3RoaXl6Z3lqd2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjIyODgsImV4cCI6MjA4MzYzODI4OH0.bV2GTmZihc2qA4idQCW-C7p4Rr4voq3-GoD5_T98p0c
```

---

## Steg 7: Verifiera deployment

Kör för att se dina deployade functions:

```bash
npx supabase functions list
```

Du ska se:
- ✅ ms-webhook
- ✅ create-ms-subscription
- ✅ remove-ms-subscription

---

## Steg 8: Uppdatera Azure Redirect URI

Nu när Edge Functions är deployade, behöver du lägga till webhook URL i Azure:

1. Gå till Azure Portal → App registrations → Din app
2. Gå till **Authentication**
3. Under **Redirect URIs**, lägg till:
   ```
   https://xxx.supabase.co/functions/v1/ms-webhook
   ```
   (Ersätt `xxx` med ditt Supabase projekt-ID)

---

## Steg 9: Testa i appen

1. Öppna din todo-app
2. Gå till **Inställningar** → **Microsoft Outlook**
3. Klicka **"Uppdatera"** i Anslutningsstatus
4. **Webhook** borde nu visa **"Aktiv"** (grön bock)

Om inte:
- Koppla bort och anslut Microsoft-kontot igen
- Webhook skapas automatiskt vid anslutning

---

## Steg 10: Testa automatisk synk

1. **Flagga ett mail i Outlook**
2. **Vänta 30 sekunder** (Microsoft skickar notifikation)
3. **Gå till Uppgifter** i todo-appen
4. Mail ska automatiskt dyka upp under kategori **"Emails"**! 🎉

---

## 🔍 Debugging

### Kolla Edge Function Logs

I Supabase Dashboard:
1. Gå till **Edge Functions**
2. Välj function (t.ex. `ms-webhook`)
3. Klicka på **Logs**
4. Se real-time logs när webhooks triggas

### Kolla om webhook är aktiv

Kör i Supabase SQL Editor:

```sql
SELECT
  subscription_id,
  expiration_date_time,
  resource,
  notification_url
FROM microsoft_subscriptions
WHERE expiration_date_time > NOW();
```

Om tom: webhook är inte skapad eller har gått ut.

### Förnya webhook manuellt

I appen:
1. Koppla bort Microsoft Outlook
2. Anslut igen
3. Webhook skapas automatiskt

---

## 📊 Verifiera att allt fungerar

Checklista:

- [ ] Edge Functions deployade (`npx supabase functions list`)
- [ ] Secrets satta (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY)
- [ ] Azure Redirect URI uppdaterad med webhook URL
- [ ] Webhook visas som "Aktiv" i appen
- [ ] Flaggat mail skapas automatiskt som task
- [ ] Task hamnar under kategori "Emails"
- [ ] Mail loggas i `synced_emails` tabell

---

## ⚠️ Troubleshooting

### "Webhook: Inaktiv" efter deployment

**Problem**: Edge Functions är deployade men webhook skapas inte.

**Lösning**:
1. Kontrollera Edge Function logs i Supabase Dashboard
2. Kontrollera att secrets är satta korrekt:
   ```bash
   npx supabase secrets list
   ```
3. Koppla bort och anslut Microsoft-kontot igen

### "Function invocation failed"

**Problem**: Edge Function kan inte nå Supabase.

**Lösning**:
- Kontrollera att `SUPABASE_SERVICE_ROLE_KEY` är satt (INTE anon key)
- Kontrollera att URL är korrekt

### Webhook går ut efter 1 timme

**Normal behavior**: Microsoft Graph subscriptions går ut efter 1 timme (max 3 dagar för mail).

**Lösning**: Implementera subscription renewal (finns i DEPLOYMENT_GUIDE.md)

---

## 🎉 Success!

Om allt fungerar ska du nu ha:

- ✅ Automatisk synk av flaggade mail
- ✅ Real-time notifikationer
- ✅ Mail blir tasks under "Emails"
- ✅ Dublettskydd (samma mail skapas inte flera gånger)

🚀 **Din Microsoft Outlook-integration är nu helt automatiserad!**

---

## Nästa steg (Valfritt)

1. **Implementera subscription renewal** - Förnya webhooks automatiskt
2. **Lägg till fler filters** - T.ex. kategori, avsändare
3. **Bi-direktional synk** - Markera mail som läst när task är klar
4. **Kalender-integration** - Synka Outlook-kalender

Se DEPLOYMENT_GUIDE.md för mer info!
