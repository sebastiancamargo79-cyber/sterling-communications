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

  // Load client name independently
  try {
    const [clientRow] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1)
    if (clientRow) clientName = clientRow.name
  } catch {
    // non-critical
  }

  if (!editionId) {
    // Create a blank edition — redirect must happen OUTSIDE try/catch so Next.js
    // can propagate the NEXT_REDIRECT and not swallow it
    let newEditionId: string | undefined
    try {
      const [newEdition] = await db
        .insert(newsletterEditions)
        .values({
          clientId: id,
          title: 'Untitled Edition',
          rawContent: '',
          updatedAt: new Date(),
        })
        .returning()
      newEditionId = newEdition.id
    } catch {
      // DB error creating edition — fall through to draft fallback below
    }

    if (newEditionId) {
      redirect(`/clients/${id}/newsletter/editor?editionId=${newEditionId}`)
    }
  }

  // Load edition or draft content
  if (finalEditionId) {
    try {
      const edition = await db.query.newsletterEditions.findFirst({
        where: eq(newsletterEditions.id, finalEditionId),
      })
      if (edition) rawContent = edition.rawContent
    } catch {
      // fallback to empty
    }
  } else {
    // No edition — fallback to draft
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
      // last resort
    }
  }

  const moduleDefs = await getAllModuleDefs()

  return (
    <EditorClient
      initialContent={rawContent}
      clientId={id}
      clientName={clientName}
      editionId={finalEditionId}
      moduleDefs={moduleDefs}
    />
  )
}
