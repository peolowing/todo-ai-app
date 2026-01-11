# Deploya Edge Function till Supabase

## Alternativ 1: Via Supabase Dashboard (Enklast!)

### Steg 1: Gå till Edge Functions
1. Öppna https://supabase.com/dashboard
2. Välj ditt projekt
3. Gå till **Edge Functions** i vänster menyn

### Steg 2: Skapa ny funktion
1. Klicka **"Create a new function"**
2. Namn: `email-to-note`
3. Klicka **Create function**

### Steg 3: Kopiera koden
Öppna filen: `/Users/ola/Documents/todo-ai-app/supabase/functions/email-to-note/index.ts`

Kopiera HELA innehållet från den filen och klistra in i editorn i Supabase Dashboard.

### Steg 4: Deploya
1. Klicka **Deploy** (gröna knappen)
2. Vänta på att deployment är klar
3. Kopiera **Function URL** som visas efter deployment
   - Den ser ut så här: `https://[projekt-id].supabase.co/functions/v1/email-to-note`

---

## Alternativ 2: Via CLI (Om du vill)

### Steg 1: Skaffa Access Token
1. Gå till https://supabase.com/dashboard/account/tokens
2. Klicka **Generate New Token**
3. Namn: "Deploy Token"
4. Kopiera token

### Steg 2: Sätt environment variable
```bash
export SUPABASE_ACCESS_TOKEN=din-token-här
```

### Steg 3: Hitta Project ID
1. Gå till https://supabase.com/dashboard
2. Välj ditt projekt
3. Settings → General → kopiera **Reference ID**

### Steg 4: Länka och deploya
```bash
npx supabase link --project-ref ditt-projekt-id
npx supabase functions deploy email-to-note
```

---

## Nästa Steg: Konfigurera Mailgun Route

När du har Function URL, följ dessa steg:

### 1. Logga in på Mailgun
https://app.mailgun.com/

### 2. Gå till Routes
- Klicka **Sending** i vänster menyn
- Klicka **Routes**

### 3. Skapa ny Route
Klicka **Create Route** och fyll i:

**Priority:** `0`

**Expression Type:** Match Recipient

**Recipient:**
```
match_recipient(".*@[din-mailgun-domän]")
```
Exempel: `match_recipient(".*@sandbox123abc.mailgun.org")`

**Actions:**
- Välj **"Forward"**
- URL: `https://[projekt-id].supabase.co/functions/v1/email-to-note`
- Method: **POST**

**Description:** `Email to Notes`

### 4. Testa!
Skicka ett testmail till:
```
notes-[ditt-user-id]@[din-mailgun-domän]
```

Du hittar ditt user-id i appen under Backup → Email till anteckningar.

---

## Troubleshooting

### Funkar inte?

**Kolla Mailgun Logs:**
1. Gå till Mailgun Dashboard
2. Klicka **Logs** i vänster menyn
3. Sök efter ditt email

**Kolla Supabase Function Logs:**
1. Gå till Supabase Dashboard
2. Edge Functions → email-to-note
3. Klicka **Logs** fliken
4. Kolla om det finns några fel

**Vanliga problem:**
- Fel User ID i email-adressen
- Mailgun Route inte aktiverad
- Supabase Function timeout (öka timeout i settings)
- CORS-problem (redan fixat i koden)
