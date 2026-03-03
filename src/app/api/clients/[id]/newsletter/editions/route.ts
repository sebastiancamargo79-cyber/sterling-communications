export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterEditions, newsletterDrafts } from '@/db/schema'

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
  const { title } = await req.json() as { title: string }

  if (!title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  // Get current draft content
  const [draft] = await db
    .select()
    .from(newsletterDrafts)
    .where(eq(newsletterDrafts.clientId, id))
    .limit(1)

  if (!draft) {
    return NextResponse.json({ error: 'No draft found for this client' }, { status: 404 })
  }

  const [edition] = await db
    .insert(newsletterEditions)
    .values({ clientId: id, title: title.trim(), rawContent: draft.rawContent })
    .returning()

  return NextResponse.json({ edition }, { status: 201 })
}
