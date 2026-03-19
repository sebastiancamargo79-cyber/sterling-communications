export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { aiPrompts } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ moduleName: string }> }
) {
  const { moduleName } = await params
  const body = await request.json() as { promptText: string }

  const rows = await db
    .select()
    .from(aiPrompts)
    .where(and(isNull(aiPrompts.clientId), eq(aiPrompts.moduleName, moduleName)))

  const existing = rows[0]

  let result
  if (existing) {
    const [updated] = await db
      .update(aiPrompts)
      .set({ promptText: body.promptText, updatedAt: new Date() })
      .where(eq(aiPrompts.id, existing.id))
      .returning()
    result = updated
  } else {
    const [inserted] = await db
      .insert(aiPrompts)
      .values({ clientId: null, moduleName, promptText: body.promptText })
      .returning()
    result = inserted
  }

  return NextResponse.json({ prompt: result })
}
