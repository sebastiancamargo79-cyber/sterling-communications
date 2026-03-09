import ReactMarkdown from 'react-markdown'
import type { Newsletter } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page6Tips.module.css'

interface Props {
  tips: Exclude<Newsletter['tips'], undefined> | undefined
  community: Exclude<Newsletter['community'], undefined> | undefined
  meta: Newsletter['meta']
}

export default function Page6Tips({ tips, community, meta }: Props) {
  return (
    <article className={sharedStyles.page}>
      {/* Top half — Tips */}
      <h1 className={styles.heading}>Tips &amp; Advice</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.tipsRow}>
        <div className={styles.tipsImageWrap}>
          <img className={styles.tipsImage} src={tips.image_url} alt="Tips" />
        </div>
        <ul className={styles.bulletList}>
          {tips.bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      </div>

      <hr className={sharedStyles.rule} />

      {/* Bottom half — Community */}
      <div className={styles.communityRow}>
        <div className={styles.recruitment}>
          <ReactMarkdown>{community.recruitment_cta_md}</ReactMarkdown>
        </div>
        <div className={styles.awards}>
          <ReactMarkdown>{community.awards_md}</ReactMarkdown>
        </div>
      </div>

      <hr className={sharedStyles.ruleLight} />

      {/* Anniversaries */}
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

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={6}
      />
    </article>
  )
}
