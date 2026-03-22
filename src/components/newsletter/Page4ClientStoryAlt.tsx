import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import ImgOrPlaceholder from './ImgOrPlaceholder'
import sharedStyles from './shared.module.css'
import styles from './Page4ClientStoryAlt.module.css'

interface Props {
  data: Exclude<Newsletter['client_story'], undefined>
  meta: Newsletter['meta']
}

/** Alternate client story: image on left (40%), text on right */
export default function Page4ClientStoryAlt({ data, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.headline}>{data.headline}</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.splitLayout}>
        <div className={styles.imageCol}>
          <ImgOrPlaceholder className={styles.image} src={data.image_url} alt={data.headline} />
        </div>
        <div className={styles.textCol}>
          <div className={styles.accentLine} />
          <div className={styles.body}>
            <ReactMarkdown>{data.body_md}</ReactMarkdown>
          </div>
        </div>
      </div>

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={4}
      />
    </article>
  )
}
