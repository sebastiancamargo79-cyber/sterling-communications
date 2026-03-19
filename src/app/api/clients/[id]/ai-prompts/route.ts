export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { aiPrompts } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'

type AiPromptRow = typeof aiPrompts.$inferSelect

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [clientPrompts, globalPrompts]: [AiPromptRow[], AiPromptRow[]] = await Promise.all([
    db.select().from(aiPrompts).where(eq(aiPrompts.clientId, id)),
    db.select().from(aiPrompts).where(isNull(aiPrompts.clientId)),
  ])

  const clientMap = new Map(
    clientPrompts.map((p: AiPromptRow) => [p.moduleName, p] as const)
  )

  const moduleNames = new Set([
    ...clientPrompts.map((p: AiPromptRow) => p.moduleName),
    ...globalPrompts.map((p: AiPromptRow) => p.moduleName),
  ])

  const prompts = Array.from(moduleNames).map((moduleName) => {
    const clientPrompt = clientMap.get(moduleName)
    if (clientPrompt) {
      return {
        moduleName,
        promptText: clientPrompt.promptText,
        isOverride: true,
      }
    }
    const globalPrompt = globalPrompts.find((p: AiPromptRow) => p.moduleName === moduleName)!
    return {
      moduleName,
      promptText: globalPrompt.promptText,
      isOverride: false,
    }
  })

  return NextResponse.json({ prompts })
}
