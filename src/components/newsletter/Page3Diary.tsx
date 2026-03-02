import type { Newsletter, EventItem } from '@/lib/newsletter-schema'
import NewsletterFooter from './NewsletterFooter'
import sharedStyles from './shared.module.css'
import styles from './Page3Diary.module.css'

interface Props {
  events: EventItem[]
  meta: Newsletter['meta']
}

const FALLBACK_SLOTS: EventItem[] = [
  {
    type: 'photo',
    image_url: 'https://picsum.photos/seed/fall1/400/300',
    caption: 'Our team at a recent community event.',
  },
  {
    type: 'photo',
    image_url: 'https://picsum.photos/seed/fall2/400/300',
    caption: 'Clients enjoying a group activity session.',
  },
  {
    type: 'photo',
    image_url: 'https://picsum.photos/seed/fall3/400/300',
    caption: 'Spring flowers brightening up our office reception.',
  },
  {
    type: 'photo',
    image_url: 'https://picsum.photos/seed/fall4/400/300',
    caption: 'Award-winning care — our team at a recognition ceremony.',
  },
  {
    type: 'photo',
    image_url: 'https://picsum.photos/seed/fall5/400/300',
    caption: 'Volunteers and staff joining forces for a charity fundraiser.',
  },
  {
    type: 'photo',
    image_url: 'https://picsum.photos/seed/fall6/400/300',
    caption: 'New recruits completing their first training day.',
  },
]

function EventCard({ item }: { item: EventItem }) {
  if (item.type === 'photo') {
    return (
      <div className={styles.card}>
        <img className={styles.cardPhoto} src={item.image_url} alt={item.caption} />
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

export default function Page3Diary({ events, meta }: Props) {
  const allEvents = [...events, ...FALLBACK_SLOTS].slice(0, 6)

  return (
    <article className={sharedStyles.page}>
      <h1 className={styles.heading}>Dates for the Diary</h1>
      <hr className={sharedStyles.rule} />

      <div className={styles.grid}>
        {allEvents.map((item, i) => (
          <EventCard key={i} item={item} />
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
