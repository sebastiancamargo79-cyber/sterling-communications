import { ZodError } from 'zod'
import { parseNewsletter, NoDraftError } from '@/lib/newsletter-parser'
import { extractModuleBlocks, extractVariantFromYaml } from '@/lib/module-parser'
import { getAllModuleDefs } from '@/lib/module-registry'
import { db } from '@/db'
import { brandKits, clients, newsletterEditions, newsletterDrafts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PrintButton } from '@/components/newsletter/PrintButton'
import { DownloadPdfButton } from '@/components/newsletter/DownloadPdfButton'
import Page1Cover from '@/components/newsletter/Page1Cover'
import Page1CoverAlt from '@/components/newsletter/Page1CoverAlt'
import Page2DirectorUpdate from '@/components/newsletter/Page2DirectorUpdate'
import Page2DirectorUpdateAlt from '@/components/newsletter/Page2DirectorUpdateAlt'
import Page3Diary from '@/components/newsletter/Page3Diary'
import Page3DiaryAlt from '@/components/newsletter/Page3DiaryAlt'
import Page4ClientStory from '@/components/newsletter/Page4ClientStory'
import Page4ClientStoryAlt from '@/components/newsletter/Page4ClientStoryAlt'
import Page5Spotlight from '@/components/newsletter/Page5Spotlight'
import Page5SpotlightAlt from '@/components/newsletter/Page5SpotlightAlt'
import Page6Tips from '@/components/newsletter/Page6Tips'
import Page6TipsAlt from '@/components/newsletter/Page6TipsAlt'
import GenericModuleCard from '@/components/newsletter/GenericModuleCard'
import BrokenImageHandler from '@/components/newsletter/BrokenImageHandler'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

/** Map brand-kit property names to CSS variable names */
function tokenToCssVar(token: string): string | null {
  const map: Record<string, string> = {
    primaryColor: '--brand-primary',
    secondaryColor: '--brand-secondary',
    bgColor: '--brand-bg',
    accentColor: '--brand-accent',
    textColor: '--brand-text',
    headingFontSize: '--brand-heading-size',
    bodyFontSize: '--brand-body-size',
    cardBorderRadius: '--brand-radius',
  }
  return map[token] ?? null
}

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
  let tokenOverrides: Record<string, string> = {}

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
      tokenOverrides = (edition.tokenOverrides as Record<string, string>) ?? {}
    } else {
      const draft = await db.query.newsletterDrafts.findFirst({
        where: eq(newsletterDrafts.clientId, id),
      })
      if (draft?.rawContent) {
        data = await parseNewsletter(draft.rawContent)
        rawBlocks = extractModuleBlocks(draft.rawContent)
        moduleOrder = rawBlocks.map((b) => b.name)
        tokenOverrides = (draft.tokenOverrides as Record<string, string>) ?? {}
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
      const editorHref = editionId
        ? `/clients/${id}/newsletter/editor?editionId=${editionId}`
        : `/clients/${id}/newsletter/editor`
      return (
        <div className={styles.wrapper}>
          <div className={styles.printBar}>
            <a href={editorHref} className={styles.backLink}>&larr; Back to Editor</a>
          </div>
          <div className={styles.errorBox}>
            <h1>Some required fields are missing</h1>
            <p>Please fill in the following fields in the editor and try previewing again:</p>
            <ul>
              {err.errors.map((e, i) => (
                <li key={i}>
                  <span className={styles.fieldPath}>{e.path.join('.')}</span>
                  {': '}
                  <span className={styles.fieldMsg}>{e.message}</span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: '1.25rem' }}>
              <a href={editorHref} style={{ color: '#c0392b', fontWeight: 600 }}>
                &larr; Go back to the editor to fix these
              </a>
            </p>
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

  // Base CSS vars from brand kit
  const styleVars: Record<string, string> = {
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
  }

  // Merge edition/draft token overrides on top of brand kit
  for (const [token, value] of Object.entries(tokenOverrides)) {
    const cssVar = tokenToCssVar(token)
    if (cssVar && value) {
      // For font names, wrap in quotes and append stack
      if (token === 'fontHeadingName') {
        styleVars['--font-heading'] = `'${value}', serif`
      } else if (token === 'fontBodyName') {
        styleVars['--font-body'] = `'${value}', sans-serif`
      } else {
        styleVars[cssVar] = value
      }
    }
  }

  // Build per-module variant map from YAML __variant__ fields
  const variantMap: Record<string, string> = {}
  for (const block of rawBlocks) {
    variantMap[block.name] = extractVariantFromYaml(block.yaml)
  }

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
    const variant = variantMap[moduleName] ?? 'classic'
    const alt = variant === 'alternate'

    if (storageKey) {
      switch (storageKey) {
        case 'cover':
          if (!data.cover) return null
          return alt
            ? <Page1CoverAlt key="cover" data={data.cover} meta={data.meta} logoUrl={brandKit?.logoUrl} />
            : <Page1Cover key="cover" data={data.cover} meta={data.meta} logoUrl={brandKit?.logoUrl} />
        case 'director_update':
          if (!data.director_update) return null
          return alt
            ? <Page2DirectorUpdateAlt key="director_update" data={data.director_update} meta={data.meta} />
            : <Page2DirectorUpdate key="director_update" data={data.director_update} meta={data.meta} />
        case 'events':
          if (!data.events) return null
          return alt
            ? <Page3DiaryAlt key="events" events={data.events} meta={data.meta} />
            : <Page3Diary key="events" events={data.events} meta={data.meta} />
        case 'client_story':
          if (!data.client_story) return null
          return alt
            ? <Page4ClientStoryAlt key="client_story" data={data.client_story} meta={data.meta} />
            : <Page4ClientStory key="client_story" data={data.client_story} meta={data.meta} />
        case 'spotlight':
          if (!data.spotlight) return null
          return alt
            ? <Page5SpotlightAlt key="spotlight" data={data.spotlight} meta={data.meta} employerName={client?.name ?? 'Home Care'} />
            : <Page5Spotlight key="spotlight" data={data.spotlight} meta={data.meta} employerName={client?.name ?? 'Home Care'} />
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
      <div className={styles.wrapper} style={styleVars as React.CSSProperties}>
        <div className={styles.printBar}>
          {editionId ? (
            <a href={`/clients/${id}/newsletter/editor?editionId=${editionId}`} className={styles.backLink}>&larr; Back to Editor</a>
          ) : (
            <a href={`/clients/${id}`} className={styles.backLink}>&larr; Back to Client</a>
          )}
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
                const variant = variantMap[moduleName] ?? 'classic'
                const alt = variant === 'alternate'

                if (storageKey === 'tips' || storageKey === 'community') {
                  if (page6Rendered) return null
                  page6Rendered = true
                  if (!data.tips && !data.community) return null
                  return alt
                    ? <Page6TipsAlt key="tips_community" tips={data.tips} community={data.community} meta={data.meta} />
                    : <Page6Tips key="tips_community" tips={data.tips} community={data.community} meta={data.meta} />
                }
                return renderModulePage(moduleName)
              })
          })()}
        </div>
      </div>
    </>
  )
}
