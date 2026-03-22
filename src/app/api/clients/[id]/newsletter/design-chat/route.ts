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

VARIANT OPTIONS for ${moduleType}:
- "classic" — default layout (current)
- "alternate" — alternative layout for variety

You can suggest:
1. Token changes scoped to this edition only (scope: "edition") — these sit on top of the brand kit
2. Token changes scoped globally to the brand kit (scope: "global") — these update the brand kit
3. A layout variant change (type: "variant")

Rules:
- Prefer edition-scoped token changes unless the user explicitly asks to update the brand
- Provide specific values: exact hex colors, pixel sizes, font names
- Keep the brand identity intact — refine, don't redesign unless asked
- Only suggest changes that make aesthetic sense for the module content shown

Respond with ONLY this JSON (no markdown, no code blocks):
{
  "message": "Your conversational explanation of the changes",
  "changes": [
    { "type": "token", "token": "bgColor", "value": "#f5f0eb", "scope": "edition", "reason": "Warmer background" },
    { "type": "variant", "variant": "alternate", "reason": "Split layout adds visual interest" }
  ]
}

If no changes are needed, set "changes": [].
ALWAYS respond with valid JSON only.`

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

    const responseText = completion.choices[0]?.message?.content ?? '{}'

    let parsedResponse: { message?: string; changes?: unknown[] }
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
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
