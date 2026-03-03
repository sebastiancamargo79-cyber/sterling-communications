'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import styles from './DeleteModal.module.css'

interface Props {
  isOpen: boolean
  clientName: string
  onConfirm: () => void
  onClose: () => void
  deleting: boolean
}

export default function DeleteModal({ isOpen, clientName, onConfirm, onClose, deleting }: Props) {
  const [input, setInput] = useState('')

  useEffect(() => {
    if (isOpen) setInput('')
  }, [isOpen])

  useEffect(() => {
    function handleKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const confirmed = input === 'remove client'

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className={styles.title}>Delete {clientName}?</h2>
        <p className={styles.body}>
          This will permanently delete the client and all associated newsletters and editions.
          This action cannot be undone.
        </p>
        <p className={styles.instruction}>
          Type <strong>remove client</strong> to confirm:
        </p>
        <input
          className={styles.input}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="remove client"
          autoFocus
        />
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className={styles.btnDelete}
            onClick={onConfirm}
            disabled={!confirmed || deleting}
          >
            {deleting ? 'Deleting…' : 'Delete Client'}
          </button>
        </div>
      </div>
    </div>
  )
}
