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
  const { messages, rawContent, clientId, availableModules, currentModuleOrder } = await req.json() as {
    messages: ChatMessage[]
    rawContent: string
    clientId?: string
    availableModules: string[]
    currentModuleOrder: string[]
  }

  if (!messages?.length) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 })
  }

  let clientName = 'this home care franchise'
  if (clientId) {
    try {
      const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) })
      if (client) clientName = client.name
    } catch {
      // fall through
    }
  }

  const systemPrompt = `You are an AI assistant helping edit a home care franchise newsletter for ${clientName}.

The newsletter is made up of ordered module blocks in this format:
:::module:ModuleName
field: value
:::

Current newsletter content:
${rawContent || '(empty)'}

Current module order: ${currentModuleOrder.join(', ')}
Modules available to add: ${availableModules.length > 0 ? availableModules.join(', ') : '(none — all modules are already present)'}

You can make these types of changes:
- update_module: rewrite a module's YAML content (fields only, no :::module: wrappers)
- add_module: add a new module (optionally specify which module it should appear after)
- remove_module: remove a non-required module (Meta and Cover are required and cannot be removed)
- reorder_modules: change the order of all modules by providing the full new order

Respond with a JSON object (no markdown, no code fences) in exactly this format:
{
  "reply": "Plain-text explanation of what you did or suggest.",
  "operations": [
    { "type": "update_module", "name": "Cover", "yaml": "hero_image_url: \"\"\nteasers:\n  - \"Teaser 1\"\n  - \"Teaser 2\"\n  - \"Teaser 3\"" },
    { "type": "add_module", "name": "StaffSpotlight", "yaml": "", "after": "Cover" },
    { "type": "remove_module", "name": "Community" },
    { "type": "reorder_modules", "order": ["Meta", "Cover", "Events"] }
  ]
}

Rules:
- operations array may be empty if no changes are needed (e.g., for questions or clarifications)
- For update_module, yaml must be valid YAML without the :::module: wrapper
- For add_module, yaml may be empty string — the editor will handle it
- Only remove modules that are NOT required (Meta and Cover are required)
- For reorder_modules, include ALL currently present module names in the new order
- Keep replies concise and friendly`

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
