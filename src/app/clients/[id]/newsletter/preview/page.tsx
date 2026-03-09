import { ZodError } from 'zod'
import { parseNewsletter, NoDraftError } from '@/lib/newsletter-parser'
import { db } from '@/db'
import { brandKits, clients, newsletterEditions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PrintButton } from '@/components/newsletter/PrintButton'
import { DownloadPdfButton } from '@/components/newsletter/DownloadPdfButton'
import Page1Cover from '@/components/newsletter/Page1Cover'
import Page2DirectorUpdate from '@/components/newsletter/Page2DirectorUpdate'
import Page3Diary from '@/components/newsletter/Page3Diary'
import Page4ClientStory from '@/components/newsletter/Page4ClientStory'
import Page5Spotlight from '@/components/newsletter/Page5Spotlight'
import Page6Tips from '@/components/newsletter/Page6Tips'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function ClientNewsletterPreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ editionId?: string }>
}) {
  const { id } = await params
  const { editionId } = await searchParams

  let data

  try {
    // If editionId is provided, fetch edition content; otherwise use draft
    if (editionId) {
      const edition = await db.query.newsletterEditions.findFirst({
        where: eq(newsletterEditions.id, editionId),
      })
      if (!edition) {
        return (
          <div className={styles.wrapper}>
            <div className={styles.errorBox}>
              <h1>Edition Not Found</h1>
              <p>The requested newsletter edition could not be found.</p>
            </div>
          </div>
        )
      }
      data = await parseNewsletter(edition.rawContent)
    } else {
      data = await parseNewsletter(undefined, id)
    }
  } catch (err) {
    if (err instanceof NoDraftError) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.printBar}>
            <a href={`/clients/${id}`} className={styles.backLink}>&larr; Back to Client</a>
          </div>
          <div className={styles.errorBox}>
            <h1>No Newsletter Draft Yet</h1>
            <p>No newsletter draft has been saved for this client.</p>
            <p>
              <a href={`/clients/${id}/newsletter/editor`} style={{ color: '#10263B', fontWeight: 600 }}>
                Go to the editor to create one &rarr;
              </a>
            </p>
          </div>
        </div>
      )
    }
    if (err instanceof ZodError) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.errorBox}>
            <h1>Newsletter Content Validation Error</h1>
            <p>The newsletter content contains invalid data. Please fix the following issues:</p>
            <ul>
              {err.errors.map((e, i) => (
                <li key={i}>
                  <span className={styles.fieldPath}>{e.path.join('.')}</span>
                  {': '}
                  <span className={styles.fieldMsg}>{e.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    }
    throw err
  }

  // Fetch brand kit and client for brand colors
  const brandKit = await db.query.brandKits.findFirst({
    where: eq(brandKits.clientId, id),
  })

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
  })

  const brandColors = {
    primary: brandKit?.primaryColor ?? '#006938',
    secondary: brandKit?.secondaryColor ?? '#1a5c38',
  }

  // Inject CSS variables as inline styles
  const styleVars = {
    '--brand-primary': brandColors.primary,
    '--brand-secondary': brandColors.secondary,
  } as React.CSSProperties

  return (
    <div className={styles.wrapper} style={styleVars}>
      <div className={styles.printBar}>
        <a href={`/clients/${id}`} className={styles.backLink}>← Back to Client</a>
        <span className={styles.printBarTitle}>
          {data.meta.office_name} — {data.meta.month} Newsletter
        </span>
        <DownloadPdfButton clientId={id} />
        <PrintButton />
      </div>
      <div className={styles.pages}>
        {data.cover && <Page1Cover data={data.cover} meta={data.meta} logoUrl={brandKit?.logoUrl ?? null} />}
        {data.director_update && <Page2DirectorUpdate data={data.director_update} meta={data.meta} />}
        {data.events && <Page3Diary events={data.events} meta={data.meta} />}
        {data.client_story && <Page4ClientStory data={data.client_story} meta={data.meta} />}
        {data.spotlight && <Page5Spotlight data={data.spotlight} meta={data.meta} employerName={client?.name ?? 'Home Care'} />}
        {(data.tips || data.community) && <Page6Tips tips={data.tips ?? null} community={data.community ?? null} meta={data.meta} />}
      </div>
    </div>
  )
}
