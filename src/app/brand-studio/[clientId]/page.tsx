import { notFound } from 'next/navigation'
import { db } from '@/db'
import { clients, brandKits, newsletterDrafts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import BrandStudioClient from './BrandStudioClient'

export default async function BrandStudioPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params

  // Fetch client
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  })

  if (!client) {
    notFound()
  }

  // Fetch or create brand kit
  let brandKit = await db.query.brandKits.findFirst({
    where: eq(brandKits.clientId, clientId),
  })

  // Fetch newsletter draft
  const draft = await db.query.newsletterDrafts.findFirst({
    where: eq(newsletterDrafts.clientId, clientId),
  })

  return (
    <BrandStudioClient
      clientId={clientId}
      clientName={client.name}
      brandKit={brandKit || null}
      draftContent={draft?.rawContent || null}
    />
  )
}
