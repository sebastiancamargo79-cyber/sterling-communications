export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterEditions } from '@/db/schema'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ editionId: string }> }
) {
  const { editionId } = await params
  const { code } = await req.json() as { code: string }

  if (!code?.trim()) {
    return NextResponse.json({ error: 'Access code is required' }, { status: 400 })
  }

  const [edition] = await db
    .select()
    .from(newsletterEditions)
    .where(eq(newsletterEditions.id, editionId))
    .limit(1)

  if (!edition) {
    return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
  }

  if (!edition.accessCode || edition.accessCode !== code.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 403 })
  }

  return NextResponse.json({
    title: edition.title,
    htmlSnapshot: edition.htmlSnapshot,
    rawContent: edition.rawContent,
    createdAt: edition.createdAt,
  })
}
