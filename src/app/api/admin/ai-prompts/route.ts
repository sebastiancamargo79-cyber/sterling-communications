export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { aiPrompts } from '@/db/schema'
import { isNull } from 'drizzle-orm'

export async function GET(_request: NextRequest) {
  const prompts = await db
    .select()
    .from(aiPrompts)
    .where(isNull(aiPrompts.clientId))

  return NextResponse.json({ prompts })
}
