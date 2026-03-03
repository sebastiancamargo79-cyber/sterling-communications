'use client'

import { useState, FormEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const from = searchParams.get('from') || '/'

    const res = await fetch(`/api/auth/login?from=${encodeURIComponent(from)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      const data = await res.json()
      router.replace(data.redirect || '/')
    } else {
      setError('Incorrect password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.logo}>Sterling Communications</p>
        <p className={styles.subtitle}>Enter your password to continue</p>
        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" className={styles.btn} disabled={loading || !password}>
            {loading ? 'Checking…' : 'Enter'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  )
}
