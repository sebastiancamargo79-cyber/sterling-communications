'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './ModuleDesignOverlay.module.css'

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
  moduleType: string
  moduleLabel: string
  moduleYaml: string
  clientId: string
  editionOverrides: Record<string, string>
  currentVariant: string
  agentConversation?: Array<{ role: 'user' | 'assistant'; content: string }>
  onClose: () => void
  onApplyToken: (token: string, value: string, scope: 'edition' | 'global') => void
  onApplyVariant: (variant: string) => void
}

function isColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value.trim())
}

export default function ModuleDesignOverlay({
  moduleType,
  moduleLabel,
  moduleYaml,
  clientId,
  editionOverrides,
  currentVariant,
  agentConversation = [],
  onClose,
  onApplyToken,
  onApplyVariant,
}: Props) {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [brandTokens, setBrandTokens] = useState<Record<string, string | null>>({})
  const [loadingTokens, setLoadingTokens] = useState(true)
  const threadRef = useRef<HTMLDivElement>(null)

  // Fetch brand kit tokens on mount
  useEffect(() => {
    fetch(`/api/clients/${clientId}/brand-kit`)
      .then((r) => r.ok ? r.json() : null)
      .then((kit) => {
        if (kit) {
          const tokens: Record<string, string | null> = {
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
          }
          setBrandTokens(tokens)
        }
        setLoadingTokens(false)
      })
      .catch(() => setLoadingTokens(false))
  }, [clientId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [history, sending])

  const handleSend = async () => {
    const trimmed = message.trim()
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
          moduleType,
          moduleContent: moduleYaml,
          currentTokens: brandTokens,
          editionOverrides,
          message: trimmed,
          history: history.map((m) => ({ role: m.role, content: m.content })),
          agentConversation,
        }),
      })

      if (!res.ok) throw new Error('Request failed')
      const data = await res.json() as { message: string; changes: Change[] }
      const changes = data.changes ?? []

      // Auto-apply token changes immediately so the preview updates; variant changes are manual
      for (const change of changes) {
        if (change.type === 'token' && change.token && change.value) {
          onApplyToken(change.token, change.value, change.scope ?? 'edition')
        }
      }

      // Mark only token changes as auto-applied; variant chips stay clickable
      const autoApplied = new Set<number>()
      changes.forEach((c, i) => { if (c.type === 'token') autoApplied.add(i) })

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.message,
        changes,
        appliedIndexes: autoApplied,
      }
      setHistory((prev) => [...prev, assistantMsg])
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
      handleSend()
    }
  }

  const applyChange = (msgIdx: number, changeIdx: number, change: Change) => {
    setHistory((prev) =>
      prev.map((msg, i) => {
        if (i !== msgIdx || !msg.appliedIndexes) return msg
        const next = new Set(msg.appliedIndexes)
        next.add(changeIdx)
        return { ...msg, appliedIndexes: next }
      })
    )
    if (change.type === 'token' && change.token && change.value) {
      onApplyToken(change.token, change.value, change.scope ?? 'edition')
    } else if (change.type === 'variant' && change.variant) {
      onApplyVariant(change.variant)
    }
  }

  return (
    <div className={styles.overlay}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.paletteIcon}>🎨</span>
          Design — {moduleLabel}
        </div>
        <button className={styles.btnClose} onClick={onClose} title="Close">✕</button>
      </div>

      {/* Scrollable body */}
      <div className={styles.scrollArea} ref={threadRef}>
        {/* Variant selector */}
        <div>
          <div className={styles.sectionLabel}>Layout Variant</div>
          <div className={styles.variantGrid}>
            {/* Classic */}
            <button
              className={`${styles.variantCard} ${currentVariant !== 'alternate' ? styles.variantCardActive : ''}`}
              onClick={() => onApplyVariant('classic')}
            >
              <div className={styles.variantThumb}>
                <div className={styles.thumbClassic}>
                  <div className={styles.thumbClassicBar} />
                  <div className={styles.thumbClassicImg} />
                  <div className={styles.thumbClassicRow} />
                </div>
              </div>
              <span className={styles.variantLabel}>Classic</span>
              <span className={styles.variantDesc}>Standard layout</span>
            </button>
            {/* Alternate */}
            <button
              className={`${styles.variantCard} ${currentVariant === 'alternate' ? styles.variantCardActive : ''}`}
              onClick={() => onApplyVariant('alternate')}
            >
              <div className={styles.variantThumb}>
                <div className={styles.thumbAlt}>
                  <div className={styles.thumbAltImg} />
                  <div className={styles.thumbAltRight}>
                    <div className={styles.thumbAltLine} />
                    <div className={styles.thumbAltLine} />
                    <div className={styles.thumbAltLine} />
                  </div>
                </div>
              </div>
              <span className={styles.variantLabel}>Alternate</span>
              <span className={styles.variantDesc}>Different layout</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.divider}>Design Assistant</div>

        {/* Chat thread */}
        {loadingTokens && (
          <div className={styles.loadingText}>Loading brand tokens…</div>
        )}
        <div className={styles.chatThread}>
          {history.length === 0 && !sending && (
            <div className={styles.bubbleAssistant} style={{ maxWidth: '100%' }}>
              Hi! I can suggest design improvements for this <strong>{moduleLabel}</strong> module.
              Try: &ldquo;Make this section warmer&rdquo; or &ldquo;Try the alternate layout&rdquo;.
            </div>
          )}
          {history.map((msg, msgIdx) => (
            <div key={msgIdx}>
              <div
                className={`${styles.bubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.changes && msg.changes.length > 0 && (
                <div className={styles.changesWrap}>
                  {msg.changes.map((change, changeIdx) => {
                    const applied = msg.appliedIndexes?.has(changeIdx) ?? false
                    return (
                      <div key={changeIdx} className={styles.changeChip}>
                        {change.type === 'token' && change.value && isColor(change.value) && (
                          <div
                            className={styles.colorSwatch}
                            style={{ backgroundColor: change.value }}
                          />
                        )}
                        <div className={styles.changeInfo}>
                          <span className={styles.changeName}>
                            {change.type === 'token' ? change.token : `Layout: ${change.variant}`}
                          </span>
                          {change.type === 'token' && change.value && (
                            <span className={styles.changeValue}>{change.value}</span>
                          )}
                          <span className={styles.changeValue}>{change.reason}</span>
                          {change.type === 'token' && (
                            <span className={`${styles.changeScope} ${change.scope === 'global' ? styles.changeScopeGlobal : ''}`}>
                              {change.scope === 'global' ? 'Brand-wide' : 'This edition'}
                            </span>
                          )}
                        </div>
                        <button
                          className={`${styles.btnApply} ${applied ? styles.btnApplyDone : ''}`}
                          onClick={() => !applied && applyChange(msgIdx, changeIdx, change)}
                          disabled={applied}
                        >
                          {applied ? '✓' : 'Apply'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className={styles.loadingBubble}>Thinking…</div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className={styles.inputArea}>
        <textarea
          className={styles.chatInput}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the design assistant…"
          rows={1}
          disabled={sending || loadingTokens}
        />
        <button
          className={styles.btnSend}
          onClick={handleSend}
          disabled={sending || !message.trim() || loadingTokens}
        >
          Send
        </button>
      </div>
    </div>
  )
}
