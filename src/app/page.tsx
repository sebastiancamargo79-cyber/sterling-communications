import Link from 'next/link'
import Container from '@/components/Container'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.hero}>
          <h1 className={styles.heading}>Sterling Communications</h1>
          <p className={styles.subtitle}>Newsletter and client management platform.</p>
          <div className={styles.navGrid}>
            <Link href="/clients" className={styles.navCard}>
              <span className={styles.navCardIcon}>👥</span>
              <span className={styles.navCardTitle}>Clients</span>
              <span className={styles.navCardDesc}>Manage clients, newsletters, and edition history</span>
            </Link>
            <Link href="/admin" className={styles.navCard}>
              <span className={styles.navCardIcon}>⚙️</span>
              <span className={styles.navCardTitle}>Admin</span>
              <span className={styles.navCardDesc}>Configure newsletter modules and system settings</span>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  )
}
