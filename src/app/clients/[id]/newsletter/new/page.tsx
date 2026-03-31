import { db } from '@/db'
import { clients, newsletterEditions, newsletterDrafts } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { parseModuleBlocks } from '@/lib/module-parser'
import BriefingClient from './BriefingClient'

export const dynamic = 'force-dynamic'

export default async function NewEditionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) notFound()

  const extractMeta = (rawContent: string): Record<string, string> => {
    try {
      const parsed = parseModuleBlocks(rawContent)
      const meta = parsed['meta'] as Record<string, unknown> | undefined
      if (meta) {
        return Object.fromEntries(
          Object.entries(meta).map(([k, v]) => [k, String(v ?? '')])
        )
      }
    } catch { /* non-critical */ }
    return {}
  }

  let prefillMeta: Record<string, string> = {}

  try {
    const [prevEdition] = await db
      .select({ rawContent: newsletterEditions.rawContent })
      .from(newsletterEditions)
      .where(eq(newsletterEditions.clientId, id))
      .orderBy(desc(newsletterEditions.createdAt))
      .limit(1)
    if (prevEdition?.rawContent) {
      prefillMeta = extractMeta(prevEdition.rawContent)
    }
  } catch { /* non-critical */ }

  if (Object.keys(prefillMeta).length === 0) {
    try {
      const [draft] = await db
        .select({ rawContent: newsletterDrafts.rawContent })
        .from(newsletterDrafts)
        .where(eq(newsletterDrafts.clientId, id))
        .limit(1)
      if (draft?.rawContent) {
        prefillMeta = extractMeta(draft.rawContent)
      }
    } catch { /* non-critical */ }
  }

  // Ensure required fields have defaults
  if (!prefillMeta.office_name) prefillMeta.office_name = client.name
  if (!prefillMeta.phone) prefillMeta.phone = ''
  if (!prefillMeta.website) prefillMeta.website = ''
  if (!prefillMeta.email) prefillMeta.email = ''

  return (
    <BriefingClient
      clientId={id}
      clientName={client.name}
      prefillMeta={prefillMeta}
    />
  )
}
