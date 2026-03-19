'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import styles from './PrintButton.module.css'

export function DownloadPdfButton({ clientId }: { clientId: string }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/newsletter/pdf`)
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `newsletter-${clientId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <button className={styles.btn} onClick={handleDownload} disabled={downloading}>
      {downloading ? 'Generating PDF...' : 'Download PDF'}
    </button>
  )
}
