import { db } from '@/db'
import { clients, brandKits, newsletterEditions } from '@/db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import ClientsClient from './ClientsClient'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const rows = await db
    .select()
    .from(clients)
    .leftJoin(brandKits, eq(brandKits.clientId, clients.id))
    .orderBy(asc(clients.name))

  const editionStats = await db
    .select({
      clientId: newsletterEditions.clientId,
      editionCount: sql<number>`count(*)`,
      lastEditionAt: sql<string>`max(${newsletterEditions.createdAt})`,
    })
    .from(newsletterEditions)
    .groupBy(newsletterEditions.clientId) as { clientId: string; editionCount: number; lastEditionAt: string | null }[]

  const statsMap = new Map(editionStats.map(s => [s.clientId, s]))

  const map = new Map<string, {
    id: string
    name: string
    createdAt: Date | null
    editionCount: number
    lastEditionAt: string | null
    brandKit: { mode: string; primaryColor: string | null; logoUrl: string | null } | null
  }>()

  for (const row of rows) {
    const c = row.clients
    const bk = row.brand_kits
    if (!map.has(c.id)) {
      const stats = statsMap.get(c.id)
      map.set(c.id, {
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
        editionCount: Number(stats?.editionCount ?? 0),
        lastEditionAt: stats?.lastEditionAt ?? null,
        brandKit: bk ? { mode: bk.mode, primaryColor: bk.primaryColor, logoUrl: bk.logoUrl } : null,
      })
    }
  }

  return <ClientsClient clients={Array.from(map.values())} />
}
