import ReactMarkdown from 'react-markdown'
import type { Newsletter, EventItem } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page2DirectorWithEvents.module.css'

interface Props {
  director: Exclude<Newsletter['director_update'], undefined>
  events: Exclude<Newsletter['events'], undefined>
  meta: Newsletter['meta']
}

function EventCard({ item }: { item: EventItem }) {
  if (item.type === 'photo') {
    return (
      <div className={styles.card}>
        <p className={styles.caption}>{item.caption}</p>
      </div>
    )
  }
  return (
    <div className={styles.card}>
      <h3 className={styles.eventTitle}>{item.title}</h3>
      <p className={styles.eventMeta}>
        <strong>{item.date}</strong> · {item.time}
      </p>
      <p className={styles.eventLocation}>{item.location}</p>
      <p className={styles.eventDesc}>{item.description}</p>
    </div>
  )
}

export default function Page2DirectorWithEvents({ director, events, meta }: Props) {
  const displayEvents = events.slice(0, 4)

  return (
    <article className={sharedStyles.page}>
      {/* Director's Update */}
      <h1 className={styles.directorHeading}>Director&rsquo;s Update</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.body}>
        <ReactMarkdown>{director.body_md}</ReactMarkdown>
      </div>

      <blockquote className={styles.pullQuote}>
        &ldquo;{director.pull_quote}&rdquo;
      </blockquote>

      <div className={styles.signature}>
        <span className={styles.sigName}>{director.signature_name}</span>
        <span className={styles.sigTitle}>{director.signature_title}</span>
      </div>

      <hr className={sharedStyles.rule} />

      {/* Events Diary */}
      <h2 className={styles.eventsHeading}>Dates for the Diary</h2>
      <hr className={sharedStyles.ruleLight} />

      <div className={styles.grid}>
        {displayEvents.map((item, i) => (
          <EventCard key={i} item={item} />
        ))}
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
