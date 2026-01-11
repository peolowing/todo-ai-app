# Email till Anteckningar - Setup Guide

## Översikt
Med denna funktion kan du skicka email som automatiskt blir anteckningar i din app.

## Steg 1: Skapa Mailgun-konto (Gratis)

1. Gå till https://signup.mailgun.com/new/signup
2. Välj Free tier (100 emails/dag gratis)
3. Verifiera ditt konto

## Steg 2: Konfigurera Mailgun Route

1. Logga in på Mailgun dashboard
2. Gå till **Sending** → **Domain Settings** → välj din sandbox-domän (eller egen domän)
3. Gå till **Routes** under vänster meny
4. Klicka **Create Route**
5. Konfigurera så här:
   - **Priority**: 0
   - **Expression**: `match_recipient(".*@yourdomain.mailgun.org")`
     (byt yourdomain till din Mailgun sandbox-domän)
   - **Actions**:
     - Välj "Forward"
     - URL: Din Supabase Edge Function URL (se steg 3)
   - **Description**: "Email to Notes"
6. Spara

## Steg 3: Deploya Supabase Edge Function

1. Installera Supabase CLI om du inte har det:
   ```bash
   npm install -g supabase
   ```

2. Logga in på Supabase:
   ```bash
   supabase login
   ```

3. Länka ditt projekt:
   ```bash
   supabase link --project-ref <ditt-projekt-id>
   ```

4. Deploya Edge Function:
   ```bash
   supabase functions deploy email-to-note
   ```

5. Notera URL:en som visas efter deployment, t.ex:
   ```
   https://<projekt-id>.supabase.co/functions/v1/email-to-note
   ```

6. Gå tillbaka till Mailgun och uppdatera Route med denna URL

## Steg 4: Hitta din Email-adress

Din unika email-adress för att skapa anteckningar är:
```
notes-<ditt-user-id>@<mailgun-domän>
```

Du hittar detta i appen under din profil/inställningar.

## Hur det fungerar

1. Du skickar ett email till din unika adress
2. Mailgun tar emot emailet och skickar det till Supabase Edge Function
3. Edge Function skapar en ny anteckning med:
   - **Titel**: Email-ämne
   - **Innehåll**: Email-text
   - **Kategori**: "Email"

## Troubleshooting

- **Funkar inte?**
  - Kolla Mailgun logs: Dashboard → Logs
  - Kolla Supabase Function logs: Dashboard → Edge Functions → email-to-note → Logs

- **User ID?**
  - Logga in i appen och gå till inställningar för att se din email-adress

## Alternativ: Använda egen domän

Om du har en egen domän kan du:
1. Lägga till den i Mailgun
2. Verifiera med DNS-records
3. Använda fin email-adress som notes@dindoman.se
