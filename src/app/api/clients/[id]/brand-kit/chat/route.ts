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
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      )
    }

    const { message: assistantMessage = '', changes = [] } = parsedResponse

    // Append assistant message to conversation
    const assistantEntry: ChatMessage = {
      role: 'assistant',
      content: assistantMessage,
      changes,
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
      changes,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}
