import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page2DirectorUpdate.module.css'

interface Props {
  data: Exclude<Newsletter['director_update'], undefined>
  meta: Newsletter['meta']
}

export default function Page2DirectorUpdate({ data, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Director&rsquo;s Update</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.body}>
        <ReactMarkdown>{data.body_md}</ReactMarkdown>
      </div>

      <hr className={sharedStyles.rule} />

      <blockquote className={styles.pullQuote}>
        &ldquo;{data.pull_quote}&rdquo;
      </blockquote>

      <hr className={sharedStyles.rule} />

      <div className={styles.signature}>
        <span className={styles.sigName}>{data.signature_name}</span>
        <span className={styles.sigTitle}>{data.signature_title}</span>
      </div>

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={2}
      />
    </article>
  )
}
