import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page2DirectorUpdateAlt.module.css'

interface Props {
  data: Exclude<Newsletter['director_update'], undefined>
  meta: Newsletter['meta']
}

/** Alternate director update: two columns — large pull quote left, body right */
export default function Page2DirectorUpdateAlt({ data, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Director&rsquo;s Update</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.twoCol}>
        <div className={styles.leftCol}>
          <blockquote className={styles.pullQuote}>
            <span className={styles.openQuote}>&ldquo;</span>
            {data.pull_quote}&rdquo;
          </blockquote>
          <div className={styles.signature}>
            <span className={styles.sigName}>{data.signature_name}</span>
            <span className={styles.sigTitle}>{data.signature_title}</span>
          </div>
        </div>
        <div className={styles.rightCol}>
          <div className={styles.body}>
            <ReactMarkdown>{data.body_md}</ReactMarkdown>
          </div>
        </div>
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
