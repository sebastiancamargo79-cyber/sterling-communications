import { db } from '@/db'
import { clients, brandKits, newsletterEditions } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileEdit, Eye, BookOpen, Palette } from 'lucide-react'
import Container from '@/components/Container'
import EditionsClientComponent from './EditionsClient'
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

  const clientColor = brandKit?.primaryColor ?? '#4F46E5'

  return (
    <main className={styles.main}>
      {/* Hero header */}
      <div className={styles.hero}>
        <Container>
          <div className={styles.heroContent}>
            <div className={styles.heroAvatar} style={{ background: clientColor }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.heroMeta}>
              <h1 className={styles.heading}>{client.name}</h1>
              <p className={styles.heroSub}>
                {editions.length} edition{editions.length !== 1 ? 's' : ''}
                {brandKit ? ' · Brand kit configured' : ' · No brand kit'}
              </p>
            </div>
            <Link href={`/clients/${id}/newsletter/editor`} className={styles.btnNewEdition}>
              <Plus size={14} />
              New Edition
            </Link>
          </div>
        </Container>
      </div>

      <div className={styles.body}>
        <Container>
          {/* Quick action cards */}
          <div className={styles.quickActions}>
            <Link href={`/clients/${id}/newsletter/editor`} className={styles.quickAction}>
              <div className={styles.qaIcon}><FileEdit size={17} /></div>
              <span className={styles.qaLabel}>Editor</span>
              <span className={styles.qaDesc}>Write &amp; design</span>
            </Link>
            <Link href={`/clients/${id}/newsletter/preview`} className={styles.quickAction}>
              <div className={styles.qaIcon}><Eye size={17} /></div>
              <span className={styles.qaLabel}>Preview</span>
              <span className={styles.qaDesc}>See how it looks</span>
            </Link>
            <Link href={`/clients/${id}/newsletter/editions`} className={styles.quickAction}>
              <div className={styles.qaIcon}><BookOpen size={17} /></div>
              <span className={styles.qaLabel}>Editions</span>
              <span className={styles.qaDesc}>{editions.length} total</span>
            </Link>
            <Link href={`/clients/${id}/brand-studio`} className={styles.quickAction}>
              <div className={styles.qaIcon}><Palette size={17} /></div>
              <span className={styles.qaLabel}>Brand Studio</span>
              <span className={styles.qaDesc}>{brandKit ? 'Kit configured' : 'Not set up'}</span>
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
              <div className={styles.brandKitHeader}>
                <h2 className={styles.sectionTitle}>Brand Kit</h2>
                <Link href={`/clients/${id}/brand-studio`} className={styles.btnBrandKit}>
                  Edit Brand Kit →
                </Link>
              </div>
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
              </div>
            </div>
          )}
        </Container>
      </div>
    </main>
  )
}
