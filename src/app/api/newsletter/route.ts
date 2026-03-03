import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { newsletterDrafts } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rows = await db
    .select()
    .from(newsletterDrafts)
    .where(eq(newsletterDrafts.slug, 'default'))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ rawContent: null, updatedAt: null })
  }

  return NextResponse.json({
    rawContent: rows[0].rawContent,
    updatedAt: rows[0].updatedAt,
  })
}

export async function PUT(req: NextRequest) {
  const { rawContent } = await req.json() as { rawContent: string }

  if (typeof rawContent !== 'string' || rawContent.trim() === '') {
    return NextResponse.json({ error: 'rawContent is required' }, { status: 400 })
  }

  await db
    .insert(newsletterDrafts)
    .values({ slug: 'default', rawContent })
    .onConflictDoUpdate({
      target: newsletterDrafts.slug,
      set: { rawContent, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true })
}
