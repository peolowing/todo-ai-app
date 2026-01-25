import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

/**
 * Läser ett kvitto med OpenAI Vision API och extraherar relevanta data
 * @param {string} imageBase64 - Bild i base64-format
 * @returns {Promise<Object>} - Extraherad kvittodata
 */
export async function scanReceipt(imageBase64) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Du är en expert på att läsa och tolka kvitton för bokföring.
Din uppgift är att extrahera viktig information från kvittobilder.

Returnera alltid ett JSON-objekt med följande struktur:
{
  "date": "YYYY-MM-DD",
  "amount": 123.45,
  "vatAmount": 24.69,
  "vatRate": "25%",
  "tipAmount": 10.00,
  "vendorName": "Företagsnamn AB",
  "orgNumber": "556677-8899",
  "category": "Material",
  "description": "Kort beskrivning av köpet",
  "rawText": "Fullständig OCR-text från kvittot"
}

VIKTIGT om belopp och moms:
- "amount" ska vara TOTALT belopp inklusive moms (men exklusive dricks)
- "vatAmount" är momsbeloppet som ingår i amount
- "tipAmount" är dricks/tips (om det finns) - detta är INTE inkluderat i amount
- Restaurangkvitton visar ofta: Subtotal (exkl moms) + Moms + Dricks = Total
  * I det fallet: amount = Subtotal + Moms, tipAmount = Dricks
- Beräkna moms korrekt: För 25% moms är momsbeloppet = amount * 0.25 / 1.25
  För 12% moms: amount * 0.12 / 1.12

Kategorier att välja från:
- Material (verktyg, material, byggvaror)
- Representation (restaurang, underhållning med kunder)
- Drift (el, vatten, hyra, försäkring)
- Resor (bränsle, biljetter, hotell)
- Kontorsmaterial (papper, pennor, etc)
- IT (datorer, programvara, abonnemang)
- Övrigt

Momssatser i Sverige:
- 25% (normal moms - de flesta varor och tjänster)
- 12% (livsmedel, restaurang, catering)
- 6% (böcker, tidningar, kultur, transport)
- 0% (momsbefriat - vissa finansiella tjänster, vård)

Om information saknas, gör en rimlig gissning baserat på kontexten.
VIKTIGT: Läs kvittot noggrant och använd de faktiska beloppen som står på kvittot.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Läs detta kvitto och extrahera all relevant information för bokföring. Returnera svaret som JSON."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1 // Låg temperatur för mer konsistenta resultat
    })

    const content = response.choices[0].message.content

    // Extrahera JSON från svaret (ibland wrappas det i ```json```)
    let jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    // Om inget code block, försök parse hela svaret
    return JSON.parse(content)

  } catch (error) {
    console.error('Receipt OCR error:', error)
    throw new Error('Kunde inte läsa kvittot: ' + error.message)
  }
}

/**
 * Konverterar en File till base64
 * @param {File} file - Bildfil
 * @returns {Promise<string>} - Base64-sträng
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // Ta bort data:image/...;base64, prefix
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Kategorilista för kvitton
 */
export const receiptCategories = [
  'Material',
  'Representation',
  'Drift',
  'Resor',
  'Kontorsmaterial',
  'IT',
  'Övrigt'
]

/**
 * Momssatser i Sverige
 */
export const vatRates = ['25%', '12%', '6%', '0%']
