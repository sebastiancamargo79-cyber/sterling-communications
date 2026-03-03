import Link from 'next/link'
import Container from '@/components/Container'
import styles from './page.module.css'

export default function AdminPage() {
  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <a href="/" className={styles.back}>← Home</a>
          <h1 className={styles.heading}>Admin Centre</h1>
          <p className={styles.subtitle}>Manage system configuration</p>
        </div>

        <div className={styles.grid}>
          <Link href="/admin/modules" className={styles.card}>
            <span className={styles.cardIcon}>⚙️</span>
            <span className={styles.cardTitle}>Newsletter Modules</span>
            <span className={styles.cardDesc}>View and create custom newsletter module definitions</span>
          </Link>
        </div>
      </Container>
    </main>
  )
}
