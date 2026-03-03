import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getModuleDef } from '@/lib/module-registry'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const { moduleName, brief, currentContent } = await req.json() as {
    moduleName: string
    brief: string
    currentContent?: string
  }

  if (!moduleName || !brief) {
    return NextResponse.json({ error: 'moduleName and brief are required' }, { status: 400 })
  }

  const def = getModuleDef(moduleName)
  if (!def) {
    return NextResponse.json({ error: `Unknown module: ${moduleName}` }, { status: 400 })
  }

  const systemPrompt = [
    `You are an expert content writer for Home Instead, a premium home care franchise newsletter.`,
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
