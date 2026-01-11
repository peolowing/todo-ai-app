# Steg-för-steg Setup Guide

## 📋 Förutsättningar

- Node.js (v18 eller senare)
- Git
- En texteditor (VS Code rekommenderas)
- Konton på:
  - GitHub
  - Supabase
  - OpenAI
  - Vercel

## 🚀 Komplett Setup

### Steg 1: Skapa GitHub Repository

```bash
# Gå till projektmappen
cd todo-ai-app

# Initiera git
git init

# Lägg till alla filer
git add .

# Första commit
git commit -m "Initial commit: AI ToDo App"

# Skapa ett nytt repo på GitHub, sedan:
git remote add origin https://github.com/DITT-ANVÄNDARNAMN/todo-ai-app.git
git branch -M main
git push -u origin main
```

### Steg 2: Konfigurera Supabase

1. **Skapa projekt:**
   - Gå till https://supabase.com
   - Klicka "New Project"
   - Välj organisation och namnge projektet "todo-ai-app"
   - Välj region (Stockholm för bäst prestanda i Sverige)
   - Välj ett starkt database password
   - Klicka "Create new project"

2. **Kör database migration:**
   - Gå till "SQL Editor" i Supabase dashboard
   - Klicka "New Query"
   - Kopiera innehållet från `supabase/migrations/001_initial_schema.sql`
   - Klistra in och klicka "Run"

3. **Hämta API credentials:**
   - Gå till Settings > API
   - Kopiera "Project URL" (sparas som VITE_SUPABASE_URL)
   - Kopiera "anon public" key (sparas som VITE_SUPABASE_ANON_KEY)

4. **Konfigurera Email Auth (valfritt):**
   - Gå till Authentication > Providers
   - Aktivera "Email" provider
   - Konfigurera Email Templates om du vill anpassa mailet

### Steg 3: Konfigurera OpenAI

1. **Skapa API Key:**
   - Gå till https://platform.openai.com
   - Klicka på din profil > "API Keys"
   - Klicka "Create new secret key"
   - Namnge nyckeln "ToDo App"
   - Kopiera nyckeln (visas bara en gång!)

2. **Lägg till credits:**
   - Gå till Billing
   - Lägg till betalningsmetod
   - Köp credits (rekommenderat: $10 för att börja)

### Steg 4: Lokala Environment Variables

Skapa en `.env` fil i projektets rot:

```env
VITE_SUPABASE_URL=https://dittproject.supabase.co
VITE_SUPABASE_ANON_KEY=din-långa-anon-nyckel-här
VITE_OPENAI_API_KEY=sk-din-openai-nyckel-här
```

⚠️ **Viktigt:** Lägg ALDRIG till `.env` filen i Git! Den är redan i `.gitignore`.

### Steg 5: Installera och Testa Lokalt

```bash
# Installera dependencies
npm install

# Starta utvecklingsserver
npm run dev
```

Öppna http://localhost:3000 i din webbläsare.

**Testa funktionaliteten:**
1. Skapa ett konto
2. Logga in
3. Testa AI-funktionen med fritext
4. Skapa några uppgifter manuellt
5. Testa filter och listor

### Steg 6: Deploy till Vercel

**Alternativ A: Via GitHub (Rekommenderat)**

1. Gå till https://vercel.com
2. Klicka "Add New Project"
3. Import från GitHub
4. Välj ditt todo-ai-app repository
5. Konfigurera projektet:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Lägg till Environment Variables:
   ```
   VITE_SUPABASE_URL=https://dittproject.supabase.co
   VITE_SUPABASE_ANON_KEY=din-anon-nyckel
   VITE_OPENAI_API_KEY=sk-din-openai-nyckel
   ```
7. Klicka "Deploy"

**Alternativ B: Via Vercel CLI**

```bash
# Installera Vercel CLI
npm i -g vercel

# Logga in
vercel login

# Deploy
vercel

# Följ promptsen och lägg till environment variables när du tillfrågas

# För production deployment
vercel --prod
```

### Steg 7: Konfigurera Supabase för Production

1. Gå till ditt Supabase projekt
2. Settings > API > "Configuration"
3. Lägg till din Vercel URL under "Site URL":
   ```
   https://ditt-projekt.vercel.app
   ```
4. Lägg även till den under "Redirect URLs"

### Steg 8: Verifiera Deployment

1. Besök din Vercel URL
2. Testa att skapa ett konto
3. Kontrollera att du får bekräftelsemailet
4. Testa att skapa uppgifter med AI
5. Testa alla funktioner

## 🔧 Felsökning

### Problem: "Missing Supabase environment variables"
**Lösning:** Kontrollera att du har lagt till VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY i .env

### Problem: "OpenAI API error"
**Lösning:** 
- Kontrollera att din API-nyckel är korrekt
- Verifiera att du har credits kvar på ditt OpenAI-konto
- Se till att nyckeln börjar med "sk-"

### Problem: "Auth error" vid inloggning
**Lösning:**
- Kontrollera att email provider är aktiverad i Supabase
- Se till att Site URL är korrekt konfigurerad
- Kolla spam-mappen för bekräftelsemailet

### Problem: Kan inte se uppgifter
**Lösning:**
- Kontrollera att database migration kördes korrekt
- Verifiera RLS policies i Supabase
- Se till att du är inloggad med rätt användare

### Problem: Build fails på Vercel
**Lösning:**
- Kontrollera att alla environment variables är korrekta
- Se till att Node version är kompatibel (18+)
- Kolla build logs för specifika felmeddelanden

## 📱 Nästa Steg

Efter framgångsrik deployment:

1. **Förbättra säkerheten:**
   - Flytta OpenAI-anrop till en Vercel Serverless Function
   - Implementera rate limiting

2. **Lägg till funktioner:**
   - Push-notifieringar för deadlines
   - Dela uppgifter med andra användare
   - Kalenderintegration
   - Mörkt tema

3. **Optimera:**
   - Lägg till caching
   - Optimera bilder och assets
   - Implementera lazy loading

4. **Monitorering:**
   - Sätt upp Vercel Analytics
   - Lägg till error tracking (t.ex. Sentry)
   - Implementera logging

## 💡 Tips

- Använd Git branches för nya funktioner
- Testa alltid lokalt innan deploy
- Håll dina API-nycklar säkra
- Backup din Supabase databas regelbundet
- Övervaka din OpenAI usage för att undvika oväntade kostnader

## 🆘 Behöver du hjälp?

- Supabase Docs: https://supabase.com/docs
- OpenAI Docs: https://platform.openai.com/docs
- Vercel Docs: https://vercel.com/docs
- React Docs: https://react.dev
