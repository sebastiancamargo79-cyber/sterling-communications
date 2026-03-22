import { db } from '@/db'
import { clients, newsletterEditions, newsletterDrafts, brandKits } from '@/db/schema'
import { desc, count, eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import styles from './page.module.css'
import { Users, FileText, BookOpen, Sparkles, ArrowRight, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [clientCount] = await db.select({ count: count() }).from(clients)
  const [editionCount] = await db.select({ count: count() }).from(newsletterEditions)
  const [draftCount] = await db
    .select({ count: count() })
    .from(newsletterDrafts)
    .where(sql`length(${newsletterDrafts.rawContent}) > 10`)

  const recentEditions = await db
    .select({
      id: newsletterEditions.id,
      title: newsletterEditions.title,
      createdAt: newsletterEditions.createdAt,
      clientId: newsletterEditions.clientId,
      clientName: clients.name,
    })
    .from(newsletterEditions)
    .leftJoin(clients, eq(newsletterEditions.clientId, clients.id))
    .orderBy(desc(newsletterEditions.createdAt))
    .limit(6)

  const recentClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      createdAt: clients.createdAt,
      primaryColor: brandKits.primaryColor,
    })
    .from(clients)
    .leftJoin(brandKits, eq(brandKits.clientId, clients.id))
    .orderBy(desc(clients.createdAt))
    .limit(5)

  const rawMonthly = await db
    .select({
      period: sql<string>`to_char(${newsletterEditions.createdAt}, 'YYYY-MM')`,
      editionCount: sql<number>`count(*)`,
    })
    .from(newsletterEditions)
    .groupBy(sql`to_char(${newsletterEditions.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${newsletterEditions.createdAt}, 'YYYY-MM') desc`)
    .limit(6) as { period: string; editionCount: number }[]

  const now = new Date()
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-GB', { month: 'short' })
    return { period, label, count: 0 }
  })
  const byPeriod = new Map(rawMonthly.map(m => [m.period, Number(m.editionCount)]))
  for (const m of chartData) m.count = byPeriod.get(m.period) ?? 0
  const chartMax = Math.max(...chartData.map(m => m.count), 1)

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>Dashboard</h1>
            <p className={styles.subtitle}>Overview of your newsletter platform</p>
          </div>
          <Link href="/clients/new" className={styles.btnNew}>
            <Sparkles size={15} />
            New Client
          </Link>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="indigo">
              <Users size={20} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{clientCount.count}</span>
              <span className={styles.statLabel}>Total Clients</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="violet">
              <BookOpen size={20} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{editionCount.count}</span>
              <span className={styles.statLabel}>Editions Published</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} data-color="sky">
              <FileText size={20} />
            </div>
            <div className={styles.statBody}>
              <span className={styles.statValue}>{draftCount.count}</span>
              <span className={styles.statLabel}>Active Drafts</span>
            </div>
          </div>
        </div>

        {/* Monthly chart */}
        <section className={styles.chartSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Activity</h2>
              <p className={styles.chartSubtitle}>Editions created by month</p>
            </div>
          </div>
          <div className={styles.chart}>
            {chartData.map((m) => (
              <div key={m.period} className={styles.chartCol}>
                <span className={styles.chartCount}>{m.count > 0 ? m.count : ''}</span>
                <div className={styles.chartBarWrap}>
                  <div
                    className={styles.chartBar}
                    style={{ height: `${Math.max((m.count / chartMax) * 100, m.count > 0 ? 8 : 4)}%` }}
                  />
                </div>
                <span className={styles.chartLabel}>{m.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Two column section */}
        <div className={styles.grid}>

          {/* Recent Editions */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Editions</h2>
              <Link href="/clients" className={styles.sectionLink}>
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentEditions.length === 0 ? (
              <div className={styles.empty}>
                <BookOpen size={28} />
                <p>No editions published yet</p>
              </div>
            ) : (
              <ul className={styles.list}>
                {recentEditions.map((e: (typeof recentEditions)[number]) => (
                  <li key={e.id} className={styles.listItem}>
                    <Link href={`/clients/${e.clientId}`} className={styles.listLink}>
                      <div className={styles.listAvatar} style={{ background: '#6366F1' }}>
                        {e.clientName?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className={styles.listBody}>
                        <span className={styles.listTitle}>{e.title}</span>
                        <span className={styles.listMeta}>{e.clientName}</span>
                      </div>
                      <div className={styles.listDate}>
                        <Clock size={11} />
                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short'
                        }) : '—'}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Clients */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Clients</h2>
              <Link href="/clients" className={styles.sectionLink}>
                View all <ArrowRight size={13} />
              </Link>
            </div>

            {recentClients.length === 0 ? (
              <div className={styles.empty}>
                <Users size={28} />
                <p>No clients yet</p>
                <Link href="/clients/new" className={styles.emptyLink}>Add your first client →</Link>
              </div>
            ) : (
              <ul className={styles.list}>
                {recentClients.map((c: (typeof recentClients)[number]) => (
                  <li key={c.id} className={styles.listItem}>
                    <Link href={`/clients/${c.id}`} className={styles.listLink}>
                      <div
                        className={styles.listAvatar}
                        style={{ background: c.primaryColor ?? '#6366F1' }}
                      >
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className={styles.listBody}>
                        <span className={styles.listTitle}>{c.name}</span>
                        <span className={styles.listMeta}>
                          Added {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : '—'}
                        </span>
                      </div>
                      <ArrowRight size={14} className={styles.listArrow} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>

        {/* Quick links */}
        <section className={styles.quickLinks}>
          <Link href="/clients" className={styles.quickCard}>
            <Users size={18} />
            <span>All Clients</span>
          </Link>
          <Link href="/clients/new" className={styles.quickCard}>
            <Sparkles size={18} />
            <span>New Client</span>
          </Link>
          <Link href="/admin" className={styles.quickCard}>
            <FileText size={18} />
            <span>Admin</span>
          </Link>
        </section>

      </div>
    </div>
  )
}
