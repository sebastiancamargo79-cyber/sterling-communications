import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const formData = await req.formData()
  const observerName = formData.get('observerName') as string
  const careProfessionalName = formData.get('careProfessionalName') as string
  const clientName = formData.get('clientName') as string
  const visitDate = formData.get('visitDate') as string
  const visitTime = formData.get('visitTime') as string
  const acpVisitNotes = formData.get('acpVisitNotes') as string
  const standards = formData.get('standards') as string
  const additionalNotes = formData.get('additionalNotes') as string | null
  const pdfFile = formData.get('pdfFile') as File | null

  if (!observerName || !careProfessionalName || !clientName || !visitDate || !acpVisitNotes || !standards) {
    return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
  }

  const systemPrompt = `You are an expert in health and social care documentation, specialising in CQC-compliant narrative writing for support visit observations.

Your task is to generate a CQC-ready, professional, neutral-tone observation story written as the observer (${observerName}).

You must follow these rules:

1. Use all inputs provided
You will be given structured form data and possibly a PDF attachment containing the handwritten support visit observation sheet. Use all sources to construct the narrative.

2. Output format
Write one flowing, multi-paragraph narrative that:
- Is written in the voice of ${observerName} (observer)
- Is factual, neutral, and inspection-safe
- Avoids embellishment or fabrication
- Draws directly from the ACP notes and any handwritten notes
- Places events in chronological order
- Demonstrates professional judgement

3. Mandatory: Inline standards
Every standard listed in the form must appear explicitly and individually in the narrative, in the exact format: (Standard 5.8a)
Do not group standards together. Do not omit any standard. Do not change numbering or lettering.

4. Content requirements
The story must include:
- How the Care Professional entered the home
- Hand hygiene and PPE use
- Communication (verbal and non-verbal)
- How the CP followed the care plan
- Any risks or distress observed and how the CP responded
- Support with personal care, nutrition, hydration, mobility
- Dignity, privacy, and person-centred care
- Environmental or emotional factors relevant to the client
- Evidence for each standard
- When the standard refers to explaining something (e.g., 8.1d, 13.1e), incorporate the explanation naturally into the narrative as ${observerName}'s professional understanding.

5. End with an assessor summary
Conclude with a short paragraph confirming:
- Whether all standards were fully met
- That the CP demonstrated required competence
- Any follow-up actions only if mentioned in the notes (otherwise state none)`

  const formDataText = `
STRUCTURED FORM DATA:
Observer: ${observerName}
Care Professional Observed: ${careProfessionalName}
Client Name: ${clientName}
Visit Date: ${visitDate}
Visit Time: ${visitTime}

ACP Visit Notes:
${acpVisitNotes}

Care Certificate Standards Observed: ${standards}
${additionalNotes ? `\nAdditional Notes:\n${additionalNotes}` : ''}

Now generate the observation story using all the above information${pdfFile ? ' and the attached handwritten observation PDF' : ''}.`

  let pdfBase64: string | null = null
  if (pdfFile && pdfFile.size > 0) {
    const buffer = await pdfFile.arrayBuffer()
    pdfBase64 = Buffer.from(buffer).toString('base64')
  }

  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

  const userContent: ContentBlock[] = pdfBase64
    ? [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64,
          },
        },
        { type: 'text', text: formDataText },
      ]
    : [{ type: 'text', text: formDataText }]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userContent,
      },
    ],
  })

  const story = message.content[0]?.type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ story })
}
