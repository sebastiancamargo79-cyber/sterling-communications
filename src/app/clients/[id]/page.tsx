import { db } from '@/db'
import { clients, brandKits, newsletterEditions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import EditionsClientComponent from './EditionsClient'
// breadcrumb removed — sidebar provides context
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  if (!client) notFound()

  const [brandKit] = await db.select().from(brandKits).where(eq(brandKits.clientId, id)).limit(1)

  const editions = await db
    .select()
    .from(newsletterEditions)
    .where(eq(newsletterEditions.clientId, id))
    .orderBy(desc(newsletterEditions.createdAt))

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.headerRow}>
          <h1 className={styles.heading}>{client.name}</h1>
          <Link href={`/clients/${id}/newsletter/editor`} className={styles.btnNewEdition}>
            + New Edition
          </Link>
        </div>

        {/* Editions list */}
        <div className={styles.editionsSection}>
          <h2 className={styles.sectionTitle}>Editions</h2>
          {editions.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No editions yet. <Link href={`/clients/${id}/newsletter/editor`}>Create your first edition →</Link></p>
            </div>
          ) : (
            <EditionsClientComponent clientId={id} editions={editions} />
          )}
        </div>

        {/* Brand kit card */}
        {brandKit && (
          <div className={styles.brandKitSection}>
            <h2 className={styles.sectionTitle}>Brand Kit</h2>
            <div className={styles.brandKitCard}>
              <div className={styles.brandKitColors}>
                <div>
                  <label className={styles.brandLabel}>Primary</label>
                  <div className={styles.colorSwatch} style={{ background: brandKit.primaryColor || '#006938' }} />
                  <span className={styles.colorValue}>{brandKit.primaryColor || '#006938'}</span>
                </div>
                {brandKit.secondaryColor && (
                  <div>
                    <label className={styles.brandLabel}>Secondary</label>
                    <div className={styles.colorSwatch} style={{ background: brandKit.secondaryColor }} />
                    <span className={styles.colorValue}>{brandKit.secondaryColor}</span>
                  </div>
                )}
              </div>
              {brandKit.logoUrl && (
                <div className={styles.brandKitLogo}>
                  <label className={styles.brandLabel}>Logo</label>
                  <img src={brandKit.logoUrl} alt="Logo" className={styles.logoThumbnail} />
                </div>
              )}
              <Link href={`/clients/${id}/brand-kit`} className={styles.btnBrandKit}>
                Edit Brand Kit →
              </Link>
            </div>
          </div>
        )}
      </Container>
    </main>
  )
}
