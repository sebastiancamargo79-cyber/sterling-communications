import { db } from '@/db'
import { newsletterDrafts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAllModuleDefs } from '@/lib/module-registry'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function ClientEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let rawContent = ''
  try {
    const [row] = await db
      .select()
      .from(newsletterDrafts)
      .where(eq(newsletterDrafts.clientId, id))
      .limit(1)
    if (row) rawContent = row.rawContent
  } catch {
    // DB unavailable
  }

  const moduleDefs = await getAllModuleDefs()

  return (
    <EditorClient
      initialContent={rawContent}
      clientId={id}
      moduleDefs={moduleDefs}
    />
  )
}
