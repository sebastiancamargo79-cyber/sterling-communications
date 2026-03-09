import { redirect } from 'next/navigation'
import { db } from '@/db'
import { newsletterDrafts, clients, newsletterEditions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getAllModuleDefs, generateTemplate } from '@/lib/module-registry'
import EditorClient from './EditorClient'

export const dynamic = 'force-dynamic'

export default async function ClientEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ editionId?: string }>
}) {
  const { id } = await params
  const { editionId } = await searchParams

  let rawContent = ''
  let clientName = ''
  let finalEditionId = editionId

  try {
    const [clientRow] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1)
    if (clientRow) clientName = clientRow.name

    // If editionId provided, load that edition
    if (editionId) {
      const edition = await db.query.newsletterEditions.findFirst({
        where: eq(newsletterEditions.id, editionId),
      })
      if (edition) {
        rawContent = edition.rawContent
      }
    } else {
      // No editionId: create a blank edition and redirect to it
      const [newEdition] = await db
        .insert(newsletterEditions)
        .values({
          clientId: id,
          title: 'Untitled Edition',
          rawContent: '',
          updatedAt: new Date(),
        })
        .returning()

      redirect(`/clients/${id}/newsletter/editor?editionId=${newEdition.id}`)
    }
  } catch {
    // DB unavailable - fallback to draft mode
    try {
      const [row] = await db
        .select()
        .from(newsletterDrafts)
        .where(eq(newsletterDrafts.clientId, id))
        .limit(1)
      if (row) {
        rawContent = row.rawContent
      } else if (clientName) {
        rawContent = generateTemplate(clientName)
      }
    } catch {
      // Last resort
    }
  }

  const moduleDefs = await getAllModuleDefs()

  return (
    <EditorClient
      initialContent={rawContent}
      clientId={id}
      editionId={finalEditionId}
      moduleDefs={moduleDefs}
    />
  )
}
