import { db } from '@/db'
import { newsletterEditions, clients } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import EditionsClient from './EditionsClient'

export const dynamic = 'force-dynamic'

export default async function EditionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) notFound()

  const editions = await db
    .select()
    .from(newsletterEditions)
    .where(eq(newsletterEditions.clientId, id))
    .orderBy(desc(newsletterEditions.createdAt))

  return (
    <EditionsClient
      clientId={id}
      clientName={client.name}
      editions={editions.map((e: typeof editions[number]) => ({
        id: e.id,
        title: e.title,
        createdAt: e.createdAt,
        rawContent: e.rawContent,
        accessCode: e.accessCode ?? null,
      }))}
    />
  )
}
