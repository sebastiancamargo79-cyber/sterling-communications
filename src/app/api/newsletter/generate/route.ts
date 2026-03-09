import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { getAllModuleDefs } from '@/lib/module-registry'
import { db } from '@/db'
import { clients, brandKits } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const { moduleName, brief, currentContent, clientId } = await req.json() as {
    moduleName: string
    brief: string
    currentContent?: string
    clientId?: string
  }

  if (!moduleName || !brief) {
    return NextResponse.json({ error: 'moduleName and brief are required' }, { status: 400 })
  }

  const allDefs = await getAllModuleDefs()
  const def = allDefs.find((m) => m.name === moduleName)
  if (!def) {
    return NextResponse.json({ error: `Unknown module: ${moduleName}` }, { status: 400 })
  }

  // Fetch client and brand kit context if clientId is provided
  let brandContext: { officeName: string; primaryColor?: string } | null = null
  if (clientId) {
    try {
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, clientId),
      })
      const brandKit = await db.query.brandKits.findFirst({
        where: eq(brandKits.clientId, clientId),
      })

      if (client) {
        brandContext = {
          officeName: client.name,
          primaryColor: brandKit?.primaryColor ?? undefined,
        }
      }
    } catch (e) {
      // Silently fall back if brand context lookup fails
    }
  }

  const systemPrompt = [
    brandContext
      ? `You are writing for ${brandContext.officeName}, a home care franchise. ${
          brandContext.primaryColor ? `Brand primary color: ${brandContext.primaryColor}.` : ''
        }`
      : `You are an expert content writer for a home care franchise newsletter.`,
    `You are writing the "${def.label}" section.`,
    ``,
    def.aiPromptTemplate,
    ``,
    `IMPORTANT: Output ONLY the raw YAML content. Do not include :::module: wrapper tags.`,
    `Do not include any explanation or markdown code fences. Output valid YAML only.`,
  ].join('\n')

  const userMessage = currentContent
    ? `Brief: ${brief}\n\nCurrent content to improve:\n${currentContent}`
    : `Brief: ${brief}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  const yaml = completion.choices[0]?.message?.content ?? ''

  return NextResponse.json({ yaml })
}
