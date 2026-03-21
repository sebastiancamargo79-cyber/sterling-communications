'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/Container'
import styles from './page.module.css'

interface Edition {
  id: string
  title: string
  createdAt: Date
  rawContent: string
  accessCode: string | null
}

interface Props {
  clientId: string
  clientName: string
  editions: Edition[]
}

export default function EditionsClient({ clientId, clientName, editions }: Props) {
  const router = useRouter()
  const [viewingEdition, setViewingEdition] = useState<Edition | null>(null)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)

  async function handleRestore(edition: Edition) {
    setRestoring(edition.id)
    try {
      await fetch(`/api/clients/${clientId}/newsletter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent: edition.rawContent }),
      })
      setRestoreConfirm(edition.id)
      setTimeout(() => {
        setRestoreConfirm(null)
        router.push(`/clients/${clientId}`)
      }, 1500)
    } finally {
      setRestoring(null)
    }
  }

  return (
    <main className={styles.main}>
      <Container>
        <nav className={styles.breadcrumb}>
          <a href="/clients" className={styles.breadcrumbLink}>Clients</a>
          <span className={styles.breadcrumbSep}>›</span>
          <a href={`/clients/${clientId}`} className={styles.breadcrumbLink}>{clientName}</a>
          <span className={styles.breadcrumbSep}>›</span>
          <span>Editions</span>
        </nav>

        <h1 className={styles.heading}>Edition History</h1>

        {editions.length === 0 ? (
          <div className={styles.empty}>
            <p>No editions saved yet.</p>
            <a href={`/clients/${clientId}/newsletter/editor`} className={styles.btnLink}>
              Go to editor to create one
            </a>
          </div>
        ) : (
          <div className={styles.list}>
            {editions.map((edition) => (
              <div key={edition.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowTitle}>{edition.title}</span>
                  <span className={styles.rowDate}>
                    {new Date(edition.createdAt).toLocaleString()}
                  </span>
                </div>
                {edition.accessCode && (
                  <div className={styles.deliveryInfo}>
                    <span className={styles.deliveryLabel}>Share:</span>
                    <code className={styles.deliveryLink}>
                      /delivery/{edition.id}
                    </code>
                    <span className={styles.deliveryLabel}>Code:</span>
                    <code className={styles.deliveryCode}>{edition.accessCode}</code>
                  </div>
                )}
                <div className={styles.rowActions}>
                  {restoreConfirm === edition.id ? (
                    <span className={styles.restoredMsg}>Draft restored ✓</span>
                  ) : (
                    <>
                      <button
                        className={styles.btnView}
                        onClick={() => setViewingEdition(edition)}
                      >
                        View
                      </button>
                      <a
                        className={styles.btnEdit}
                        href={`/clients/${clientId}/newsletter/editor?editionId=${edition.id}`}
                      >
                        Edit
                      </a>
                      <button
                        className={styles.btnRestore}
                        onClick={() => handleRestore(edition)}
                        disabled={restoring === edition.id}
                      >
                        {restoring === edition.id ? 'Restoring…' : 'Use as Draft'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Raw content modal */}
      {viewingEdition && (
        <div className={styles.overlay} onClick={() => setViewingEdition(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{viewingEdition.title}</h2>
              <button className={styles.modalClose} onClick={() => setViewingEdition(null)}>✕</button>
            </div>
            <pre className={styles.rawContent}>{viewingEdition.rawContent || '(empty)'}</pre>
          </div>
        </div>
      )}
    </main>
  )
}
