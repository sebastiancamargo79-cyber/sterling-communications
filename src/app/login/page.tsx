import { Suspense } from 'react'
import LoginForm from './LoginForm'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoMark}>
          <svg width="18" height="21" viewBox="0 0 18 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 1 L17.5 9 L0.5 9 Z" fill="white"/>
            <path d="M0.5 9 L17.5 9 L9 20 Z" fill="white" opacity="0.55"/>
            <line x1="0.5" y1="9" x2="17.5" y2="9" stroke="#818CF8" strokeWidth="1"/>
          </svg>
        </div>
        <p className={styles.logo}>Sterling Communications</p>
        <p className={styles.subtitle}>Enter your password to continue</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
