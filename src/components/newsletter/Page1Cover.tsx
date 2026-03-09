import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page1Cover.module.css'

interface Props {
  data: Exclude<Newsletter['cover'], undefined>
  meta: Newsletter['meta']
  logoUrl?: string | null
}

export default function Page1Cover({ data, meta, logoUrl }: Props) {
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

      <div className={styles.heroWrap}>
        <img
          className={styles.hero}
          src={data.hero_image_url}
          alt="Newsletter cover"
        />
      </div>

      <hr className={sharedStyles.rule} />

      <section className={styles.teasers}>
        <h2 className={styles.teaserHeading}>In This Issue</h2>
        <ul className={styles.teaserList}>
          {data.teasers.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={1}
      />
    </article>
  )
}
