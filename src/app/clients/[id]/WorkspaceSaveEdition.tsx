'use client'

import { useState } from 'react'
import styles from './page.module.css'

interface Props {
  clientId: string
  hasDraft: boolean
}

export default function WorkspaceSaveEdition({ clientId, hasDraft }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/newsletter/editions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })
      if (res.ok) {
        setSaved(true)
        setTitle('')
        setOpen(false)
        setTimeout(() => setSaved(false), 3000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return <span className={styles.savedBadge}>Edition saved ✓</span>
  }

  if (open) {
    return (
      <div className={styles.editionForm}>
        <input
          className={styles.editionInput}
          type="text"
          placeholder="e.g. March 2026 Edition"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className={styles.btnCancel} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      className={styles.btnOutline}
      onClick={() => setOpen(true)}
      disabled={!hasDraft}
      title={!hasDraft ? 'No draft to save' : ''}
    >
      Save Edition
    </button>
  )
}
