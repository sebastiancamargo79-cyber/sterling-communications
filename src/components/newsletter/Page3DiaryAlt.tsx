import type { Newsletter, EventItem } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page3DiaryAlt.module.css'

interface Props {
  events: Exclude<Newsletter['events'], undefined>
  meta: Newsletter['meta']
}

function parseDate(dateStr: string): { day: string; month: string } | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return {
    day: d.getDate().toString(),
    month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
  }
}

function EventRow({ item }: { item: EventItem }) {
  if (item.type === 'photo') {
    return (
      <div className={styles.row}>
        <div className={styles.photoBadge}>📷</div>
        <div className={styles.rowContent}>
          <p className={styles.caption}>{item.caption}</p>
        </div>
      </div>
    )
  }

  const parsed = parseDate(item.date)

  return (
    <div className={styles.row}>
      {parsed ? (
        <div className={styles.dateBadge}>
          <span className={styles.dateDay}>{parsed.day}</span>
          <span className={styles.dateMonth}>{parsed.month}</span>
        </div>
      ) : (
        <div className={styles.dateBadge}>
          <span className={styles.dateDay}>—</span>
        </div>
      )}
      <div className={styles.rowContent}>
        <h3 className={styles.eventTitle}>{item.title}</h3>
        <p className={styles.eventMeta}>
          <strong>{item.date}</strong> · {item.time} · {item.location}
        </p>
        <p className={styles.eventDesc}>{item.description}</p>
      </div>
    </div>
  )
}

/** Alternate events: vertical list with accent-coloured date badges */
export default function Page3DiaryAlt({ events, meta }: Props) {
  const visible = events.slice(0, 8)

  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Dates for the Diary</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.list}>
        {visible.map((item, i) => (
          <EventRow key={i} item={item} />
        ))}
      </div>

      <NewsletterFooter
        phone={meta.phone}
        website={meta.website}
        email={meta.email}
        page={3}
      />
    </article>
  )
}
