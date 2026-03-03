export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterDrafts } from '@/db/schema'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [row] = await db
    .select()
    .from(newsletterDrafts)
    .where(eq(newsletterDrafts.clientId, id))
    .limit(1)

  if (!row) {
    return NextResponse.json({ rawContent: null, updatedAt: null })
  }

  return NextResponse.json({ rawContent: row.rawContent, updatedAt: row.updatedAt })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { rawContent } = await req.json() as { rawContent: string }

  if (typeof rawContent !== 'string') {
    return NextResponse.json({ error: 'rawContent is required' }, { status: 400 })
  }

  await db
    .insert(newsletterDrafts)
    .values({ clientId: id, slug: `client-${id}`, rawContent })
    .onConflictDoUpdate({
      target: newsletterDrafts.slug,
      set: { rawContent, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
