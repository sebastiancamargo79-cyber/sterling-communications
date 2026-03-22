'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Users } from 'lucide-react'
import Container from '@/components/Container'
import DeleteModal from '@/components/DeleteModal'
import styles from './page.module.css'

interface Client {
  id: string
  name: string
  createdAt: Date | null
  editionCount: number
  lastEditionAt: string | null
  brandKit: { mode: string; primaryColor: string | null; logoUrl: string | null } | null
}

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
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
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>Clients</h1>
            <p className={styles.subtitle}>{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/clients/new" className={styles.btnNew}>
            <Plus size={15} />
            New Client
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Users size={24} /></div>
            <p className={styles.emptyTitle}>No clients yet</p>
            <p className={styles.emptyText}>Add your first franchise office to get started.</p>
            <Link href="/clients/new" className={styles.btnNewLg}>
              <Plus size={15} />
              Create first client
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {clients.map((client) => {
              const color = client.brandKit?.primaryColor ?? 'var(--primary)'
              return (
                <div key={client.id} className={styles.cardWrap}>
                  <Link
                    href={`/clients/${client.id}`}
                    className={styles.card}
                    style={{ '--client-color': color } as React.CSSProperties}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.avatar} style={{ background: color }}>
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.clientName}>{client.name}</div>
                        <div className={styles.clientMeta}>
                          {client.editionCount === 0
                            ? 'No editions yet'
                            : `${client.editionCount} edition${client.editionCount !== 1 ? 's' : ''}${client.lastEditionAt ? ` · ${timeAgo(client.lastEditionAt)}` : ''}`
                          }
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    className={styles.btnRemove}
                    onClick={(e) => { e.preventDefault(); setDeletingId(client.id) }}
                    title="Remove client"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
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
