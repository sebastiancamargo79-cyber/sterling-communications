import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import ImgOrPlaceholder from './ImgOrPlaceholder'
import sharedStyles from './shared.module.css'
import styles from './Page1CoverAlt.module.css'

interface Props {
  data: Exclude<Newsletter['cover'], undefined>
  meta: Newsletter['meta']
  logoUrl?: string | null
}

/** Alternate cover: hero image fills the left 55%, teaser list stacks on the right */
export default function Page1CoverAlt({ data, meta, logoUrl }: Props) {
  return (
    <article className={sharedStyles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          {logoUrl ? (
            <img src={logoUrl} alt={meta.office_name} className={styles.logoImg} />
          ) : (
            <span className={styles.logoText}>{meta.office_name}</span>
          )}
        </div>
        <div className={styles.metaLine}>
          <span className={styles.month}>{meta.month}</span>
          <span className={styles.officeName}>{meta.office_name}</span>
        </div>
      </header>

      <hr className={sharedStyles.rule} />

      <div className={styles.splitBody}>
        <div className={styles.imagePane}>
          <ImgOrPlaceholder
            className={styles.heroImg}
            src={data.hero_image_url}
            alt="Newsletter cover"
          />
        </div>
        <div className={styles.teaserPane}>
          <div className={styles.accentBar} />
          {data.intro_paragraph && (
            <p className={styles.introParagraph}>{data.intro_paragraph}</p>
          )}
          <h2 className={styles.teaserHeading}>In This Issue</h2>
          <ul className={styles.teaserList}>
            {data.teasers.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={1}
      />
    </article>
  )
}
