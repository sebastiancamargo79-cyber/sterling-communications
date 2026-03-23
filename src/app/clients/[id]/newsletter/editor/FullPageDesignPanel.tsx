'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './FullPageDesignPanel.module.css'

interface Change {
  type: 'token' | 'variant'
  token?: string
  variant?: string
  value?: string
  scope?: 'edition' | 'global'
  reason: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  changes?: Change[]
  appliedIndexes?: Set<number>
}

interface Props {
  clientId: string
  moduleNames: string[]
  editionOverrides: Record<string, string>
  onClose: () => void
  onApplyToken: (token: string, value: string, scope: 'edition' | 'global') => void
}

function isColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim())
}

const PRESETS = [
  { label: 'Corporate Professional', prompt: 'Give this newsletter a polished corporate look — deep navy or charcoal tones, clean serif headings, generous whitespace, refined typography. Make visible section dividers.' },
  { label: 'Modern & Minimal', prompt: 'Redesign with a modern minimal aesthetic — monochrome palette, strong contrast, clean geometric sans-serif fonts, sharp 0px radius edges, no visible dividers.' },
  { label: 'Warm & Welcoming', prompt: 'Make this newsletter feel warm, friendly and inviting — soft cream or warm white background, earthy terracotta or amber accent tones, generous rounded corners, approachable humanist fonts.' },
  { label: 'Bold & Vibrant', prompt: 'Give this newsletter bold high-impact design — strong saturated primary color, high-contrast accent, large heading sizes, confident condensed font choices, visible dividers.' },
  { label: 'Healthcare & Wellness', prompt: 'Design a calm professional healthcare newsletter — clean teal or sky-blue primary, soft white background, light green accent, gentle rounded corners, trustworthy readable fonts like Source Sans or Nunito, subtle light dividers.' },
  { label: 'Finance & Legal', prompt: 'Design a serious authoritative finance newsletter — deep charcoal or midnight blue primary, crisp white background, gold or amber accent, 0px radius sharp edges, formal serif heading font like Merriweather or Playfair Display, strong visible dividers.' },
  { label: 'Education & Community', prompt: 'Design an engaging community/education newsletter — friendly mid-blue or forest green primary, warm off-white background, sunny yellow or coral accent, medium rounded corners, friendly sans-serif fonts, subtle dividers between sections.' },
  { label: 'Classic Editorial', prompt: 'Design a timeless editorial newspaper-style newsletter — black or very dark charcoal primary, pure white background, red or burgundy accent, zero border radius, classic serif heading font like Playfair Display or Georgia, strong bold divider lines.' },
]

export default function FullPageDesignPanel({
  clientId,
  moduleNames,
  editionOverrides,
  onClose,
  onApplyToken,
}: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [brandTokens, setBrandTokens] = useState<Record<string, string | null>>({})
  const [loadingTokens, setLoadingTokens] = useState(true)
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/brand-kit`)
      .then((r) => r.ok ? r.json() : null)
      .then((kit) => {
        if (kit) {
          setBrandTokens({
            primaryColor: kit.primaryColor ?? null,
            secondaryColor: kit.secondaryColor ?? null,
            bgColor: kit.bgColor ?? null,
            accentColor: kit.accentColor ?? null,
            textColor: kit.textColor ?? null,
            headingFontSize: kit.headingFontSize ?? null,
            bodyFontSize: kit.bodyFontSize ?? null,
            cardBorderRadius: kit.cardBorderRadius ?? null,
            fontHeadingName: kit.fontHeadingName ?? null,
            fontBodyName: kit.fontBodyName ?? null,
          })
        }
        setLoadingTokens(false)
      })
      .catch(() => setLoadingTokens(false))
  }, [clientId])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [history, sending])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    setHistory((prev) => [...prev, userMsg])
    setMessage('')
    setSending(true)

    try {
      const res = await fetch(`/api/clients/${clientId}/newsletter/design-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleType: 'FullNewsletter',
          moduleContent: moduleNames.join(', '),
          currentTokens: brandTokens,
          editionOverrides,
          message: trimmed,
          history: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error('Request failed')
      const data = await res.json() as { message: string; changes: Change[] }
      const changes = data.changes ?? []

      // Auto-apply all token changes immediately for a full-page overhaul
      for (const change of changes) {
        if (change.type === 'token' && change.token && change.value) {
          onApplyToken(change.token, change.value, change.scope ?? 'edition')
        }
      }

      const autoApplied = new Set<number>()
      changes.forEach((c, i) => { if (c.type === 'token') autoApplied.add(i) })

      setHistory((prev) => [...prev, {
        role: 'assistant',
        content: data.message,
        changes,
        appliedIndexes: autoApplied,
      }])
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(message)
    }
  }

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span>✨</span>
          Newsletter Design Studio
        </div>
        <button className={styles.btnClose} onClick={onClose} title="Close">✕</button>
      </div>

      {/* Scrollable body */}
      <div className={styles.scrollArea} ref={threadRef}>
        {/* Quick presets */}
        {history.length === 0 && (
          <div>
            <div className={styles.sectionLabel}>Quick Styles</div>
            <div className={styles.presetGrid}>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  className={styles.presetBtn}
                  onClick={() => sendMessage(p.prompt)}
                  disabled={sending || loadingTokens}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {history.length === 0 && (
          <div className={styles.divider}>Or describe your vision</div>
        )}

        {/* Chat thread */}
        {loadingTokens && <div className={styles.loadingText}>Loading brand tokens…</div>}

        <div className={styles.chatThread}>
          {history.length === 0 && !sending && (
            <div className={styles.bubbleAssistant} style={{ maxWidth: '100%' }}>
              I can redesign your entire newsletter in one go. Pick a quick style above, or describe exactly how you want it to look.
            </div>
          )}
          {history.map((msg, msgIdx) => (
            <div key={msgIdx}>
              <div className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.changes && msg.changes.length > 0 && (
                <div className={styles.changesWrap}>
                  {msg.changes.filter(c => c.type === 'token').map((change, changeIdx) => {
                    const applied = msg.appliedIndexes?.has(changeIdx) ?? false
                    return (
                      <div key={changeIdx} className={styles.changeChip}>
                        {change.value && isColor(change.value) && (
                          <div className={styles.colorSwatch} style={{ backgroundColor: change.value }} />
                        )}
                        <div className={styles.changeInfo}>
                          <span className={styles.changeName}>{change.token}</span>
                          {change.value && <span className={styles.changeValue}>{change.value}</span>}
                          <span className={styles.changeValue}>{change.reason}</span>
                        </div>
                        <span className={`${styles.changeApplied} ${applied ? styles.changeAppliedDone : ''}`}>
                          {applied ? '✓ Applied' : '…'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {sending && <div className={styles.loadingBubble}>Redesigning…</div>}
        </div>
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <textarea
          className={styles.chatInput}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe how you want the newsletter to look…"
          rows={2}
          disabled={sending || loadingTokens}
        />
        <button
          className={styles.btnSend}
          onClick={() => sendMessage(message)}
          disabled={sending || !message.trim() || loadingTokens}
        >
          Apply
        </button>
      </div>
    </div>
  )
}
