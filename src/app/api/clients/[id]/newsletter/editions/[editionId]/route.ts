export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterEditions } from '@/db/schema'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; editionId: string }> }
) {
  const { id, editionId } = await params
  const { rawContent, title } = await req.json() as { rawContent?: string; title?: string }

  try {
    // Verify edition belongs to client
    const edition = await db.query.newsletterEditions.findFirst({
      where: eq(newsletterEditions.id, editionId),
    })

    if (!edition || edition.clientId !== id) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
    }

    // Update edition
    const updateData: Record<string, any> = { updatedAt: new Date() }
    if (rawContent !== undefined) {
      updateData.rawContent = rawContent
    }
    if (title !== undefined) {
      updateData.title = title
    }

    const [updated] = await db
      .update(newsletterEditions)
      .set(updateData)
      .where(eq(newsletterEditions.id, editionId))
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[PUT] ${msg}` }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; editionId: string }> }
) {
  const { id, editionId } = await params

  try {
    // Verify edition belongs to client
    const edition = await db.query.newsletterEditions.findFirst({
      where: eq(newsletterEditions.id, editionId),
    })

    if (!edition || edition.clientId !== id) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 })
    }

    // Delete edition
    await db.delete(newsletterEditions).where(eq(newsletterEditions.id, editionId))

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[DELETE] ${msg}` }, { status: 500 })
  }
}
