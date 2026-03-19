import { ZodError } from 'zod'
import { parseNewsletter, NoDraftError } from '@/lib/newsletter-parser'
import { extractModuleBlocks } from '@/lib/module-parser'
import { getAllModuleDefs } from '@/lib/module-registry'
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
import GenericModuleCard from '@/components/newsletter/GenericModuleCard'
import BrokenImageHandler from '@/components/newsletter/BrokenImageHandler'
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
  let rawBlocks: Array<{ name: string; yaml: string }> = []

  try {
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
      rawBlocks = extractModuleBlocks(edition.rawContent)
      moduleOrder = rawBlocks.map((b) => b.name)
    } else {
      const draft = await db.query.newsletterDrafts.findFirst({
        where: eq(newsletterDrafts.clientId, id),
      })
      if (draft?.rawContent) {
        data = await parseNewsletter(draft.rawContent)
        rawBlocks = extractModuleBlocks(draft.rawContent)
        moduleOrder = rawBlocks.map((b) => b.name)
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

  const brandKit = await db.query.brandKits.findFirst({
    where: eq(brandKits.clientId, id),
  })

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
  })

  // Fetch all module defs for generic rendering
  const allModuleDefs = await getAllModuleDefs()

  const brandColors = {
    primary: brandKit?.primaryColor ?? '#006938',
    secondary: brandKit?.secondaryColor ?? '#1a5c38',
    bg: brandKit?.bgColor ?? '#f5f5f0',
    accent: brandKit?.accentColor ?? brandKit?.secondaryColor ?? '#1a5c38',
    text: brandKit?.textColor ?? '#10263B',
  }

  const googleFontsLinks: string[] = []
  if (brandKit?.fontHeadingName) googleFontsLinks.push(brandKit.fontHeadingName)
  if (brandKit?.fontBodyName) googleFontsLinks.push(brandKit.fontBodyName)

  const fontHeadingFamily = brandKit?.fontHeadingName
    ? `'${brandKit.fontHeadingName}', serif`
    : 'Georgia, serif'
  const fontBodyFamily = brandKit?.fontBodyName
    ? `'${brandKit.fontBodyName}', sans-serif`
    : 'system-ui, sans-serif'

  const styleVars = {
    '--brand-primary': brandColors.primary,
    '--brand-secondary': brandColors.secondary,
    '--brand-bg': brandColors.bg,
    '--brand-accent': brandColors.accent,
    '--font-heading': fontHeadingFamily,
    '--font-body': fontBodyFamily,
    '--brand-text': brandColors.text,
    '--brand-heading-size': brandKit?.headingFontSize ?? '22px',
    '--brand-body-size': brandKit?.bodyFontSize ?? '13px',
    '--brand-radius': brandKit?.cardBorderRadius ?? '6px',
  } as React.CSSProperties

  // Known system module storage keys
  const knownStorageKeys: Record<string, string> = {
    'Meta': 'meta',
    'Cover': 'cover',
    'DirectorUpdate': 'director_update',
    'Events': 'events',
    'ClientStory': 'client_story',
    'StaffSpotlight': 'spotlight',
    'Tips': 'tips',
    'Community': 'community',
  }

  const renderModulePage = (moduleName: string) => {
    const storageKey = knownStorageKeys[moduleName]

    if (storageKey) {
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

    // Custom/unknown module — render generic card
    const block = rawBlocks.find((b) => b.name === moduleName)
    if (!block) return null
    const moduleDef = allModuleDefs.find((m) => m.name === moduleName)
    return (
      <GenericModuleCard
        key={moduleName}
        moduleName={moduleName}
        label={moduleDef?.label ?? moduleName}
        yaml={block.yaml}
      />
    )
  }

  return (
    <>
      {googleFontsLinks.length > 0 && (
        <link
          href={`https://fonts.googleapis.com/css2?${googleFontsLinks.map(f => `family=${encodeURIComponent(f)}:wght@400;600;700`).join('&')}&display=swap`}
          rel="stylesheet"
        />
      )}
      {(brandKit?.fontHeadingUrl || brandKit?.fontBodyUrl) && (
        <style>{[
          brandKit.fontHeadingUrl && `@font-face { font-family: 'BrandHeading'; src: url('${brandKit.fontHeadingUrl}'); }`,
          brandKit.fontBodyUrl && `@font-face { font-family: 'BrandBody'; src: url('${brandKit.fontBodyUrl}'); }`,
        ].filter(Boolean).join('\n')}</style>
      )}
      <BrokenImageHandler />
      <div className={styles.wrapper} style={styleVars}>
        <div className={styles.printBar}>
          <a href={`/clients/${id}`} className={styles.backLink}>&larr; Back to Client</a>
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
                const storageKey = knownStorageKeys[moduleName]

                if (storageKey === 'tips' || storageKey === 'community') {
                  if (page6Rendered) return null
                  page6Rendered = true
                  return (data.tips || data.community)
                    ? <Page6Tips key="tips_community" tips={data.tips} community={data.community} meta={data.meta} />
                    : null
                }
                return renderModulePage(moduleName)
              })
          })()}
        </div>
      </div>
    </>
  )
}
