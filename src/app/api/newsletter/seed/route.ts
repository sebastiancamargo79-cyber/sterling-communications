import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from '@/db'
import { newsletterDrafts } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rawContent = readFileSync(
    join(process.cwd(), 'src/content', 'newsletter.md'),
    'utf8'
  )

  await db
    .insert(newsletterDrafts)
    .values({ slug: 'default', rawContent })
    .onConflictDoUpdate({
      target: newsletterDrafts.slug,
      set: { rawContent, updatedAt: new Date() },
    })

  return NextResponse.json({ ok: true, message: 'DB seeded from newsletter.md' })
}
