# AI ToDo App

En intelligent uppgiftshanterare byggd med React, Supabase och OpenAI.

## 🚀 Funktioner

- ✅ Skapa och hantera uppgifter
- 🤖 AI-driven uppgiftsskapande från fritext
- 📅 Deadlines och prioriteringar
- 📝 Deluppgifter (subtasks)
- 📋 Listor och kategorier
- 🔄 Realtidsuppdateringar
- 🔐 Säker autentisering med Supabase

## 🛠️ Teknisk Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS + Framer Motion
- **Backend:** Supabase (PostgreSQL + Auth)
- **AI:** OpenAI GPT-4
- **Deployment:** Vercel
- **Version Control:** Git + GitHub

## 📦 Installation

### 1. Klona projektet

```bash
git clone <din-repo-url>
cd todo-ai-app
```

### 2. Installera dependencies

```bash
npm install
```

### 3. Konfigurera environment variables

Skapa en `.env` fil i projektets rot:

```env
VITE_SUPABASE_URL=din_supabase_url
VITE_SUPABASE_ANON_KEY=din_supabase_anon_key
VITE_OPENAI_API_KEY=din_openai_api_key
```

### 4. Konfigurera Supabase

1. Skapa ett nytt projekt på [supabase.com](https://supabase.com)
2. Gå till SQL Editor och kör migrationen i `supabase/migrations/001_initial_schema.sql`
3. Kopiera din Project URL och anon key från Settings > API

### 5. Konfigurera OpenAI

1. Skapa ett konto på [platform.openai.com](https://platform.openai.com)
2. Skapa en API-nyckel
3. Lägg till i `.env` filen

### 6. Starta utvecklingsservern

```bash
npm run dev
```

Appen körs nu på `http://localhost:3000`

## 🚢 Deployment till Vercel

### Via Vercel CLI

```bash
# Installera Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Via GitHub

1. Pusha koden till GitHub
2. Gå till [vercel.com](https://vercel.com)
3. Klicka "Import Project"
4. Välj ditt GitHub repository
5. Lägg till environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
6. Klicka "Deploy"

## 📖 Användning

### AI Uppgiftsskapare

Skriv fritt i textrutan, t.ex.:

```
Imorgon behöver jag köpa mjölk och bröd. 
Nästa vecka ska jag:
- Boka tandläkartid (viktigt!)
- Mejla Johan om projektet
- Förbereda presentation för mötet på fredag
```

AI:n kommer automatiskt att:
- Extrahera uppgifter
- Identifiera deadlines ("imorgon", "nästa vecka", "fredag")
- Känna igen prioriteter ("viktigt", "brådskande")
- Skapa deluppgifter från punktlistor
- Organisera i kategorier om du nämner dem

### Uppgiftshantering

- **Markera som klar:** Klicka på cirkeln bredvid uppgiften
- **Ta bort:** Klicka på papperskorgen
- **Visa deluppgifter:** Klicka på pilen vid deluppgifter
- **Filtrera:** Använd filtren i sidopanelen
- **Sortera efter lista:** Välj lista i sidopanelen

## 🏗️ Projektstruktur

```
todo-ai-app/
├── src/
│   ├── components/
│   │   ├── Auth.jsx              # Autentisering
│   │   ├── AITaskCreator.jsx     # AI uppgiftsskapare
│   │   └── TaskCard.jsx          # Uppgiftskort
│   ├── hooks/
│   │   └── useTasks.js           # Custom hook för tasks
│   ├── lib/
│   │   ├── supabase.js           # Supabase klient
│   │   └── openai.js             # OpenAI integration
│   ├── App.jsx                   # Huvudkomponent
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Styles
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Databas schema
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🔐 Säkerhet

- **Row Level Security (RLS):** Aktiverat i Supabase för att säkerställa att användare bara kan se sina egna uppgifter
- **Environment Variables:** Känsliga nycklar lagras säkert i `.env` filer
- **Autentisering:** Hanteras av Supabase Auth

## ⚠️ Viktigt för Production

I production bör du:

1. **Flytta OpenAI-anrop till backend:** Skapa en Vercel Serverless Function istället för att anropa OpenAI direkt från browsern
2. **Rate limiting:** Implementera rate limiting för AI-funktionen
3. **Error handling:** Förbättra felhantering och användarfeedback
4. **Analytics:** Lägg till analytics för att spåra användning

## 🤝 Bidra

Pull requests är välkomna! För större ändringar, öppna först en issue för att diskutera vad du vill ändra.

## 📝 Licens

MIT

## 🆘 Support

Om du stöter på problem, skapa en issue i GitHub-repositoryt.
