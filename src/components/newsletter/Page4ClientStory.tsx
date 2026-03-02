import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page4ClientStory.module.css'

interface Props {
  data: Newsletter['client_story']
  meta: Newsletter['meta']
}

export default function Page4ClientStory({ data, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.headline}>{data.headline}</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.imageStrip}>
        <img className={styles.image} src={data.image_url} alt={data.headline} />
      </div>

      <hr className={sharedStyles.rule} />

      <div className={styles.body}>
        <ReactMarkdown>{data.body_md}</ReactMarkdown>
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
