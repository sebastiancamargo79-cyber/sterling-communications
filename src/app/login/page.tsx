import { Suspense } from 'react'
import LoginForm from './LoginForm'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoMark}>
          <svg width="22" height="17" viewBox="0 0 22 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="2.5" cy="8.5" r="2.5" fill="white"/>
            <path d="M7.5 5a5 5 0 0 1 0 7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 2.5a9 9 0 0 1 0 12" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
            <path d="M16.5 0.5a13 13 0 0 1 0 16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
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
