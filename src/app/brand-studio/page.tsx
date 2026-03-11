import Link from 'next/link'
import Container from '@/components/Container'
import { db } from '@/db'
import { clients, brandKits } from '@/db/schema'
import { eq } from 'drizzle-orm'
import styles from './page.module.css'

export default async function BrandStudioPage() {
  const clientsWithKits = await db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      hasBrandKit: brandKits.id,
    })
    .from(clients)
    .leftJoin(brandKits, eq(clients.id, brandKits.clientId))

  // Group by client (in case multiple brand kits)
  const clientMap = new Map<string, { name: string; hasBrandKit: boolean }>()
  clientsWithKits.forEach((row: any) => {
    const { clientId, clientName, hasBrandKit } = row
    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        name: clientName,
        hasBrandKit: !!hasBrandKit,
      })
    }
  })

  const clientList = Array.from(clientMap.entries()).map(([id, { name, hasBrandKit }]) => ({
    id,
    name,
    hasBrandKit,
  }))

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <h1 className={styles.heading}>Brand Studio</h1>
          <p className={styles.subtitle}>Design tokens, brand extraction, and AI design assistant</p>
        </div>

        {clientList.length === 0 ? (
          <div className={styles.empty}>
            <p>No clients yet. <Link href="/clients/new">Create one</Link> to get started.</p>
          </div>
        ) : (
          <div className={styles.clientList}>
            {clientList.map((client) => (
              <Link
                key={client.id}
                href={`/brand-studio/${client.id}`}
                className={styles.clientCard}
              >
                <div className={styles.clientCardHeader}>
                  <h2 className={styles.clientName}>{client.name}</h2>
                  <span className={client.hasBrandKit ? styles.badgeSet : styles.badgeEmpty}>
                    {client.hasBrandKit ? 'Brand Kit Set' : 'No Brand Kit'}
                  </span>
                </div>
                <p className={styles.clientCardDesc}>
                  {client.hasBrandKit
                    ? 'Edit and refine your brand design tokens'
                    : 'Extract brand tokens from your brand guidelines PDF'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </main>
  )
}
