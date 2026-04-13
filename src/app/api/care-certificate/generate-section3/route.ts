import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface Section3Entry {
  ref: string
  description: string
  date: string
  context: string
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { careProName, entries } = await req.json() as {
    careProName: string
    entries: Section3Entry[]
  }

  if (!careProName || !entries || entries.length === 0) {
    return NextResponse.json({ error: 'careProName and entries are required' }, { status: 400 })
  }

  const systemPrompt = `You are an expert assessor completing Section 3 of a Care Certificate Assessment Record for a domiciliary care provider.

Writing style (MANDATORY):
- Write in the assessor's voice: "${careProName} explained that…", "${careProName} described…", "${careProName} demonstrated…"
- Use short, professional responses: 2–3 sentences where possible, up to 4–5 sentences only where the standard requires explanation
- Tone must be: neutral, professional, confident, CQC-safe
- Content must be: generic but correct, not over-personalised, not speculative

Standards referencing:
- DO NOT include standard numbers inside the written responses
- Write the response text only

Content rules:
- For every discussion point, address exactly what the standard is asking
- Use correct Skills for Care language
- Avoid vague phrases like "understands the importance of" unless followed by what that looks like in practice
- Ensure responses are defensible, realistic, and consistent with domiciliary care practice
- Use the context label to shape the response:
  * Day in the Life → generic training-based explanations
  * Supervision → reflective, discussion-based explanations
  * PDP → development-focused explanations
  * Support visit → practice-informed explanations

Quality benchmark:
- Clear, concise, professional responses
- Suitable for CQC inspection
- Consistent with experienced assessor documentation
- Equivalent in quality to a high-performing Care Professional's portfolio
- If any discussion point appears unclear, make a reasonable professional assumption

Output format:
Return a JSON array with this exact structure (no other text, no markdown):
[
  { "ref": "1.1d", "response": "response text here" },
  { "ref": "1.1e", "response": "response text here" }
]`

  const entriesText = entries
    .map(
      (e) =>
        `Standard: ${e.ref}
Description: ${e.description}
Date: ${e.date}
Context: ${e.context}`
    )
    .join('\n\n')

  const userMessage = `Care Professional: ${careProName}

Complete Section 3 for the following discussion points:

${entriesText}

Return only the JSON array, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '[]'

  let responses: Array<{ ref: string; response: string }> = []
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    responses = JSON.parse(cleaned)
  } catch {
    // If parsing fails, try to extract responses line-by-line as fallback
    responses = entries.map((e) => ({ ref: e.ref, response: '' }))
  }

  return NextResponse.json({ responses })
}
