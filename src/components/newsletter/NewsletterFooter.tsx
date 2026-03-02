import styles from './NewsletterFooter.module.css'

interface Props {
  phone: string
  website: string
  email: string
  page: number
}

export default function NewsletterFooter({ phone, website, email, page }: Props) {
  return (
    <footer className={styles.footer}>
      <span>{phone}</span>
      <span className={styles.divider}>|</span>
      <span>{website}</span>
      <span className={styles.divider}>|</span>
      <span>{email}</span>
      <span className={styles.pageNum}>Page {page}</span>
    </footer>
  )
}
