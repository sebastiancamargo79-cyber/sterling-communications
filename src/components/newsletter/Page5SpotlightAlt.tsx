import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import ImgOrPlaceholder from './ImgOrPlaceholder'
import sharedStyles from './shared.module.css'
import styles from './Page5SpotlightAlt.module.css'

interface Props {
  data: Exclude<Newsletter['spotlight'], undefined>
  meta: Newsletter['meta']
  employerName?: string
}

/** Alternate spotlight: centred card — circular portrait, quote box, bio below */
export default function Page5SpotlightAlt({ data, meta, employerName = 'Home Care' }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Care Professional Spotlight</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.card}>
        <div className={styles.portraitWrap}>
          <ImgOrPlaceholder className={styles.portrait} src={data.image_url} alt={data.name} />
        </div>

        <h2 className={styles.name}>{data.name}</h2>
        <p className={styles.roleLine}>
          {data.role} &middot; {data.years} year{data.years !== 1 ? 's' : ''} with {employerName}
        </p>

        <div className={styles.quoteBox}>
          <p className={styles.quote}>&ldquo;{data.quote}&rdquo;</p>
        </div>

        <div className={styles.bio}>
          <ReactMarkdown>{data.bio_md}</ReactMarkdown>
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
