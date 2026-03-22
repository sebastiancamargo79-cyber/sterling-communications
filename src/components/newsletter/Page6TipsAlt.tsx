import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import ImgOrPlaceholder from './ImgOrPlaceholder'
import sharedStyles from './shared.module.css'
import styles from './Page6TipsAlt.module.css'

interface Props {
  tips: Exclude<Newsletter['tips'], undefined> | undefined
  community: Exclude<Newsletter['community'], undefined> | undefined
  meta: Newsletter['meta']
}

/** Alternate tips/community: 2-column bullet grid for tips, community side by side */
export default function Page6TipsAlt({ tips, community, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Tips &amp; Advice</h1>
      <hr className={sharedStyles.rule} />

      {tips && (
        <>
          <div className={styles.tipsImageWrap}>
            <ImgOrPlaceholder className={styles.tipsImage} src={tips.image_url} alt="Tips" />
          </div>
          <div className={styles.bulletGrid}>
            {tips.bullets.map((bullet, i) => (
              <div key={i} className={styles.bulletItem}>
                <span className={styles.bullet}>▸</span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {community && (
        <>
          <hr className={sharedStyles.rule} />

          <div className={styles.communityRow}>
            <div>
              <ReactMarkdown>{community.recruitment_cta_md}</ReactMarkdown>
            </div>
            <div>
              <ReactMarkdown>{community.awards_md}</ReactMarkdown>
            </div>
          </div>

          <hr className={sharedStyles.ruleLight} />

          <section className={styles.anniversaries}>
            <h2 className={styles.anniversaryHeading}>Staff Anniversaries</h2>
            <table className={styles.anniversaryTable}>
              <tbody>
                {community.anniversaries.map((a, i) => (
                  <tr key={i}>
                    <td className={styles.aName}>{a.name}</td>
                    <td className={styles.aYears}>{a.years} Year{a.years !== 1 ? 's' : ''}</td>
                    {a.note && <td className={styles.aNote}>{a.note}</td>}
                    {!a.note && <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={6}
      />
    </article>
  )
}
