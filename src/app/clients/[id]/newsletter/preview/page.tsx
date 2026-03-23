import { ZodError } from 'zod'
import { parseNewsletter, NoDraftError } from '@/lib/newsletter-parser'
import { extractModuleBlocks } from '@/lib/module-parser'
import { getAllModuleDefs } from '@/lib/module-registry'
import { db } from '@/db'
import { brandKits, clients, newsletterEditions, newsletterDrafts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import PreviewClient from './PreviewClient'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function ClientNewsletterPreview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ editionId?: string; t?: string }>
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

  const allModuleDefs = await getAllModuleDefs()

  const fontHeadingFamily = brandKit?.fontHeadingName
    ? `'${brandKit.fontHeadingName}', serif`
    : 'Georgia, serif'
  const fontBodyFamily = brandKit?.fontBodyName
    ? `'${brandKit.fontBodyName}', sans-serif`
    : 'system-ui, sans-serif'

  // Base CSS vars from brand kit only (edition overrides are merged client-side for live updates)
  const textColor = brandKit?.textColor ?? '#10263B'
  const baseStyleVars: Record<string, string> = {
    '--brand-primary': brandKit?.primaryColor ?? '#006938',
    '--brand-secondary': brandKit?.secondaryColor ?? '#1a5c38',
    '--brand-bg': brandKit?.bgColor ?? '#f5f5f0',
    '--brand-accent': brandKit?.accentColor ?? brandKit?.secondaryColor ?? '#1a5c38',
    '--brand-text': textColor,
    '--text': textColor,                  // legacy alias used in older component CSS
    '--brand-heading-size': brandKit?.headingFontSize ?? '22px',
    '--brand-body-size': brandKit?.bodyFontSize ?? '13px',
    '--brand-radius': brandKit?.cardBorderRadius ?? '6px',
    '--brand-divider': '#d1d5db',         // default subtle divider (overridable via dividerColor token)
    '--brand-text-muted': '#555555',      // default muted/caption text (overridable via mutedTextColor token)
    '--font-heading': fontHeadingFamily,
    '--font-body': fontBodyFamily,
  }

  const googleFontsLinks: string[] = []
  if (brandKit?.fontHeadingName) googleFontsLinks.push(brandKit.fontHeadingName)
  if (brandKit?.fontBodyName) googleFontsLinks.push(brandKit.fontBodyName)

  return (
    <>
      {googleFontsLinks.length > 0 && (
        <link
          href={`https://fonts.googleapis.com/css2?${googleFontsLinks.map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`).join('&')}&display=swap`}
          rel="stylesheet"
        />
      )}
      {(brandKit?.fontHeadingUrl || brandKit?.fontBodyUrl) && (
        <style>{[
          brandKit?.fontHeadingUrl && `@font-face { font-family: 'BrandHeading'; src: url('${brandKit.fontHeadingUrl}'); }`,
          brandKit?.fontBodyUrl && `@font-face { font-family: 'BrandBody'; src: url('${brandKit.fontBodyUrl}'); }`,
        ].filter(Boolean).join('\n')}</style>
      )}
      <PreviewClient
        clientId={id}
        editionId={editionId}
        parsedData={data}
        rawBlocks={rawBlocks}
        moduleOrder={moduleOrder}
        initialTokenOverrides={tokenOverrides}
        baseStyleVars={baseStyleVars}
        logoUrl={brandKit?.logoUrl ?? undefined}
        employerName={client?.name ?? 'Home Care'}
        allModuleDefs={allModuleDefs}
      />
    </>
  )
}
