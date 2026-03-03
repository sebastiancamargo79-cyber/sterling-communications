import { db } from '@/db'
import { clients, brandKits } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'
import ClientsClient from './ClientsClient'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const rows = await db
    .select()
    .from(clients)
    .leftJoin(brandKits, eq(brandKits.clientId, clients.id))
    .orderBy(asc(clients.name))

  const map = new Map<string, {
    id: string
    name: string
    createdAt: Date | null
    brandKit: { mode: string; primaryColor: string | null; logoUrl: string | null } | null
  }>()

  for (const row of rows) {
    const c = row.clients
    const bk = row.brand_kits
    if (!map.has(c.id)) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        brandKit: bk ? { mode: bk.mode, primaryColor: bk.primaryColor, logoUrl: bk.logoUrl } : null,
      })
    }
  }

  return <ClientsClient clients={Array.from(map.values())} />
}
