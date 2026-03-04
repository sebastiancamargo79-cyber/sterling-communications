'use client'

import { useState, FormEvent } from 'react'
import styles from './page.module.css'

interface Props {
  editionId: string
}

interface EditionData {
  title: string
  htmlSnapshot: string | null
  rawContent: string
  createdAt: string
}

export default function DeliveryClient({ editionId }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [edition, setEdition] = useState<EditionData | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/delivery/${editionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Access denied')
        return
      }

      const data = await res.json() as EditionData
      setEdition(data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (edition) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>{edition.title}</h1>
          <p className={styles.date}>
            Published {new Date(edition.createdAt).toLocaleDateString()}
          </p>
        </div>
        {edition.htmlSnapshot ? (
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: edition.htmlSnapshot }}
          />
        ) : (
          <div className={styles.rawFallback}>
            <pre className={styles.rawContent}>{edition.rawContent}</pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.loginBox}>
        <h1 className={styles.loginTitle}>Newsletter Access</h1>
        <p className={styles.loginDesc}>Enter your access code to view this edition.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.codeInput}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            autoComplete="off"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btnSubmit} type="submit" disabled={loading || !code.trim()}>
            {loading ? 'Verifying...' : 'View Edition'}
          </button>
        </form>
      </div>
    </div>
  )
}
