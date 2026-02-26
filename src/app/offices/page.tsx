import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { offices as officesTable, brandKits } from '@/db/schema'
import Container from '@/components/Container'
import Card from '@/components/Card'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

interface BrandKit {
  id: string
  mode: string
  primaryColor: string | null
  logoUrl: string | null
  guidelinesPdfUrl: string | null
}

interface Office {
  id: string
  name: string
  createdAt: Date | null
  brandKit: BrandKit | null
}

async function getOffices(): Promise<Office[]> {
  const rows = await db
    .select()
    .from(officesTable)
    .leftJoin(brandKits, eq(brandKits.officeId, officesTable.id))

  const map = new Map<string, Office>()
  for (const row of rows) {
    const o = row.offices
    const bk = row.brand_kits
    if (!map.has(o.id)) {
      map.set(o.id, {
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        brandKit: bk
          ? { id: bk.id, mode: bk.mode, primaryColor: bk.primaryColor, logoUrl: bk.logoUrl, guidelinesPdfUrl: bk.guidelinesPdfUrl }
          : null,
      })
    }
  }
  return Array.from(map.values())
}

export default async function OfficesPage() {
  const offices = await getOffices()

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.topBar}>
          <div>
            <a href="/" className={styles.back}>← Home</a>
            <h1 className={styles.heading}>Offices</h1>
          </div>
          <Link href="/offices/new" className={styles.newBtn}>
            + New Office
          </Link>
        </div>

        {offices.length === 0 ? (
          <div className={styles.empty}>
            <p>No offices yet.</p>
            <Link href="/offices/new" className={styles.emptyLink}>
              Create your first office
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {offices.map((office) => (
              <Card key={office.id}>
                <div className={styles.cardContent}>
                  <div className={styles.cardTop}>
                    <h2 className={styles.officeName}>{office.name}</h2>
                    {office.brandKit && (
                      <span className={`${styles.badge} ${office.brandKit.mode === 'manual' ? styles.badgeManual : styles.badgeUploaded}`}>
                        {office.brandKit.mode === 'manual' ? 'Manual' : 'Uploaded'}
                      </span>
                    )}
                  </div>

                  {office.brandKit && (
                    <div className={styles.kitDetails}>
                      {office.brandKit.mode === 'manual' && office.brandKit.primaryColor && (
                        <div className={styles.colorRow}>
                          <span
                            className={styles.colorSwatch}
                            style={{ background: office.brandKit.primaryColor }}
                          />
                          <span className={styles.colorHex}>{office.brandKit.primaryColor}</span>
                        </div>
                      )}

                      <div className={styles.links}>
                        {office.brandKit.logoUrl && (
                          <a
                            href={office.brandKit.logoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.assetLink}
                          >
                            View Logo ↗
                          </a>
                        )}
                        {office.brandKit.guidelinesPdfUrl && (
                          <a
                            href={office.brandKit.guidelinesPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.assetLink}
                          >
                            View PDF ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>
    </main>
  )
}
