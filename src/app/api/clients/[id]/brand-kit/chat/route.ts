import { NextResponse } from 'next/server'
import { z } from 'zod'
import OpenAI from 'openai'
import { db } from '@/db'
import { brandConversations } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const chatRequestSchema = z.object({
  message: z.string().min(1),
  currentTokens: z.record(z.string().nullable()),
})

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  changes: z.array(
    z.object({
      token: z.string(),
      before: z.string().nullable(),
      after: z.string(),
      reason: z.string(),
    })
  ).optional(),
})

type ChatMessage = z.infer<typeof chatMessageSchema>

const assistantResponseSchema = z.object({
  message: z.string().default(''),
  changes: z.array(
    z.object({
      token: z.string(),
      before: z.string().nullable(),
      after: z.string(),
      reason: z.string(),
    })
  ).default([]),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const conversation = await db.query.brandConversations.findFirst({
      where: eq(brandConversations.clientId, id),
    })

    const messages = (conversation?.messages as unknown as ChatMessage[]) || []
    return NextResponse.json({ messages })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[GET] ${msg}` }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = chatRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request: ${JSON.stringify(parsed.error.flatten())}` },
        { status: 400 }
      )
    }

    const { message, currentTokens } = parsed.data

    // Load existing conversation
    let conversation = await db.query.brandConversations.findFirst({
      where: eq(brandConversations.clientId, id),
    })

    let messages: ChatMessage[] = (conversation?.messages as unknown as ChatMessage[]) || []

    // Append user message
    messages.push({
      role: 'user',
      content: message,
    })

    // Build token list for system prompt
    const tokensList = Object.entries(currentTokens)
      .map(([key, value]) => `- ${key}: ${value ?? 'null'}`)
      .join('\n')

    const systemPrompt = `You are a design assistant for a newsletter brand kit.
Current tokens:
${tokensList}

You can help by:
1. Suggesting specific token value changes (provide exact hex colors, font names, sizes)
2. Describing how the current brand will look when rendered
3. Creating a full style refresh based on a description
4. Adjusting tokens based on feedback

When you propose token changes, respond with ONLY this JSON format (no other text):
{
  "message": "Your conversational response explaining the changes",
  "changes": [
    { "token": "primaryColor", "before": "#006938", "after": "#4A5E2A", "reason": "Warmer, more earthy tone" }
  ]
}

If no token changes, set "changes": [].
ALWAYS respond with valid JSON only. No markdown, no code blocks.`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const responseText = completion.choices[0]?.message?.content ?? '{}'

    // Parse JSON response
    let parsedResponse: unknown
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
    }

    const responseParsed = assistantResponseSchema.safeParse(parsedResponse)
    if (!responseParsed.success) {
      return NextResponse.json(
        { error: `Invalid AI response shape: ${JSON.stringify(responseParsed.error.flatten())}` },
        { status: 500 }
      )
    }

    const allowedTokens = new Set(Object.keys(currentTokens))
    const normalizedChanges = responseParsed.data.changes.filter((change) => allowedTokens.has(change.token))
    const assistantMessage = responseParsed.data.message

    // Append assistant message to conversation
    const assistantEntry: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      changes: normalizedChanges,
    }
    messages.push(assistantEntry)

    // Save or update conversation in DB
    if (conversation) {
      await db
        .update(brandConversations)
        .set({
          messages: messages as any,
          updatedAt: new Date(),
        })
        .where(eq(brandConversations.clientId, id))
    } else {
      await db.insert(brandConversations).values({
        clientId: id,
        messages: messages as any,
        updatedAt: new Date(),
      })
    }

    return NextResponse.json({
      message: assistantMessage,
      changes: normalizedChanges,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}
