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
    return NextResponse.json({ rawContent: null, tokenOverrides: {}, updatedAt: null })
  }

  return NextResponse.json({
    rawContent: row.rawContent,
    tokenOverrides: row.tokenOverrides ?? {},
    updatedAt: row.updatedAt,
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as { rawContent: string; tokenOverrides?: Record<string, string> }
  const { rawContent, tokenOverrides } = body

  if (typeof rawContent !== 'string') {
    return NextResponse.json({ error: 'rawContent is required' }, { status: 400 })
  }

  await db
    .insert(newsletterDrafts)
    .values({ clientId: id, slug: `client-${id}`, rawContent, tokenOverrides: tokenOverrides ?? {} })
    .onConflictDoUpdate({
      target: newsletterDrafts.slug,
      set: { rawContent, tokenOverrides: tokenOverrides ?? {}, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
