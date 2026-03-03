'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/Container'
import Input from '@/components/Input'
import Button from '@/components/Button'
import FileDropZone from '@/components/FileDropZone'
import styles from './page.module.css'

type Mode = 'manual' | 'uploaded'

export default function NewClientPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('manual')
  const [primaryColor, setPrimaryColor] = useState('#10263B')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Client name is required.')
      return
    }
    if (mode === 'manual' && !logoFile) {
      setError('A logo file is required for manual mode.')
      return
    }
    if (mode === 'uploaded' && !pdfFile) {
      setError('A guidelines PDF is required for upload mode.')
      return
    }

    const formData = new FormData()
    formData.append('name', name)
    formData.append('mode', mode)

    if (mode === 'manual') {
      formData.append('primary_color', primaryColor)
      formData.append('logo', logoFile!)
    } else {
      formData.append('guidelines_pdf', pdfFile!)
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push('/clients')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <a href="/clients" className={styles.back}>← Clients</a>
          <h1 className={styles.heading}>Create Client</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Client name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home Instead London"
          />

          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Brand kit type</legend>
            <div className={styles.radioGroup}>
              <label className={`${styles.radioLabel}${mode === 'manual' ? ` ${styles.radioLabelActive}` : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                  className={styles.radioInput}
                />
                <span className={styles.radioTitle}>Manual</span>
                <span className={styles.radioDesc}>Set a primary colour and upload a logo</span>
              </label>

              <label className={`${styles.radioLabel}${mode === 'uploaded' ? ` ${styles.radioLabelActive}` : ''}`}>
                <input
                  type="radio"
                  name="mode"
                  value="uploaded"
                  checked={mode === 'uploaded'}
                  onChange={() => setMode('uploaded')}
                  className={styles.radioInput}
                />
                <span className={styles.radioTitle}>Upload guidelines</span>
                <span className={styles.radioDesc}>Upload a brand guidelines PDF</span>
              </label>
            </div>
          </fieldset>

          {mode === 'manual' && (
            <div className={styles.manualFields}>
              <div className={styles.colorRow}>
                <label className={styles.colorLabel} htmlFor="primary_color">
                  Primary colour
                </label>
                <input
                  id="primary_color"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className={styles.colorInput}
                />
                <span className={styles.colorHex}>{primaryColor}</span>
              </div>

              <FileDropZone
                label="Logo (image)"
                accept="image/*"
                name="logo"
                onChange={setLogoFile}
              />
            </div>
          )}

          {mode === 'uploaded' && (
            <FileDropZone
              label="Brand guidelines (PDF)"
              accept="application/pdf"
              name="guidelines_pdf"
              onChange={setPdfFile}
            />
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Client'}
            </Button>
            <a href="/clients" className={styles.cancel}>Cancel</a>
          </div>
        </form>
      </Container>
    </main>
  )
}
