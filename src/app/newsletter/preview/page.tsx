import { ZodError } from 'zod'
import { parseNewsletter } from '@/lib/newsletter-parser'
import { PrintButton } from '@/components/newsletter/PrintButton'
import Page1Cover from '@/components/newsletter/Page1Cover'
import Page2DirectorUpdate from '@/components/newsletter/Page2DirectorUpdate'
import Page3Diary from '@/components/newsletter/Page3Diary'
import Page4ClientStory from '@/components/newsletter/Page4ClientStory'
import Page5Spotlight from '@/components/newsletter/Page5Spotlight'
import Page6Tips from '@/components/newsletter/Page6Tips'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export default async function NewsletterPreview() {
  let data

  try {
    data = await parseNewsletter()
  } catch (err) {
    if (err instanceof ZodError) {
      return (
        <div className={styles.wrapper}>
          <div className={styles.errorBox}>
            <h1>Newsletter Content Validation Error</h1>
            <p>The newsletter.md file contains invalid content. Please fix the following issues:</p>
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
        <span className={styles.printBarTitle}>
          {data.meta.office_name} — {data.meta.month} Newsletter
        </span>
        <PrintButton />
      </div>
      <div className={styles.pages}>
        {data.cover && <Page1Cover data={data.cover} meta={data.meta} />}
        {data.director_update && <Page2DirectorUpdate data={data.director_update} meta={data.meta} />}
        {data.events && <Page3Diary events={data.events} meta={data.meta} />}
        {data.client_story && <Page4ClientStory data={data.client_story} meta={data.meta} />}
        {data.spotlight && <Page5Spotlight data={data.spotlight} meta={data.meta} />}
        {(data.tips || data.community) && <Page6Tips tips={data.tips} community={data.community} meta={data.meta} />}
      </div>
    </div>
  )
}
