export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { db } from '@/db'
import { clients, brandKits } from '@/db/schema'
import { eq } from 'drizzle-orm'

const requestSchema = z.object({
  moduleType: z.string().min(1),
  moduleContent: z.string(),
  currentTokens: z.record(z.string().nullable()),
  editionOverrides: z.record(z.string()).default({}),
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .default([]),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request: ${JSON.stringify(parsed.error.flatten())}` },
        { status: 400 }
      )
    }

    const { moduleType, moduleContent, currentTokens, editionOverrides, message, history } =
      parsed.data

    // Load client name for context
    const client = await db.query.clients.findFirst({ where: eq(clients.id, id) })
    const clientName = client?.name ?? 'Unknown Client'

    // Load brand kit for full context
    const brandKit = await db.query.brandKits.findFirst({ where: eq(brandKits.clientId, id) })

    // Merged tokens: brand kit → currentTokens → editionOverrides
    const mergedTokens: Record<string, string | null> = {
      ...currentTokens,
      ...editionOverrides,
    }
    const tokensList = Object.entries(mergedTokens)
      .map(([k, v]) => `  ${k}: ${v ?? 'null'}`)
      .join('\n')

    const overridesList =
      Object.keys(editionOverrides).length > 0
        ? Object.entries(editionOverrides)
            .map(([k, v]) => `  ${k}: ${v}`)
            .join('\n')
        : '  (none)'

    const systemPrompt = `You are a design assistant for the "${clientName}" newsletter, specifically for the **${moduleType}** module.

CLIENT: ${clientName}
MODULE: ${moduleType}
BRAND KIT MODE: ${brandKit?.mode ?? 'not set'}

CURRENT MODULE CONTENT:
${moduleContent || '(empty)'}

ALL DESIGN TOKENS (brand kit + edition overrides merged):
${tokensList}

EDITION-SPECIFIC OVERRIDES ALREADY APPLIED:
${overridesList}

VALID TOKEN NAMES (use exactly these):
- primaryColor — main brand color (hex)
- secondaryColor — secondary brand color (hex)
- bgColor — page/section background color (hex)
- accentColor — accent/highlight color (hex)
- textColor — body text color (hex)
- headingFontSize — e.g. "24px"
- bodyFontSize — e.g. "14px"
- cardBorderRadius — e.g. "8px"
- fontHeadingName — font name string e.g. "Montserrat"
- fontBodyName — font name string e.g. "Inter"

VARIANT OPTIONS for ${moduleType}:
- "classic" — default layout
- "alternate" — alternative layout for variety

Rules:
- ALWAYS use scope: "edition" for ALL token changes — NEVER use scope: "global" unless the user explicitly says "update brand everywhere" or "change the brand kit"
- Provide specific concrete values: exact hex colors (#rrggbb), exact pixel sizes, exact font names
- When the user asks to change a color (e.g. "change green to blue"), pick a specific professional hex color value
- Always suggest AT LEAST ONE change when the user requests a change — never return empty changes if a change was requested
- Suggest 2-4 concrete token changes that directly address the user's request

Respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON:
{"message":"Your conversational explanation","changes":[{"type":"token","token":"bgColor","value":"#f5f0eb","scope":"edition","reason":"Warmer background"},{"type":"variant","variant":"alternate","reason":"Split layout adds visual interest"}]}

If no changes are warranted, set "changes": [].
Output ONLY the JSON object, nothing else.`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
    })

    const rawText = completion.choices[0]?.message?.content ?? '{}'
    // Strip markdown code fences GPT-4o sometimes adds despite instructions
    const responseText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    let parsedResponse: { message?: string; changes?: unknown[] }
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      // If JSON parse still fails, return empty changes with the raw text as message
      return NextResponse.json({
        message: rawText,
        changes: [],
      })
    }

    return NextResponse.json({
      message: parsedResponse.message ?? '',
      changes: parsedResponse.changes ?? [],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}
