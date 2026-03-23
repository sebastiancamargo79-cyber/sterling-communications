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

    const tokenHelp = `VALID TOKEN NAMES (use exactly these — no others exist):
- primaryColor — main brand color; controls headings, logo background, bullet checkmarks, card left-border accents (hex)
- secondaryColor — secondary color; controls pull-quote text, event card titles, anniversary year numbers (hex)
- bgColor — card/section fill color; used as background for event cards and community/recruitment boxes (hex)
- accentColor — accent color for bold divider rules between sections and column border lines (hex)
- textColor — body paragraph text, list item text, and general body copy color (hex)
- dividerColor — subtle separator lines and table row borders; set to a visible color to "add dividers" (hex, e.g. "#c0c0c0" for visible, "#e5e7eb" for subtle)
- mutedTextColor — captions, photo credits, small dates, secondary signatures and subdued metadata text (hex)
- headingFontSize — main heading font size, e.g. "22px", "26px", "28px"
- bodyFontSize — body text font size, e.g. "12px", "13px", "14px"
- cardBorderRadius — corner rounding for cards and containers, e.g. "0px" sharp, "6px" soft, "12px" rounded
- fontHeadingName — Google Font for headings, e.g. "Montserrat", "Playfair Display", "Merriweather", "Raleway"
- fontBodyName — Google Font for body text, e.g. "Inter", "Lato", "Source Sans 3", "Nunito", "Open Sans"

IMPORTANT LIMITATIONS — tell the user these cannot be changed:
- Individual column colors (e.g. "only the right column text") — textColor changes ALL body text
- Specific image borders or photo styles — images use fixed layout
- Individual section spacing or padding — layout structure is fixed`

    const isFullPage = moduleType === 'FullNewsletter'

    const systemPrompt = isFullPage
      ? `You are a professional newsletter design consultant for "${clientName}". Your task is to redesign the ENTIRE newsletter to look polished, professional, and cohesive.

CLIENT: ${clientName}
NEWSLETTER MODULES: ${moduleContent || '(all modules)'}

CURRENT DESIGN TOKENS:
${tokensList}

EDITION OVERRIDES ALREADY APPLIED:
${overridesList}

${tokenHelp}

Rules:
- ALWAYS use scope: "edition" for ALL token changes — this applies to the current edition only
- Return a COMPREHENSIVE redesign: suggest changes to ALL relevant tokens (colors, fonts, sizes, radius)
- Pick SPECIFIC professional values: exact hex colors (#rrggbb), real Google Font names, exact px sizes
- Create a COHESIVE design system — all colors must work harmoniously together
- Suggest 8-12 token changes for a full overhaul — MUST cover: primaryColor, secondaryColor, bgColor, accentColor, textColor, dividerColor, mutedTextColor, fontHeadingName, fontBodyName, headingFontSize, bodyFontSize, cardBorderRadius
- Focus on making the newsletter look premium, polished, and professional
- Consider readability: body text (textColor) must contrast well against bgColor
- Do NOT suggest variant changes for full-page redesigns
- Always set dividerColor to complement the overall palette (e.g. a light tint of primaryColor)

Respond with ONLY valid JSON — no markdown, no code fences:
{"message":"Your explanation of the design direction and choices","changes":[{"type":"token","token":"primaryColor","value":"#1a2744","scope":"edition","reason":"Deep navy conveys authority"},{"type":"token","token":"bgColor","value":"#fafaf8","scope":"edition","reason":"Warm off-white feels premium"}]}
Output ONLY the JSON object, nothing else.`
      : `You are a design assistant for the "${clientName}" newsletter, specifically for the **${moduleType}** module.

CLIENT: ${clientName}
MODULE: ${moduleType}
BRAND KIT MODE: ${brandKit?.mode ?? 'not set'}

CURRENT MODULE CONTENT:
${moduleContent || '(empty)'}

ALL DESIGN TOKENS (brand kit + edition overrides merged):
${tokensList}

EDITION-SPECIFIC OVERRIDES ALREADY APPLIED:
${overridesList}

${tokenHelp}

VARIANT OPTIONS for ${moduleType}:
- "classic" — default layout
- "alternate" — alternative layout for variety

Rules:
- ALWAYS use scope: "edition" for ALL token changes — NEVER use scope: "global" unless the user explicitly says "update brand everywhere" or "change the brand kit"
- Provide specific concrete values: exact hex colors (#rrggbb), exact pixel sizes, exact font names
- When the user asks to change a color (e.g. "change green to blue"), pick a specific professional hex color value
- Always suggest AT LEAST ONE change when the user requests a change — never return empty changes if a change was requested
- Suggest 2-4 concrete token changes that directly address the user's request
- Only suggest a variant change if the user explicitly asks for a layout change
- If the user asks for something that cannot be done (e.g. "only the right column text" or "just that one section"), use the closest available token AND explain in your message that the token affects all similar text/elements, not just one specific area

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
