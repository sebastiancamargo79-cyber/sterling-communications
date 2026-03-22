import Link from 'next/link'
import { Layout, Sparkles, ChevronRight, Shield } from 'lucide-react'
import Container from '@/components/Container'
import styles from './page.module.css'

export default function AdminPage() {
  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <div className={styles.headerIcon}><Shield size={20} /></div>
          <div>
            <h1 className={styles.heading}>Admin Centre</h1>
            <p className={styles.subtitle}>Manage system configuration and platform settings</p>
          </div>
        </div>

        <p className={styles.sectionLabel}>Platform</p>
        <div className={styles.grid}>
          <Link href="/admin/modules" className={styles.card}>
            <div className={styles.cardIcon}><Layout size={18} /></div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>Newsletter Modules</span>
              <span className={styles.cardDesc}>View and create custom newsletter module definitions used across client editions</span>
            </div>
            <ChevronRight size={16} className={styles.cardArrow} />
          </Link>
          <Link href="/admin/ai-prompts" className={styles.card}>
            <div className={styles.cardIcon}><Sparkles size={18} /></div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>AI Prompts</span>
              <span className={styles.cardDesc}>Edit global default prompts for AI content generation and newsletter drafting</span>
            </div>
            <ChevronRight size={16} className={styles.cardArrow} />
          </Link>
        </div>
      </Container>
    </main>
  )
}
