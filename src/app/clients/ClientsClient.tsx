'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Container from '@/components/Container'
import DeleteModal from '@/components/DeleteModal'
import styles from './page.module.css'

interface Client {
  id: string
  name: string
  createdAt: Date | null
  brandKit: { mode: string; primaryColor: string | null; logoUrl: string | null } | null
}

interface Props {
  clients: Client[]
}

export default function ClientsClient({ clients }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingInProgress, setDeletingInProgress] = useState(false)

  const deletingClient = clients.find((c) => c.id === deletingId) ?? null

  async function handleDelete() {
    if (!deletingId) return
    setDeletingInProgress(true)
    try {
      const res = await fetch(`/api/clients/${deletingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Client deleted')
      setDeletingId(null)
      router.refresh()
    } catch {
      toast.error('Failed to delete client')
    } finally {
      setDeletingInProgress(false)
    }
  }

  return (
    <main className={styles.main}>
      <Container>
        <a href="/" className={styles.back}>&larr; Home</a>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>Clients</h1>
            <p className={styles.subtitle}>{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/clients/new" className={styles.btnNew}>
            + New Client
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className={styles.empty}>
            <p>No clients yet.</p>
            <Link href="/clients/new" className={styles.btnNewLg}>Create your first client</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {clients.map((client) => (
              <div key={client.id} className={styles.cardWrap}>
                <Link href={`/clients/${client.id}`} className={styles.card}>
                  {client.brandKit?.primaryColor && (
                    <div
                      className={styles.colorSwatch}
                      style={{ background: client.brandKit.primaryColor }}
                    />
                  )}
                  <span className={styles.clientName}>{client.name}</span>
                  <span className={styles.clientMeta}>
                    {client.brandKit ? client.brandKit.mode : 'No brand kit'}
                  </span>
                </Link>
                <button
                  className={styles.btnRemove}
                  onClick={(e) => { e.preventDefault(); setDeletingId(client.id) }}
                  title="Remove client"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Container>

      <DeleteModal
        isOpen={deletingId !== null}
        clientName={deletingClient?.name ?? ''}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
        deleting={deletingInProgress}
      />
    </main>
  )
}
