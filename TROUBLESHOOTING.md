# Microsoft Graph Integration - Troubleshooting

## Problem: "interaction_in_progress" error

### Symptom
När du klickar på "Anslut Microsoft Outlook" får du felmeddelandet:
```
Kunde inte ansluta till Microsoft: interaction_in_progress
```

### Lösningar

#### 1. Rensa browser cache och localStorage
```javascript
// I browser console:
localStorage.clear()
sessionStorage.clear()
```
Sedan ladda om sidan (Cmd+Shift+R / Ctrl+Shift+R)

#### 2. Kontrollera att endast EN login-popup är öppen
- Stäng alla popup-fönster
- Försök igen
- Klicka bara EN gång på knappen

#### 3. Vänta 30 sekunder
Om en interaction redan pågår, vänta 30 sekunder och försök igen.

#### 4. Kontrollera Azure Redirect URI
I Azure Portal → App registrations → Din app → Authentication:
- Måste vara exakt: `http://localhost:3001` (för lokal dev)
- Platform: **Single-page application (SPA)**
- INTE "Web"

#### 5. Verifiera miljövariabler
Kontrollera att `.env.local` innehåller:
```env
VITE_MS_CLIENT_ID=2f527d59-6740-4c86-9d75-1a1a7d4590d3
VITE_MS_TENANT_ID=52607fdf-0d52-432d-9c87-602bcfd101b5
VITE_MS_REDIRECT_URI=http://localhost:3001
```

Starta om dev-servern:
```bash
# Stoppa servern (Ctrl+C)
npm run dev
```

---

## Problem: Popup blockerad av browser

### Symptom
Ingen popup öppnas när du klickar på "Anslut Microsoft Outlook"

### Lösningar

1. **Tillåt popups för localhost**
   - Chrome: Klicka på ikonen i adressfältet → "Tillåt popups"
   - Firefox: Inställningar → Sekretess → Popup-blockering
   - Safari: Inställningar → Webbplatser → Popup-fönster

2. **Använd redirect istället för popup**
   I `MicrosoftIntegration.jsx`, ändra:
   ```javascript
   const loginResponse = await instance.loginRedirect(loginRequest)
   ```

---

## Problem: "Invalid client" eller "AADSTS" error

### Symptom
Azure returnerar fel med AADSTS-kod

### Lösningar

#### AADSTS50011: Redirect URI mismatch
Redirect URI i Azure måste matcha exakt:
- Dev: `http://localhost:3001`
- Prod: `https://din-app-url.com`
- **INGET avslutande /**

#### AADSTS65001: Consent required
Admin consent krävs:
1. Azure Portal → App registrations → API permissions
2. Klicka **"Grant admin consent for [Din organisation]"**

#### AADSTS700016: Application not found
Client ID är fel. Kontrollera:
```javascript
// .env.local
VITE_MS_CLIENT_ID=2f527d59-6740-4c86-9d75-1a1a7d4590d3
```

---

## Problem: Token expired

### Symptom
Efter en tid slutar synkningen att fungera

### Lösningar

Tokens går ut efter en timme. Implementera refresh:
```javascript
// I MicrosoftIntegration.jsx
const response = await instance.acquireTokenSilent({
  ...loginRequest,
  account: accounts[0]
})
```

Detta är redan implementerat i `handleMicrosoftLogin`.

---

## Problem: Subscription skapas inte

### Symptom
Kan logga in, men mail synkas inte

### Lösningar

1. **Kontrollera Edge Function är deployad**
```bash
supabase functions list
```

2. **Kontrollera Edge Function logs**
I Supabase Dashboard → Edge Functions → Logs

3. **Webhook URL måste vara publik**
Lokal development fungerar INTE för webhooks eftersom Microsoft Graph inte kan nå localhost.

För lokal testing:
- Använd **ngrok**: `ngrok http 54321`
- Eller använd endast **manuell synk** (knappen "Synka nu")

---

## Problem: Mail synkas inte automatiskt

### Symptom
Manuell synk fungerar, men automatisk synk fungerar inte

### Förklaring
För att automatisk synk ska fungera krävs:
1. Edge Functions deployade i production
2. Publik webhook URL
3. Subscription aktiv i Microsoft Graph

**För lokal development**: Använd "Synka nu"-knappen istället för automatisk synk.

**För production**:
1. Deploy Edge Functions: `supabase functions deploy ms-webhook`
2. Verifiera webhook URL är publik
3. Kontrollera subscription i databas:
```sql
SELECT * FROM microsoft_subscriptions;
```

---

## Problem: Dubletter av tasks

### Symptom
Samma mail skapar flera tasks

### Lösningar

Kontrollera `synced_emails` tabell:
```sql
SELECT email_id, COUNT(*) as count
FROM synced_emails
GROUP BY email_id
HAVING COUNT(*) > 1;
```

Om dubletter finns, kör cleanup:
```sql
DELETE FROM synced_emails
WHERE id NOT IN (
  SELECT MIN(id)
  FROM synced_emails
  GROUP BY email_id, user_id
);
```

---

## Debug-tips

### 1. Browser Console
Öppna Developer Tools (F12) och kolla Console för errors

### 2. Network Tab
Kontrollera att requests till Microsoft Graph och Supabase lyckas

### 3. MSAL Debug Mode
I `msAuthConfig.js`, lägg till:
```javascript
system: {
  loggerOptions: {
    loggerCallback: (level, message, containsPii) => {
      if (containsPii) return
      console.log(message)
    },
    logLevel: 'Verbose'
  }
}
```

### 4. Supabase Logs
Dashboard → Logs → Kontrollera Edge Function logs

### 5. Test MSAL State
I browser console:
```javascript
// Kolla aktiv account
const accounts = msalInstance.getAllAccounts()
console.log(accounts)

// Kolla cache
console.log(localStorage)
```

---

## Vanliga misstag

1. ❌ Glömt starta om dev-server efter .env.local-ändringar
2. ❌ Fel platform i Azure (måste vara SPA, inte Web)
3. ❌ Ingen admin consent i Azure
4. ❌ Redirect URI har avslutande `/`
5. ❌ Flera popups öppnas samtidigt
6. ❌ Testar webhooks lokalt (fungerar inte utan ngrok)

---

## Behöver mer hjälp?

1. Kontrollera [MICROSOFT_GRAPH_SETUP.md](./MICROSOFT_GRAPH_SETUP.md)
2. Kontrollera [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
3. Kolla browser console för errors
4. Kolla Supabase Edge Function logs
