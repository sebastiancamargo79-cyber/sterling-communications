import { Suspense } from 'react'
import LoginForm from './LoginForm'
import styles from './page.module.css'

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.logo}>Sterling Communications</p>
        <p className={styles.subtitle}>Enter your password to continue</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
