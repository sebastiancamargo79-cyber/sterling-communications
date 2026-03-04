import { db } from '@/db'
import { newsletterDrafts, clients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAllModuleDefs, generateTemplate } from '@/lib/module-registry'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function ClientEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let rawContent = ''
  let clientName = ''

  try {
    const [clientRow] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1)
    if (clientRow) clientName = clientRow.name

    const [row] = await db
      .select()
      .from(newsletterDrafts)
      .where(eq(newsletterDrafts.clientId, id))
      .limit(1)
    if (row) {
      rawContent = row.rawContent
    } else if (clientName) {
      // Seed with client-aware template for first-time editors
      rawContent = generateTemplate(clientName)
    }
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
