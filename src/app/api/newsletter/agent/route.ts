export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { db } from '@/db'
import { clients } from '@/db/schema'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Operation {
  type: 'update_module' | 'add_module' | 'remove_module' | 'reorder_modules'
  name?: string
  yaml?: string
  after?: string
  order?: string[]
}

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const {
    messages,
    rawContent,
    clientId,
    availableModules,
    currentModuleOrder,
    modulesBrief,
    mode,
  } = await req.json() as {
    messages: ChatMessage[]
    rawContent: string
    clientId?: string
    availableModules?: string[]
    currentModuleOrder?: string[]
    modulesBrief?: Record<string, string>
    mode?: 'review' | 'edit'
  }

  if (!messages) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 })
  }

  let clientName = 'this home care franchise'
  if (clientId) {
    try {
      const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) })
      if (client) clientName = client.name
    } catch { /* fall through */ }
  }

  const isReview = mode === 'review' || (modulesBrief && Object.keys(modulesBrief).length > 0)

  const reviewContext = isReview && modulesBrief
    ? `\nEditorial brief (what the user asked for):\n${
        Object.entries(modulesBrief)
          .map(([name, brief]) => `- ${name}: ${brief}`)
          .join('\n')
      }\n\nYour job on the first turn is to:
1. Compare each generated section against its brief — identify any gaps, placeholder text, or mismatches
2. Fix them immediately using update_module operations
3. Explain briefly what you changed and why, in a friendly tone
4. Ask if the user wants anything else adjusted

On follow-up turns, make whatever changes the user requests and confirm what you did.`
    : ''

  const systemPrompt = `You are the editorial agent for ${clientName}'s newsletter. You have full context of everything discussed during the briefing and can make content and structural changes to the newsletter.
${reviewContext}
The newsletter is made up of ordered module blocks in this format:
:::module:ModuleName
field: value
:::

Current newsletter content:
${rawContent || '(empty)'}

Current module order: ${(currentModuleOrder ?? []).join(', ')}
Modules available to add: ${(availableModules ?? []).length > 0 ? (availableModules ?? []).join(', ') : '(none — all modules already present)'}

You can make these changes:
- update_module: rewrite a module's YAML content (fields only, no :::module: wrappers)
- add_module: add a new module (optionally after a specific module)
- remove_module: remove a non-required module (Meta and Cover cannot be removed)
- reorder_modules: provide the full new module order

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "reply": "Plain-text explanation of what you did or suggest.",
  "operations": []
}

Rules:
- operations may be empty if no changes are needed
- For update_module, yaml must be valid YAML without the :::module: wrapper
- Keep replies concise and friendly — you are a collaborator, not an assistant filling a template
- Never mention image URLs or email as gaps — those are intentionally left blank for the user to fill`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: { reply: string; operations: Operation[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = { reply: raw, operations: [] }
  }

  return NextResponse.json({
    reply: parsed.reply ?? '',
    operations: Array.isArray(parsed.operations) ? parsed.operations : [],
  })
}
