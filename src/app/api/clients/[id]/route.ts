export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, count } from 'drizzle-orm'
import { db } from '@/db'
import { clients, brandKits, newsletterDrafts, newsletterEditions } from '@/db/schema'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [clientRow] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!clientRow) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  const [brandKitRow] = await db
    .select()
    .from(brandKits)
    .where(eq(brandKits.clientId, id))
    .limit(1)

  const [draftRow] = await db
    .select()
    .from(newsletterDrafts)
    .where(eq(newsletterDrafts.clientId, id))
    .limit(1)

  const [editionCountRow] = await db
    .select({ count: count() })
    .from(newsletterEditions)
    .where(eq(newsletterEditions.clientId, id))

  return NextResponse.json({
    client: clientRow,
    brandKit: brandKitRow ?? null,
    draft: draftRow
      ? { updatedAt: draftRow.updatedAt, hasContent: draftRow.rawContent.length > 0 }
      : null,
    editionCount: editionCountRow?.count ?? 0,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [deleted] = await db.delete(clients).where(eq(clients.id, id)).returning()
  if (!deleted) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
