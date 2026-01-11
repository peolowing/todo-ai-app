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
