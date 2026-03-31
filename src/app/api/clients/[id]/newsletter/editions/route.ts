export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterEditions, newsletterDrafts } from '@/db/schema'

function generateAccessCode(): string {
  return crypto.randomBytes(4).toString('hex') // 8-char hex code
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const rows = await db
    .select()
    .from(newsletterEditions)
    .where(eq(newsletterEditions.clientId, id))
    .orderBy(desc(newsletterEditions.createdAt))

  return NextResponse.json({ editions: rows })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { title, rawContent, htmlSnapshot, tokenOverrides, agentConversation } = await req.json() as {
    title?: string
    rawContent?: string
    htmlSnapshot?: string
    tokenOverrides?: Record<string, string>
    agentConversation?: Array<{ role: string; content: string }>
  }

  const accessCode = generateAccessCode()

  // Use provided rawContent or get from draft, or use empty string
  let content = rawContent
  let draftOverrides: Record<string, string> = {}
  if (!content) {
    const [draft] = await db
      .select()
      .from(newsletterDrafts)
      .where(eq(newsletterDrafts.clientId, id))
      .limit(1)
    content = draft?.rawContent ?? ''
    draftOverrides = (draft?.tokenOverrides as Record<string, string>) ?? {}
  }

  const [edition] = await db
    .insert(newsletterEditions)
    .values({
      clientId: id,
      title: title?.trim() ?? 'Untitled Edition',
      rawContent: content,
      tokenOverrides: tokenOverrides ?? draftOverrides,
      agentConversation: agentConversation ?? [],
      accessCode,
      htmlSnapshot: htmlSnapshot ?? null,
      updatedAt: new Date(),
    })
    .returning()

  return NextResponse.json({ edition }, { status: 201 })
}
