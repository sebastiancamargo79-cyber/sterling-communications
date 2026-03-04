import { ZodError } from 'zod'
import { parseNewsletter, NoDraftError } from '@/lib/newsletter-parser'
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
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let data

  try {
    data = await parseNewsletter(undefined, id)
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

  return (
    <div className={styles.wrapper}>
      <div className={styles.printBar}>
        <a href={`/clients/${id}`} className={styles.backLink}>← Back to Client</a>
        <span className={styles.printBarTitle}>
          {data.meta.office_name} — {data.meta.month} Newsletter
        </span>
        <DownloadPdfButton clientId={id} />
        <PrintButton />
      </div>
      <div className={styles.pages}>
        <Page1Cover data={data.cover} meta={data.meta} />
        <Page2DirectorUpdate data={data.director_update} meta={data.meta} />
        <Page3Diary events={data.events} meta={data.meta} />
        <Page4ClientStory data={data.client_story} meta={data.meta} />
        <Page5Spotlight data={data.spotlight} meta={data.meta} />
        <Page6Tips tips={data.tips} community={data.community} meta={data.meta} />
      </div>
    </div>
  )
}
