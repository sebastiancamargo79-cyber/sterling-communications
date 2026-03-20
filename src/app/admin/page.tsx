import Link from 'next/link'
import Container from '@/components/Container'
import styles from './page.module.css'

export default function AdminPage() {
  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <h1 className={styles.heading}>Admin Centre</h1>
          <p className={styles.subtitle}>Manage system configuration</p>
        </div>

        <div className={styles.grid}>
          <Link href="/admin/modules" className={styles.card}>
            <div className={styles.cardIcon}>▦</div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>Newsletter Modules</span>
              <span className={styles.cardDesc}>View and create custom newsletter module definitions</span>
            </div>
            <span className={styles.cardArrow}>→</span>
          </Link>
          <Link href="/admin/ai-prompts" className={styles.card}>
            <div className={styles.cardIcon}>✦</div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>AI Prompts</span>
              <span className={styles.cardDesc}>Edit global default prompts for AI content generation</span>
            </div>
            <span className={styles.cardArrow}>→</span>
          </Link>
        </div>
      </Container>
    </main>
  )
}
