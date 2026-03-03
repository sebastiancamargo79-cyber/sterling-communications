import { db } from '@/db'
import { newsletterDrafts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function EditorPage() {
  let rawContent: string | null = null

  try {
    const rows = await db
      .select()
      .from(newsletterDrafts)
      .where(eq(newsletterDrafts.slug, 'default'))
      .limit(1)

    if (rows.length > 0) {
      rawContent = rows[0].rawContent
    }
  } catch {
    // DB unavailable
  }

  if (!rawContent) {
    try {
      rawContent = readFileSync(
        join(process.cwd(), 'src/content', 'newsletter.md'),
        'utf8'
      )
    } catch {
      rawContent = ''
    }
  }

  return <EditorClient initialContent={rawContent} />
}
