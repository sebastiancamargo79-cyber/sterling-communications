import { db } from '@/db'
import { clients, brandKits, newsletterDrafts, newsletterEditions } from '@/db/schema'
import { eq, count } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import WorkspaceSaveEdition from './WorkspaceSaveEdition'
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

  const [draft] = await db
    .select()
    .from(newsletterDrafts)
    .where(eq(newsletterDrafts.clientId, id))
    .limit(1)

  const [editionCount] = await db
    .select({ count: count() })
    .from(newsletterEditions)
    .where(eq(newsletterEditions.clientId, id))

  const draftUpdatedAt = draft?.updatedAt ?? null
  const editions = editionCount?.count ?? 0

  return (
    <main className={styles.main}>
      <Container>
        <nav className={styles.breadcrumb}>
          <Link href="/clients" className={styles.breadcrumbLink}>Clients</Link>
          <span className={styles.breadcrumbSep}>›</span>
          <span>{client.name}</span>
        </nav>

        <h1 className={styles.heading}>{client.name}</h1>

        <div className={styles.grid}>
          {/* Newsletter card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Newsletter</h2>
            {draftUpdatedAt ? (
              <p className={styles.cardMeta}>
                Last saved: {new Date(draftUpdatedAt).toLocaleString()}
              </p>
            ) : (
              <p className={styles.cardMeta}>No draft yet</p>
            )}
            <div className={styles.cardActions}>
              <Link href={`/clients/${id}/newsletter/editor`} className={styles.btnPrimary}>
                Edit Newsletter
              </Link>
              <Link href={`/clients/${id}/newsletter/preview`} className={styles.btnSecondary}>
                Preview
              </Link>
              <WorkspaceSaveEdition clientId={id} hasDraft={!!draft} />
            </div>
          </div>

          {/* Editions card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Edition History</h2>
            <p className={styles.cardMeta}>
              {editions} saved edition{editions !== 1 ? 's' : ''}
            </p>
            <div className={styles.cardActions}>
              <Link href={`/clients/${id}/newsletter/editions`} className={styles.btnSecondary}>
                View Editions →
              </Link>
            </div>
          </div>

          {/* Brand kit card */}
          {brandKit && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Brand Kit</h2>
              {brandKit.mode === 'manual' && brandKit.primaryColor && (
                <div className={styles.swatchRow}>
                  <div
                    className={styles.swatch}
                    style={{ background: brandKit.primaryColor }}
                  />
                  <span className={styles.swatchHex}>{brandKit.primaryColor}</span>
                </div>
              )}
              {brandKit.mode === 'uploaded' && brandKit.guidelinesPdfUrl && (
                <a
                  href={brandKit.guidelinesPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.pdfLink}
                >
                  View Guidelines PDF ↗
                </a>
              )}
              <p className={styles.cardMeta}>Mode: {brandKit.mode}</p>
            </div>
          )}
        </div>
      </Container>
    </main>
  )
}
