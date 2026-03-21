import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import ImgOrPlaceholder from './ImgOrPlaceholder'
import sharedStyles from './shared.module.css'
import styles from './Page5Spotlight.module.css'

interface Props {
  data: Exclude<Newsletter['spotlight'], undefined>
  meta: Newsletter['meta']
  employerName?: string
}

export default function Page5Spotlight({ data, meta, employerName = 'Home Care' }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Care Professional Spotlight</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.profile}>
        <div className={styles.portraitWrap}>
          <ImgOrPlaceholder className={styles.portrait} src={data.image_url} alt={data.name} />
        </div>
        <div className={styles.info}>
          <h2 className={styles.name}>{data.name}</h2>
          <p className={styles.roleLine}>
            {data.role} &middot; {data.years} year{data.years !== 1 ? 's' : ''} with {employerName}
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
