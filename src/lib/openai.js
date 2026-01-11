import OpenAI from 'openai'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY

if (!apiKey) {
  throw new Error('Missing OpenAI API key')
}

export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Note: In production, use a backend endpoint
})

export async function parseTasksFromText(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Du är en AI-assistent som hjälper till att strukturera uppgifter från fritext.
Analysera texten och extrahera:
- Uppgifter (tasks)
- Prioritet (high, medium, low)
- Deadline/datum om angivet
- Deluppgifter (subtasks) om det finns
- Lista/kategori om det nämns

Svara ENDAST med giltig JSON i detta format:
{
  "tasks": [
    {
      "title": "Uppgiftstitel",
      "description": "Beskrivning",
      "priority": "medium",
      "dueDate": "2024-01-15" eller null,
      "list": "Arbete" eller null,
      "subtasks": ["Deluppgift 1", "Deluppgift 2"] eller []
    }
  ]
}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.tasks || []
  } catch (error) {
    console.error('Error parsing tasks:', error)

    // Ge mer specifika felmeddelanden
    if (error.status === 401) {
      throw new Error('OpenAI API-nyckel är ogiltig. Kontrollera din VITE_OPENAI_API_KEY i .env')
    } else if (error.status === 429) {
      throw new Error('OpenAI rate limit nådd. Försök igen om ett ögonblick.')
    } else if (error.status === 402) {
      throw new Error('OpenAI-kontot saknar credits. Lägg till betalningsmetod på platform.openai.com')
    } else if (error.message?.includes('fetch')) {
      throw new Error('Nätverksfel. Kontrollera din internetanslutning.')
    }

    throw new Error(error.message || 'Kunde inte kommunicera med OpenAI')
  }
}

// Strukturera endast anteckningar (ingen task-extraktion)
export async function structureNotesOnly(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Du är en AI-assistent som hjälper till att strukturera anteckningar från fritext.

Analysera texten och dela upp den i logiska anteckningar baserat på olika ämnen/teman.

Svara ENDAST med giltig JSON i detta format:
{
  "notes": [
    {
      "title": "Kort sammanfattande titel (max 60 tecken)",
      "content": "Hela innehållet för denna anteckning"
    }
  ]
}

Regler:
- Varje anteckning ska ha en tydlig, beskrivande titel
- Innehållet ska vara välformaterat och komplett
- Dela upp i flera anteckningar om flera ämnen finns
- Bevara all information från originaltexten
- Förbättra formatering och struktur`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.notes || []
  } catch (error) {
    console.error('Error structuring notes:', error)
    throw getOpenAIError(error)
  }
}

// Extrahera text från bild med Vision API
export async function extractTextFromImage(imageFile) {
  try {
    // Konvertera bild till base64
    const base64Image = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(imageFile)
    })

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analysera denna bild och extrahera ALL text du ser.

VIKTIGT:
- Extrahera all text ordagrant som den står i bilden
- Bevara struktur och formatering så gott det går
- Om det är handskriven text, gör ditt bästa för att tolka den
- Om det är en lista, bevara listformatet
- Om det är en anteckning eller dokument, bevara paragrafindelning
- Om bilden innehåller inköpslistor, todo-listor eller liknande, identifiera det

Svara med den extraherade texten.`
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Image
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    })

    return response.choices[0].message.content
  } catch (error) {
    console.error('Error extracting text from image:', error)
    throw getOpenAIError(error)
  }
}

// Extrahera endast uppgifter från text
export async function extractTasksOnly(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Du är en AI-assistent som extraherar uppgifter från text.

Analysera texten och identifiera ALLA actionable items (saker som ska göras).

Svara ENDAST med giltig JSON i detta format:
{
  "tasks": [
    {
      "title": "Uppgiftstitel",
      "description": "Detaljerad beskrivning",
      "priority": "high" | "medium" | "low",
      "dueDate": "YYYY-MM-DD" eller null,
      "list": "Kategori/lista" eller null,
      "subtasks": ["Deluppgift 1", "Deluppgift 2"] eller []
    }
  ]
}

Regler:
- Identifiera allt som är actionable (ska göras, behöver fixas, etc)
- Extrahera prioritet från ord som "viktigt", "brådskande", "senare", "asap"
- Extrahera datum från uttryck som "imorgon", "nästa vecka", "på fredag"
- Skapa deluppgifter om uppgiften kan delas upp i steg
- Om kategori/lista nämns (t.ex. "arbete", "privat"), lägg till det
- Om inga uppgifter finns, returnera tom array []

VIKTIGT - Listor och inköp:
- Om texten innehåller en INKÖPSLISTA, skapa EN uppgift med titel "Handla" och alla items som deluppgifter
- Om texten innehåller en TODO-LISTA med liknande items, skapa EN uppgift med passande titel och alla items som deluppgifter
- Exempel: "Handla mjölk, bröd, smör" → 1 uppgift "Handla" med deluppgifter ["Mjölk", "Bröd", "Smör"]
- Exempel: "Köpa ägg, ost, juice" → 1 uppgift "Handla" med deluppgifter ["Ägg", "Ost", "Juice"]
- Om det är olika typer av uppgifter (t.ex. "Fixa bug OCH handla mjölk"), skapa separata uppgifter`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)
    return result.tasks || []
  } catch (error) {
    console.error('Error extracting tasks:', error)
    throw getOpenAIError(error)
  }
}

// Legacy function - kombinerad notes + tasks
export async function parseNotesFromText(text) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Du är en AI-assistent som hjälper till att strukturera anteckningar och extrahera uppgifter från fritext.

VIKTIGT: Analysera texten och:
1. Dela upp i logiska anteckningar baserat på olika ämnen
2. Identifiera alla uppgifter/todos som nämns i texten

Svara ENDAST med giltig JSON i detta format:
{
  "notes": [
    {
      "title": "Kort sammanfattande titel (max 60 tecken)",
      "content": "Hela innehållet för denna anteckning"
    }
  ],
  "tasks": [
    {
      "title": "Uppgiftstitel",
      "description": "Beskrivning",
      "priority": "medium",
      "dueDate": "2024-01-15" eller null,
      "list": "Arbete" eller null,
      "subtasks": ["Deluppgift 1"] eller []
    }
  ]
}

Regler för NOTES:
- Varje anteckning ska ha en tydlig titel
- Innehållet ska vara välformaterat och komplett
- Dela upp i flera anteckningar om flera ämnen finns

Regler för TASKS:
- Identifiera allt som är actionable (ska göras, behöver fixas, etc)
- Extrahera prioritet från ord som "viktigt", "brådskande", "senare"
- Extrahera datum från uttryck som "imorgon", "nästa vecka", "på fredag"
- Om inga uppgifter finns, returnera tom array []
- Uppgifter ska INTE finnas kvar i anteckningarnas content`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content)
    return {
      notes: result.notes || [],
      tasks: result.tasks || []
    }
  } catch (error) {
    console.error('Error parsing notes:', error)
    throw getOpenAIError(error)
  }
}

// Helper function för felhantering - returnerar ett Error-objekt
function getOpenAIError(error) {
  if (error.status === 401) {
    return new Error('OpenAI API-nyckel är ogiltig. Kontrollera din VITE_OPENAI_API_KEY i .env')
  } else if (error.status === 429) {
    return new Error('OpenAI rate limit nådd. Försök igen om ett ögonblick.')
  } else if (error.status === 402) {
    return new Error('OpenAI-kontot saknar credits. Lägg till betalningsmetod på platform.openai.com')
  } else if (error.message?.includes('fetch')) {
    return new Error('Nätverksfel. Kontrollera din internetanslutning.')
  }
  return new Error(error.message || 'Kunde inte kommunicera med OpenAI')
}
