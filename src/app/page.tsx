import Link from 'next/link'
import Container from '@/components/Container'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.hero}>
          <h1 className={styles.heading}>Sterling Communications</h1>
          <p className={styles.subtitle}>Office and brand management.</p>
          <div className={styles.actions}>
            <Link href="/offices/new" className={styles.btnPrimary}>
              Create Office
            </Link>
            <Link href="/offices" className={styles.btnSecondary}>
              View Offices
            </Link>
          </div>
        </div>
      </Container>
    </main>
  )
}
