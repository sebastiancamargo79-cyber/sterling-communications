'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { newsletterEditions } from '@/db/schema'
import styles from './page.module.css'

type Edition = typeof newsletterEditions.$inferSelect

interface Props {
  clientId: string
  editions: Edition[]
}

export default function EditionsClientComponent({ clientId, editions }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (editionId: string) => {
    if (!confirm('Are you sure you want to delete this edition?')) return

    setDeleting(editionId)
    try {
      const res = await fetch(`/api/clients/${clientId}/newsletter/editions/${editionId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Edition deleted')
      router.refresh()
    } catch (e) {
      toast.error('Failed to delete edition')
      setDeleting(null)
    }
  }

  return (
    <div className={styles.editionsList}>
      <table className={styles.editionsTable}>
        <thead>
          <tr>
            <th className={styles.thTitle}>Title</th>
            <th className={styles.thDate}>Created</th>
            <th className={styles.thDate}>Updated</th>
            <th className={styles.thActions}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {editions.map((edition) => (
            <tr key={edition.id} className={styles.editionRow}>
              <td className={styles.tdTitle}>{edition.title}</td>
              <td className={styles.tdDate}>
                {new Date(edition.createdAt).toLocaleDateString()}
              </td>
              <td className={styles.tdDate}>
                {edition.updatedAt ? new Date(edition.updatedAt).toLocaleDateString() : '—'}
              </td>
              <td className={styles.tdActions}>
                <Link
                  href={`/clients/${clientId}/newsletter/editor?editionId=${edition.id}`}
                  className={styles.btnAction}
                >
                  Edit
                </Link>
                <Link
                  href={`/clients/${clientId}/newsletter/preview?editionId=${edition.id}`}
                  className={styles.btnAction}
                >
                  Preview
                </Link>
                <button
                  onClick={() => handleDelete(edition.id)}
                  disabled={deleting === edition.id}
                  className={`${styles.btnAction} ${styles.btnDanger}`}
                >
                  {deleting === edition.id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
