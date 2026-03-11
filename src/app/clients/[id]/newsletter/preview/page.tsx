import { ZodError } from 'zod'
import { parseNewsletter, NoDraftError } from '@/lib/newsletter-parser'
import { extractModuleBlocks } from '@/lib/module-parser'
import { db } from '@/db'
import { brandKits, clients, newsletterEditions, newsletterDrafts } from '@/db/schema'
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
  let moduleOrder: string[] = []

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
      moduleOrder = extractModuleBlocks(edition.rawContent).map((b) => b.name)
    } else {
      const draft = await db.query.newsletterDrafts.findFirst({
        where: eq(newsletterDrafts.clientId, id),
      })
      if (draft?.rawContent) {
        data = await parseNewsletter(draft.rawContent)
        moduleOrder = extractModuleBlocks(draft.rawContent).map((b) => b.name)
      } else {
        data = await parseNewsletter(undefined, id)
      }
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

  // Map module names to their storage keys and render components
  const moduleNameToStorageKey: { [key: string]: string } = {
    'Meta': 'meta',
    'Cover': 'cover',
    'DirectorUpdate': 'director_update',
    'Events': 'events',
    'ClientStory': 'client_story',
    'StaffSpotlight': 'spotlight',
    'Tips': 'tips',
    'Community': 'community',
  }

  const renderModulePage = (storageKey: string) => {
    switch (storageKey) {
      case 'cover':
        return data.cover ? <Page1Cover key="cover" data={data.cover} meta={data.meta} logoUrl={brandKit?.logoUrl} /> : null
      case 'director_update':
        return data.director_update ? <Page2DirectorUpdate key="director_update" data={data.director_update} meta={data.meta} /> : null
      case 'events':
        return data.events ? <Page3Diary key="events" events={data.events} meta={data.meta} /> : null
      case 'client_story':
        return data.client_story ? <Page4ClientStory key="client_story" data={data.client_story} meta={data.meta} /> : null
      case 'spotlight':
        return data.spotlight ? <Page5Spotlight key="spotlight" data={data.spotlight} meta={data.meta} employerName={client?.name ?? 'Home Care'} /> : null
      default:
        return null
    }
  }

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
        {(() => {
          let page6Rendered = false
          return moduleOrder
            .filter((name) => name !== 'Meta')
            .map((moduleName) => {
              const storageKey = moduleNameToStorageKey[moduleName]
              if (!storageKey) return null

              if (storageKey === 'tips' || storageKey === 'community') {
                if (page6Rendered) return null
                page6Rendered = true
                return (data.tips || data.community)
                  ? <Page6Tips key="tips_community" tips={data.tips} community={data.community} meta={data.meta} />
                  : null
              }
              return renderModulePage(storageKey)
            })
        })()}
      </div>
    </div>
  )
}
