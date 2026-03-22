'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import styles from './page.module.css'

interface BrandKit {
  id: string
  clientId: string
  mode: string
  primaryColor: string | null
  secondaryColor: string | null
  bgColor: string | null
  accentColor: string | null
  textColor: string | null
  logoUrl: string | null
  guidelinesPdfUrl: string | null
  fontHeadingUrl: string | null
  fontBodyUrl: string | null
  fontHeadingName: string | null
  fontBodyName: string | null
  headingFontSize: string | null
  bodyFontSize: string | null
  cardBorderRadius: string | null
  layoutDensity: string | null
  createdAt: Date | null
}

interface TokenChange {
  token: string
  before: string | null
  after: string
  reason: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  changes?: TokenChange[]
}

interface ExtractionReview {
  token: string
  oldValue: string | null
  newValue: string
  confidence: number
  accepted: boolean
}

interface ExtractionResponse {
  primaryColor: string | null
  secondaryColor: string | null
  bgColor: string | null
  accentColor: string | null
  textColor: string | null
  fontHeadingName: string | null
  fontBodyName: string | null
  headingFontSize: string | null
  bodyFontSize: string | null
  cardBorderRadius: string | null
  layoutDensity: string | null
  confidence: Record<string, number>
}

export default function BrandStudioClient({
  clientId,
  clientName,
  brandKit,
}: {
  clientId: string
  clientName: string
  brandKit: BrandKit | null
  draftContent: string | null
}) {
  const [saving, setSaving] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [uploadStep, setUploadStep] = useState<string | null>(null)
  const [extractionReview, setExtractionReview] = useState<ExtractionReview[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [logoUrl, setLogoUrl] = useState(brandKit?.logoUrl || '')
  const [fontHeadingUrl, setFontHeadingUrl] = useState(brandKit?.fontHeadingUrl || '')
  const [fontBodyUrl, setFontBodyUrl] = useState(brandKit?.fontBodyUrl || '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFont, setUploadingFont] = useState<'heading' | 'body' | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const fontHeadingInputRef = useRef<HTMLInputElement>(null)
  const fontBodyInputRef = useRef<HTMLInputElement>(null)

  const [tokens, setTokens] = useState({
    primaryColor: brandKit?.primaryColor ?? '#006938',
    secondaryColor: brandKit?.secondaryColor ?? '#1a5c38',
    bgColor: brandKit?.bgColor ?? '#f5f5f0',
    accentColor: brandKit?.accentColor ?? '#1a5c38',
    textColor: brandKit?.textColor ?? '#10263B',
    fontHeadingName: brandKit?.fontHeadingName ?? '',
    fontBodyName: brandKit?.fontBodyName ?? '',
    headingFontSize: brandKit?.headingFontSize ?? '22px',
    bodyFontSize: brandKit?.bodyFontSize ?? '13px',
    cardBorderRadius: brandKit?.cardBorderRadius ?? '6px',
    layoutDensity: brandKit?.layoutDensity ?? 'normal',
  })

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/brand-kit/chat`)
        if (res.ok) {
          const data = await res.json()
          setChatMessages(data.messages || [])
        }
      } catch (err) {
        console.error('Failed to load chat history:', err)
      }
    })()
  }, [clientId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleTokenChange = (key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }))
  }

  const handleLogoFile = useCallback(async (file: File) => {
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/clients/${clientId}/brand-kit/logo`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Logo upload failed')
      const { logoUrl: newUrl } = await res.json()
      setLogoUrl(newUrl)
      toast.success('Logo saved')
    } catch {
      toast.error('Logo upload failed')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }, [clientId])

  // Global paste → logo
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      for (const item of Array.from(e.clipboardData?.items ?? [])) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { handleLogoFile(file); break }
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [handleLogoFile])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLogoFile(file)
  }

  const handleFontUpload = async (type: 'heading' | 'body', file: File) => {
    setUploadingFont(type)
    try {
      const formData = new FormData()
      formData.append('fontType', type)
      formData.append('file', file)
      const res = await fetch(`/api/clients/${clientId}/brand-kit/fonts`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Font upload failed')
      const updated = await res.json()
      if (type === 'heading') {
        setFontHeadingUrl(updated.fontHeadingUrl || '')
      } else {
        setFontBodyUrl(updated.fontBodyUrl || '')
      }
      toast.success(`${type === 'heading' ? 'Heading' : 'Body'} font saved`)
    } catch {
      toast.error('Font upload failed')
    } finally {
      setUploadingFont(null)
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExtracting(true)
    setExtractionError(null)
    setUploadStep('Uploading PDF…')
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/upload`, { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}))
        setExtractionError(`Upload failed (${uploadRes.status}): ${err.error ?? uploadRes.statusText}`)
        setUploadStep(null)
        setExtracting(false)
        return
      }

      const uploadJson = await uploadRes.json().catch(() => null)
      if (!uploadJson?.url) {
        setExtractionError('Upload failed: server returned no URL')
        setUploadStep(null)
        setExtracting(false)
        return
      }

      const { url } = uploadJson
      setPdfUrl(url)
      setUploadStep('Extracting brand tokens from PDF…')

      const res = await fetch(`/api/clients/${clientId}/brand-kit/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: url }),
      })
      setUploadStep(null)

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setExtractionError(`Extraction failed (${res.status}): ${error.error ?? res.statusText}`)
        setExtracting(false)
        return
      }

      const data: ExtractionResponse = await res.json()

      const reviews: ExtractionReview[] = [
        { token: 'primaryColor', oldValue: tokens.primaryColor, newValue: data.primaryColor || '', confidence: data.confidence.primaryColor || 0, accepted: (data.confidence.primaryColor || 0) > 0.7 },
        { token: 'secondaryColor', oldValue: tokens.secondaryColor, newValue: data.secondaryColor || '', confidence: data.confidence.secondaryColor || 0, accepted: (data.confidence.secondaryColor || 0) > 0.7 },
        { token: 'bgColor', oldValue: tokens.bgColor, newValue: data.bgColor || '', confidence: data.confidence.bgColor || 0, accepted: (data.confidence.bgColor || 0) > 0.7 },
        { token: 'accentColor', oldValue: tokens.accentColor, newValue: data.accentColor || '', confidence: data.confidence.accentColor || 0, accepted: (data.confidence.accentColor || 0) > 0.7 },
        { token: 'textColor', oldValue: tokens.textColor, newValue: data.textColor || '', confidence: data.confidence.textColor || 0, accepted: (data.confidence.textColor || 0) > 0.7 },
        { token: 'fontHeadingName', oldValue: tokens.fontHeadingName || null, newValue: data.fontHeadingName || '', confidence: data.confidence.fontHeadingName || 0, accepted: (data.confidence.fontHeadingName || 0) > 0.7 },
        { token: 'fontBodyName', oldValue: tokens.fontBodyName || null, newValue: data.fontBodyName || '', confidence: data.confidence.fontBodyName || 0, accepted: (data.confidence.fontBodyName || 0) > 0.7 },
        { token: 'headingFontSize', oldValue: tokens.headingFontSize, newValue: data.headingFontSize || '', confidence: data.confidence.headingFontSize || 0, accepted: (data.confidence.headingFontSize || 0) > 0.7 },
        { token: 'bodyFontSize', oldValue: tokens.bodyFontSize, newValue: data.bodyFontSize || '', confidence: data.confidence.bodyFontSize || 0, accepted: (data.confidence.bodyFontSize || 0) > 0.7 },
        { token: 'cardBorderRadius', oldValue: tokens.cardBorderRadius, newValue: data.cardBorderRadius || '', confidence: data.confidence.cardBorderRadius || 0, accepted: (data.confidence.cardBorderRadius || 0) > 0.7 },
        { token: 'layoutDensity', oldValue: tokens.layoutDensity, newValue: data.layoutDensity || '', confidence: data.confidence.layoutDensity || 0, accepted: (data.confidence.layoutDensity || 0) > 0.7 },
      ].filter((r) => r.newValue)

      if (reviews.length === 0) {
        setExtractionError('Extraction returned no usable values. The PDF may be image-based or lacking explicit design specs.')
        setExtracting(false)
        return
      }
      setExtractionReview(reviews)
    } catch (err) {
      setExtractionError('Error: ' + (err instanceof Error ? err.message : String(err)))
      setUploadStep(null)
    } finally {
      setExtracting(false)
    }
  }

  const applySelectedExtraction = () => {
    const accepted = extractionReview.filter((r) => r.accepted && r.newValue)
    if (accepted.length === 0) { setExtractionReview([]); return }
    setTokens((prev) => {
      const next = { ...prev }
      for (const r of accepted) (next as Record<string, string>)[r.token] = r.newValue
      return next
    })
    toast.success(`Applied ${accepted.length} token${accepted.length === 1 ? '' : 's'} — click Save to persist`)
    setExtractionReview([])
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return
    setChatLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput, currentTokens: tokens }),
      })
      if (res.ok) {
        const data = await res.json()
        setChatMessages((prev) => [
          ...prev,
          { role: 'user', content: chatInput },
          { role: 'assistant', content: data.message, changes: data.changes },
        ])
        setChatInput('')
      }
    } catch (err) {
      toast.error('Chat error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setChatLoading(false)
    }
  }

  const applyChatChanges = (changes: TokenChange[]) => {
    changes.forEach((change) => handleTokenChange(change.token, change.after))
  }

  const handleSaveBrandKit = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'custom', ...tokens }),
      })
      if (res.ok) {
        toast.success('Brand kit saved')
      } else {
        const error = await res.json()
        toast.error(`Save failed: ${error.error}`)
      }
    } catch (err) {
      toast.error('Save error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const colorRows = [
    { key: 'primaryColor', label: 'Primary' },
    { key: 'secondaryColor', label: 'Secondary' },
    { key: 'bgColor', label: 'Background' },
    { key: 'accentColor', label: 'Accent' },
    { key: 'textColor', label: 'Text' },
  ] as const

  return (
    <div className={styles.wrapper}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <a href={`/clients/${clientId}`} className={styles.backLink}>← {clientName}</a>
        <h1 className={styles.topBarTitle}>Brand Studio</h1>
        <button onClick={handleSaveBrandKit} disabled={saving} className={styles.saveBtn}>
          {saving ? 'Saving…' : 'Save Brand Kit'}
        </button>
      </div>

      <div className={styles.body}>
        {/* ── Left sidebar ── */}
        <div className={styles.sidebar}>

          {/* Colors */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Colors</h2>
            {colorRows.map(({ key, label }) => (
              <div key={key} className={styles.colorRow}>
                <input
                  type="color"
                  value={tokens[key]}
                  onChange={(e) => handleTokenChange(key, e.target.value)}
                  className={styles.colorSwatch}
                />
                <span className={styles.colorLabel}>{label}</span>
                <input
                  type="text"
                  value={tokens[key]}
                  onChange={(e) => handleTokenChange(key, e.target.value)}
                  className={styles.colorHex}
                  spellCheck={false}
                />
              </div>
            ))}
          </section>

          {/* Logo */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Logo</h2>
            <div className={styles.logoDrop} onClick={() => logoInputRef.current?.click()}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className={styles.logoPreview} />
              ) : (
                <span className={styles.logoHint}>
                  Click to upload · paste image (⌘V)
                </span>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
            </div>
            {uploadingLogo && <p className={styles.hint}>Uploading…</p>}
            {logoUrl && (
              <button
                onClick={() => logoInputRef.current?.click()}
                className={styles.replaceBtn}
                disabled={uploadingLogo}
              >
                Replace logo
              </button>
            )}
          </section>

          {/* Fonts */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Fonts</h2>
            <div className={styles.fontGroup}>
              <span className={styles.fontGroupLabel}>Heading</span>
              <input
                type="text"
                placeholder="e.g. Instrument Serif"
                value={tokens.fontHeadingName}
                onChange={(e) => handleTokenChange('fontHeadingName', e.target.value)}
                className={styles.fontInput}
              />
              <div className={styles.fontFileRow}>
                <span className={styles.fontFileName}>
                  {fontHeadingUrl ? fontHeadingUrl.split('/').pop() : 'No file uploaded'}
                </span>
                <button
                  onClick={() => fontHeadingInputRef.current?.click()}
                  disabled={uploadingFont === 'heading'}
                  className={styles.uploadBtn}
                >
                  {uploadingFont === 'heading' ? '…' : 'Upload file'}
                </button>
                <input
                  ref={fontHeadingInputRef}
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontUpload('heading', f) }}
                />
              </div>
            </div>
            <div className={styles.fontGroup}>
              <span className={styles.fontGroupLabel}>Body</span>
              <input
                type="text"
                placeholder="e.g. Plus Jakarta Sans"
                value={tokens.fontBodyName}
                onChange={(e) => handleTokenChange('fontBodyName', e.target.value)}
                className={styles.fontInput}
              />
              <div className={styles.fontFileRow}>
                <span className={styles.fontFileName}>
                  {fontBodyUrl ? fontBodyUrl.split('/').pop() : 'No file uploaded'}
                </span>
                <button
                  onClick={() => fontBodyInputRef.current?.click()}
                  disabled={uploadingFont === 'body'}
                  className={styles.uploadBtn}
                >
                  {uploadingFont === 'body' ? '…' : 'Upload file'}
                </button>
                <input
                  ref={fontBodyInputRef}
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFontUpload('body', f) }}
                />
              </div>
            </div>
          </section>

          {/* Typography & Layout */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Typography & Layout</h2>
            {[
              { key: 'headingFontSize', label: 'Heading size', placeholder: '22px' },
              { key: 'bodyFontSize', label: 'Body size', placeholder: '13px' },
              { key: 'cardBorderRadius', label: 'Border radius', placeholder: '6px' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className={styles.fieldRow}>
                <label className={styles.fieldLabel}>{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={(tokens as Record<string, string>)[key]}
                  onChange={(e) => handleTokenChange(key, e.target.value)}
                  className={styles.fieldInput}
                />
              </div>
            ))}
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>Density</label>
              <select
                value={tokens.layoutDensity}
                onChange={(e) => handleTokenChange('layoutDensity', e.target.value)}
                className={styles.fieldInput}
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="airy">Airy</option>
              </select>
            </div>
          </section>

        </div>

        {/* ── Right main panel ── */}
        <div className={styles.main}>

          {/* Color palette preview */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Palette Preview</h2>
            <div className={styles.palette}>
              {colorRows.map(({ key, label }) => (
                <div key={key} className={styles.chip}>
                  <div className={styles.chipColor} style={{ background: tokens[key] }} />
                  <span className={styles.chipLabel}>{label}</span>
                  <span className={styles.chipHex}>{tokens[key]}</span>
                </div>
              ))}
            </div>
          </section>

          {/* PDF Extraction */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Extract from Brand Guidelines PDF</h2>
            {uploadStep && <div className={styles.infoBox}>{uploadStep}</div>}
            {extractionError && <div className={styles.errorBox}>{extractionError}</div>}
            {extractionReview.length === 0 ? (
              <div className={styles.uploadArea}>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  style={{ display: 'none' }}
                  disabled={extracting}
                />
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={extracting}
                  className={styles.extractBtn}
                >
                  {extracting ? 'Processing…' : pdfUrl ? 'Re-upload PDF' : 'Upload Brand Guidelines PDF'}
                </button>
                <p className={styles.uploadHint}>
                  Upload a PDF to automatically extract colours and fonts
                </p>
              </div>
            ) : (
              <div className={styles.reviewList}>
                {extractionReview.map((review) => (
                  <div key={review.token} className={styles.reviewItem}>
                    <div className={styles.reviewMeta}>
                      <span className={styles.reviewToken}>{review.token}</span>
                      <span className={styles.reviewConf}>{Math.round(review.confidence * 100)}%</span>
                    </div>
                    <div className={styles.reviewValues}>{review.oldValue} → {review.newValue}</div>
                    <button
                      onClick={() => setExtractionReview((prev) =>
                        prev.map((r) => r.token === review.token ? { ...r, accepted: !r.accepted } : r)
                      )}
                      className={review.accepted ? styles.btnAccept : styles.btnSkip}
                    >
                      {review.accepted ? '✓ Accept' : 'Skip'}
                    </button>
                  </div>
                ))}
                <div className={styles.reviewFooter}>
                  <button onClick={applySelectedExtraction} className={styles.btnApply}>Apply Selected</button>
                  <button onClick={() => setExtractionReview([])} className={styles.btnDiscard}>Discard All</button>
                </div>
              </div>
            )}
          </section>

          {/* Design Assistant */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Design Assistant</h2>
            <div className={styles.chatMessages}>
              {chatMessages.length === 0 && (
                <p className={styles.chatEmpty}>
                  Ask the assistant to adjust colours, suggest fonts, or describe the look you're going for.
                </p>
              )}
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.chatMsg} ${msg.role === 'user' ? styles.chatUser : styles.chatAssistant}`}
                >
                  <p className={styles.chatText}>{msg.content}</p>
                  {msg.changes && msg.changes.length > 0 && (
                    <div className={styles.changeList}>
                      {msg.changes.map((change) => (
                        <div key={change.token} className={styles.changeItem}>
                          <div className={styles.changeTop}>
                            <span className={styles.changeToken}>{change.token}</span>
                            <span className={styles.changeReason}>{change.reason}</span>
                          </div>
                          <div className={styles.changeVals}>{change.before} → {change.after}</div>
                          <button
                            onClick={() => applyChatChanges([change])}
                            className={styles.applyChangeBtn}
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                      <button onClick={() => applyChatChanges(msg.changes!)} className={styles.applyAllBtn}>
                        Apply All
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className={styles.chatInputRow}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                placeholder="Ask the design assistant…"
                disabled={chatLoading}
                className={styles.chatInput}
              />
              <button onClick={handleChatSend} disabled={chatLoading} className={styles.chatSendBtn}>
                {chatLoading ? '…' : 'Send'}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
