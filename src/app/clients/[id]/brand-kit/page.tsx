import { db } from '@/db'
import { clients, brandKits } from '@/db/schema'
import { eq } from 'drizzle-orm'
import BrandKitClient from './BrandKitClient'

export const dynamic = 'force-dynamic'

export default async function BrandKitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let client = null
  let brandKit = null

  try {
    const [clientRow] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1)
    client = clientRow

    if (client) {
      const [bk] = await db
        .select()
        .from(brandKits)
        .where(eq(brandKits.clientId, id))
        .limit(1)
      brandKit = bk
    }
  } catch (e) {
    console.error('Error fetching client and brand kit:', e)
  }

  if (!client) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Client not found</h1>
        <p>
          <a href="/clients" style={{ color: '#10263B' }}>
            ← Back to clients
          </a>
        </p>
      </div>
    )
  }

  return (
    <BrandKitClient
      clientId={id}
      clientName={client.name}
      brandKit={brandKit}
    />
  )
}
