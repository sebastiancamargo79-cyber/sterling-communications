'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/Container'
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
  draftContent,
}: {
  clientId: string
  clientName: string
  brandKit: BrandKit | null
  draftContent: string | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractionReview, setExtractionReview] = useState<ExtractionReview[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Token state
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

  // Load chat history on mount
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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleTokenChange = (key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }))
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/upload`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setPdfUrl(data.url)
      }
    } catch (err) {
      alert('Failed to upload PDF')
    }
  }

  const handleExtract = async () => {
    if (!pdfUrl) return

    setExtracting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(`Extraction failed: ${error.error}`)
        return
      }

      const data: ExtractionResponse = await res.json()

      // Build review list
      const reviews: ExtractionReview[] = [
        {
          token: 'primaryColor',
          oldValue: tokens.primaryColor,
          newValue: data.primaryColor || '',
          confidence: data.confidence.primaryColor || 0,
          accepted: (data.confidence.primaryColor || 0) > 0.7,
        },
        {
          token: 'secondaryColor',
          oldValue: tokens.secondaryColor,
          newValue: data.secondaryColor || '',
          confidence: data.confidence.secondaryColor || 0,
          accepted: (data.confidence.secondaryColor || 0) > 0.7,
        },
        {
          token: 'bgColor',
          oldValue: tokens.bgColor,
          newValue: data.bgColor || '',
          confidence: data.confidence.bgColor || 0,
          accepted: (data.confidence.bgColor || 0) > 0.7,
        },
        {
          token: 'accentColor',
          oldValue: tokens.accentColor,
          newValue: data.accentColor || '',
          confidence: data.confidence.accentColor || 0,
          accepted: (data.confidence.accentColor || 0) > 0.7,
        },
        {
          token: 'textColor',
          oldValue: tokens.textColor,
          newValue: data.textColor || '',
          confidence: data.confidence.textColor || 0,
          accepted: (data.confidence.textColor || 0) > 0.7,
        },
        {
          token: 'fontHeadingName',
          oldValue: tokens.fontHeadingName || null,
          newValue: data.fontHeadingName || '',
          confidence: data.confidence.fontHeadingName || 0,
          accepted: (data.confidence.fontHeadingName || 0) > 0.7,
        },
        {
          token: 'fontBodyName',
          oldValue: tokens.fontBodyName || null,
          newValue: data.fontBodyName || '',
          confidence: data.confidence.fontBodyName || 0,
          accepted: (data.confidence.fontBodyName || 0) > 0.7,
        },
        {
          token: 'headingFontSize',
          oldValue: tokens.headingFontSize,
          newValue: data.headingFontSize || '',
          confidence: data.confidence.headingFontSize || 0,
          accepted: (data.confidence.headingFontSize || 0) > 0.7,
        },
        {
          token: 'bodyFontSize',
          oldValue: tokens.bodyFontSize,
          newValue: data.bodyFontSize || '',
          confidence: data.confidence.bodyFontSize || 0,
          accepted: (data.confidence.bodyFontSize || 0) > 0.7,
        },
        {
          token: 'cardBorderRadius',
          oldValue: tokens.cardBorderRadius,
          newValue: data.cardBorderRadius || '',
          confidence: data.confidence.cardBorderRadius || 0,
          accepted: (data.confidence.cardBorderRadius || 0) > 0.7,
        },
        {
          token: 'layoutDensity',
          oldValue: tokens.layoutDensity,
          newValue: data.layoutDensity || '',
          confidence: data.confidence.layoutDensity || 0,
          accepted: (data.confidence.layoutDensity || 0) > 0.7,
        },
      ].filter((r) => r.newValue) // Only show tokens with extracted values

      setExtractionReview(reviews)
    } catch (err) {
      alert('Extraction error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setExtracting(false)
    }
  }

  const applySelectedExtraction = () => {
    extractionReview.forEach((review) => {
      if (review.accepted && review.newValue) {
        handleTokenChange(review.token, review.newValue)
      }
    })
    setExtractionReview([])
  }

  const handleChatSend = async () => {
    if (!chatInput.trim()) return

    setChatLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          currentTokens: tokens,
        }),
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
      alert('Chat error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setChatLoading(false)
    }
  }

  const applyChatChanges = (changes: TokenChange[]) => {
    changes.forEach((change) => {
      handleTokenChange(change.token, change.after)
    })
  }

  const handleSaveBrandKit = async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'custom',
          ...tokens,
        }),
      })

      if (res.ok) {
        setSaveMessage('Brand kit saved successfully!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        const error = await res.json()
        setSaveMessage(`Error: ${error.error}`)
      }
    } catch (err) {
      setSaveMessage('Save error: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <h1 className={styles.title}>{clientName} — Brand Studio</h1>
          <button
            onClick={handleSaveBrandKit}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Saving...' : 'Save Brand Kit'}
          </button>
        </div>

        {saveMessage && <div className={styles.message}>{saveMessage}</div>}

        <div className={styles.container}>
          {/* Token Editor */}
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Token Editor</h2>

            <div className={styles.tokenGroup}>
              <h3 className={styles.tokenGroupTitle}>Colors</h3>
              <div className={styles.tokenRow}>
                <label>Primary</label>
                <input
                  type="color"
                  value={tokens.primaryColor}
                  onChange={(e) => handleTokenChange('primaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={tokens.primaryColor}
                  onChange={(e) => handleTokenChange('primaryColor', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Secondary</label>
                <input
                  type="color"
                  value={tokens.secondaryColor}
                  onChange={(e) => handleTokenChange('secondaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={tokens.secondaryColor}
                  onChange={(e) => handleTokenChange('secondaryColor', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Background</label>
                <input
                  type="color"
                  value={tokens.bgColor}
                  onChange={(e) => handleTokenChange('bgColor', e.target.value)}
                />
                <input
                  type="text"
                  value={tokens.bgColor}
                  onChange={(e) => handleTokenChange('bgColor', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Accent</label>
                <input
                  type="color"
                  value={tokens.accentColor}
                  onChange={(e) => handleTokenChange('accentColor', e.target.value)}
                />
                <input
                  type="text"
                  value={tokens.accentColor}
                  onChange={(e) => handleTokenChange('accentColor', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Text</label>
                <input
                  type="color"
                  value={tokens.textColor}
                  onChange={(e) => handleTokenChange('textColor', e.target.value)}
                />
                <input
                  type="text"
                  value={tokens.textColor}
                  onChange={(e) => handleTokenChange('textColor', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
            </div>

            <div className={styles.tokenGroup}>
              <h3 className={styles.tokenGroupTitle}>Fonts</h3>
              <div className={styles.tokenRow}>
                <label>Heading Font</label>
                <input
                  type="text"
                  placeholder="e.g., Instrument Serif"
                  value={tokens.fontHeadingName}
                  onChange={(e) => handleTokenChange('fontHeadingName', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Body Font</label>
                <input
                  type="text"
                  placeholder="e.g., Plus Jakarta Sans"
                  value={tokens.fontBodyName}
                  onChange={(e) => handleTokenChange('fontBodyName', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
            </div>

            <div className={styles.tokenGroup}>
              <h3 className={styles.tokenGroupTitle}>Typography</h3>
              <div className={styles.tokenRow}>
                <label>Heading Size</label>
                <input
                  type="text"
                  placeholder="e.g., 22px"
                  value={tokens.headingFontSize}
                  onChange={(e) => handleTokenChange('headingFontSize', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Body Size</label>
                <input
                  type="text"
                  placeholder="e.g., 13px"
                  value={tokens.bodyFontSize}
                  onChange={(e) => handleTokenChange('bodyFontSize', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
            </div>

            <div className={styles.tokenGroup}>
              <h3 className={styles.tokenGroupTitle}>Layout</h3>
              <div className={styles.tokenRow}>
                <label>Border Radius</label>
                <input
                  type="text"
                  placeholder="e.g., 6px"
                  value={tokens.cardBorderRadius}
                  onChange={(e) => handleTokenChange('cardBorderRadius', e.target.value)}
                  className={styles.tokenInput}
                />
              </div>
              <div className={styles.tokenRow}>
                <label>Density</label>
                <select
                  value={tokens.layoutDensity}
                  onChange={(e) => handleTokenChange('layoutDensity', e.target.value)}
                  className={styles.tokenInput}
                >
                  <option value="compact">Compact</option>
                  <option value="normal">Normal</option>
                  <option value="airy">Airy</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Panel: Preview + Extraction + Chat */}
          <div className={styles.rightPanel}>
            {/* Live Preview */}
            <div className={styles.previewSection}>
              <h2 className={styles.panelTitle}>Newsletter Preview</h2>
              <div
                className={styles.previewContainer}
                style={{
                  '--brand-primary': tokens.primaryColor,
                  '--brand-secondary': tokens.secondaryColor,
                  '--brand-bg': tokens.bgColor,
                  '--brand-accent': tokens.accentColor,
                  '--brand-text': tokens.textColor,
                  '--font-heading': tokens.fontHeadingName || 'Georgia, serif',
                  '--font-body': tokens.fontBodyName || 'system-ui, sans-serif',
                  '--brand-heading-size': tokens.headingFontSize,
                  '--brand-body-size': tokens.bodyFontSize,
                  '--brand-radius': tokens.cardBorderRadius,
                } as React.CSSProperties}
              >
                <div className={styles.previewPlaceholder}>
                  Newsletter preview
                  {tokens.fontHeadingName && ` • Heading: ${tokens.fontHeadingName}`}
                  {tokens.fontBodyName && ` • Body: ${tokens.fontBodyName}`}
                </div>
              </div>
            </div>

            {/* PDF Extraction */}
            <div className={styles.extractionSection}>
              <h3 className={styles.panelTitle}>PDF Extraction</h3>
              {extractionReview.length === 0 ? (
                <div className={styles.uploadArea}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    id="pdfInput"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="pdfInput" className={styles.uploadLabel}>
                    Click to upload or drag PDF here
                  </label>
                  {pdfUrl && (
                    <button
                      onClick={handleExtract}
                      disabled={extracting}
                      className={styles.extractButton}
                    >
                      {extracting ? 'Extracting...' : 'Extract Brand Tokens ▶'}
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.reviewSection}>
                  <h4 className={styles.reviewTitle}>Token Review</h4>
                  {extractionReview.map((review) => (
                    <div key={review.token} className={styles.reviewItem}>
                      <div className={styles.reviewHeader}>
                        <span className={styles.reviewToken}>{review.token}</span>
                        <span className={styles.reviewConfidence}>
                          {Math.round(review.confidence * 100)}%
                        </span>
                      </div>
                      <div className={styles.reviewValues}>
                        {review.oldValue} → {review.newValue}
                      </div>
                      <div className={styles.reviewActions}>
                        <button
                          onClick={() =>
                            setExtractionReview((prev) =>
                              prev.map((r) =>
                                r.token === review.token ? { ...r, accepted: !r.accepted } : r
                              )
                            )
                          }
                          className={review.accepted ? styles.buttonAccept : styles.buttonSkip}
                        >
                          {review.accepted ? '✓ Accept' : '✗ Skip'}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className={styles.reviewActions}>
                    <button onClick={applySelectedExtraction} className={styles.applyButton}>
                      Apply Selected
                    </button>
                    <button
                      onClick={() => setExtractionReview([])}
                      className={styles.discardButton}
                    >
                      Discard All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className={styles.chatSection}>
          <h2 className={styles.panelTitle}>Design Assistant</h2>
          <div className={styles.chatMessages}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                <p>{msg.content}</p>
                {msg.changes && msg.changes.length > 0 && (
                  <div className={styles.chatChanges}>
                    {msg.changes.map((change) => (
                      <div key={change.token} className={styles.changeCard}>
                        <div className={styles.changeHeader}>
                          <span className={styles.changeToken}>{change.token}</span>
                          <span className={styles.changeReason}>{change.reason}</span>
                        </div>
                        <div className={styles.changeValues}>
                          {change.before} → {change.after}
                        </div>
                        <button
                          onClick={() => applyChatChanges([change])}
                          className={styles.applyChangeButton}
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => applyChatChanges(msg.changes!)}
                      className={styles.applyAllButton}
                    >
                      Apply All Changes
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className={styles.chatInput}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleChatSend()
                }
              }}
              placeholder="Ask the design assistant..."
              disabled={chatLoading}
            />
            <button onClick={handleChatSend} disabled={chatLoading}>
              {chatLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </Container>
    </main>
  )
}

export default BrandStudioClient
