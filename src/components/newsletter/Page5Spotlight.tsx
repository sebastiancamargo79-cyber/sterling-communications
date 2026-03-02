import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page5Spotlight.module.css'

interface Props {
  data: Newsletter['spotlight']
  meta: Newsletter['meta']
}

export default function Page5Spotlight({ data, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Care Professional Spotlight</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.profile}>
        <div className={styles.portraitWrap}>
          <img className={styles.portrait} src={data.image_url} alt={data.name} />
        </div>
        <div className={styles.info}>
          <h2 className={styles.name}>{data.name}</h2>
          <p className={styles.roleLine}>
            {data.role} &middot; {data.years} year{data.years !== 1 ? 's' : ''} with Home Instead
          </p>
          <blockquote className={styles.quote}>
            &ldquo;{data.quote}&rdquo;
          </blockquote>
          <div className={styles.bio}>
            <ReactMarkdown>{data.bio_md}</ReactMarkdown>
          </div>
        </div>
      </div>

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={5}
      />
    </article>
  )
}
