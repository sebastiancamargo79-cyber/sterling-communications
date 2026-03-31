'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { extractModuleBlocks } from '@/lib/module-parser'
import styles from './briefing.module.css'

const OPTIONAL_SECTIONS = [
  { name: 'DirectorUpdate', label: "Director's Update" },
  { name: 'Events', label: 'Events Diary' },
  { name: 'ClientStory', label: 'Client Story' },
  { name: 'StaffSpotlight', label: 'Staff Spotlight' },
  { name: 'Tips', label: 'Wellbeing Tips' },
  { name: 'Community', label: 'Community & Anniversaries' },
]

const MODULE_LABELS: Record<string, string> = {
  Cover: 'Cover Page',
  DirectorUpdate: "Director's Update",
  Events: 'Events Diary',
  ClientStory: 'Client Story',
  StaffSpotlight: 'Staff Spotlight',
  Tips: 'Wellbeing Tips',
  Community: 'Community & Anniversaries',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Operation {
  type: 'update_module' | 'add_module' | 'remove_module' | 'reorder_modules'
  name?: string
  yaml?: string
  after?: string
  order?: string[]
}

interface GenerationItem {
  name: string
  label: string
  status: 'pending' | 'generating' | 'done' | 'error'
}

interface Props {
  clientId: string
  clientName: string
  prefillMeta: Record<string, string>
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: `Hi! I'm here to help you plan this edition. What's the vibe or theme you're going for? For example: "Easter themed", "summer wellness focus", or "staff appreciation special".`,
}

function applyOpsToRaw(
  rawContent: string,
  ops: Operation[],
): string {
  const blocks = extractModuleBlocks(rawContent)
  let result = [...blocks]

  for (const op of ops) {
    if (op.type === 'update_module' && op.name) {
      result = result.map(b =>
        b.name === op.name ? { ...b, yaml: op.yaml ?? b.yaml } : b
      )
    } else if (op.type === 'reorder_modules' && op.order) {
      const byName = Object.fromEntries(result.map(b => [b.name, b]))
      result = op.order.flatMap(n => byName[n] ? [byName[n]] : [])
    }
  }

  return result
    .map(({ name, yaml }) =>
      `:::module:${name}\n${yaml.endsWith('\n') ? yaml : yaml + '\n'}:::`
    )
    .join('\n\n')
}

export default function BriefingClient({ clientId, clientName, prefillMeta }: Props) {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reviewEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const reviewInputRef = useRef<HTMLTextAreaElement>(null)
  const reviewInitiated = useRef(false)

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [showingModulePicker, setShowingModulePicker] = useState(false)
  const [modulePickerShown, setModulePickerShown] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [modulesBrief, setModulesBrief] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'chatting' | 'generating' | 'reviewing'>('chatting')
  const [generationItems, setGenerationItems] = useState<GenerationItem[]>([])

  // Reviewing phase state
  const [reviewMessages, setReviewMessages] = useState<Message[]>([])
  const [reviewRawContent, setReviewRawContent] = useState('')
  const [reviewInput, setReviewInput] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [editionIdForReview, setEditionIdForReview] = useState<string | null>(null)
  const [reviewModuleOrder, setReviewModuleOrder] = useState<string[]>([])
  const [openingInEditor, setOpeningInEditor] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showingModulePicker, loading])

  useEffect(() => {
    reviewEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [reviewMessages, reviewLoading])

  useEffect(() => {
    if (phase === 'chatting') inputRef.current?.focus()
    if (phase === 'reviewing') reviewInputRef.current?.focus()
  }, [phase])

  // Auto-trigger review agent when entering reviewing phase
  useEffect(() => {
    if (phase === 'reviewing' && !reviewInitiated.current) {
      reviewInitiated.current = true
      callReviewAgent([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const callBriefApi = async (
    updatedMessages: Message[],
    modulesToSend: string[],
    pickerShown: boolean,
  ) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/newsletter/brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          selectedModules: modulesToSend,
          clientName,
          modulePickerShown: pickerShown,
        }),
      })
      const data = await res.json()

      const assistantMsg: Message = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, assistantMsg])

      if (data.showModulePicker && !pickerShown) {
        setShowingModulePicker(true)
        setModulePickerShown(true)
      }

      if (data.isReady) {
        setIsReady(true)
        setModulesBrief(data.modulesBrief ?? {})
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const callReviewAgent = async (currentReviewMessages: Message[]) => {
    setReviewLoading(true)
    try {
      const moduleOrder = reviewModuleOrder.length > 0
        ? reviewModuleOrder
        : extractModuleBlocks(reviewRawContent).map(b => b.name)

      const res = await fetch('/api/newsletter/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            ...currentReviewMessages,
          ],
          rawContent: reviewRawContent,
          clientId,
          availableModules: [],
          currentModuleOrder: moduleOrder,
          modulesBrief,
          mode: 'review',
        }),
      })
      const data = await res.json()

      const assistantMsg: Message = { role: 'assistant', content: data.reply }
      setReviewMessages(prev => [...prev, assistantMsg])

      if (Array.isArray(data.operations) && data.operations.length > 0) {
        setReviewRawContent(prev => applyOpsToRaw(prev, data.operations))
      }
    } catch {
      setReviewMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setReviewLoading(false)
    }
  }

  const sendReviewMessage = async (content: string) => {
    if (!content.trim() || reviewLoading) return
    const userMsg: Message = { role: 'user', content: content.trim() }
    const updated = [...reviewMessages, userMsg]
    setReviewMessages(updated)
    setReviewInput('')
    await callReviewAgent(updated)
  }

  const handleOpenInEditor = async () => {
    if (!editionIdForReview || openingInEditor) return
    setOpeningInEditor(true)

    const fullConversation = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      ...reviewMessages.map(m => ({ role: m.role, content: m.content })),
    ]

    try {
      await fetch(`/api/clients/${clientId}/newsletter/editions/${editionIdForReview}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: reviewRawContent,
          agentConversation: fullConversation,
        }),
      })
    } catch {
      // Non-fatal — editor can still open with the content written during generation
    }

    router.push(`/clients/${clientId}/newsletter/editor?editionId=${editionIdForReview}`)
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return
    const userMsg: Message = { role: 'user', content: content.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setShowingModulePicker(false)
    await callBriefApi(updated, selectedModules, modulePickerShown)
  }

  const confirmSections = async () => {
    const labels = selectedModules.map(m => MODULE_LABELS[m] ?? m)
    const text =
      selectedModules.length === 0
        ? "I'd like just the Cover page for now."
        : `I'd like to include: ${labels.join(', ')}.`

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setShowingModulePicker(false)
    await callBriefApi(updated, selectedModules, true)
  }

  const toggleModule = (name: string) => {
    setSelectedModules(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleReviewKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendReviewMessage(reviewInput)
    }
  }

  const handleGenerate = async () => {
    const modulesToGenerate = ['Cover', ...selectedModules.filter(m => m !== 'Cover')]

    const items: GenerationItem[] = modulesToGenerate.map(name => ({
      name,
      label: MODULE_LABELS[name] ?? name,
      status: 'pending',
    }))
    setGenerationItems(items)
    setPhase('generating')

    try {
      // Create edition and seed with briefing conversation
      const editionRes = await fetch(`/api/clients/${clientId}/newsletter/editions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Edition',
          rawContent: ' ',
          agentConversation: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const editionData = await editionRes.json()
      const editionId = editionData.edition?.id
      if (!editionId) throw new Error('Failed to create edition')

      // Build Meta block from prefillMeta
      const month = new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })
      const metaYaml = [
        `month: "${month}"`,
        `office_name: "${(prefillMeta.office_name ?? clientName).replace(/"/g, '\\"')}"`,
        `phone: "${(prefillMeta.phone ?? '').replace(/"/g, '\\"')}"`,
        `website: "${(prefillMeta.website ?? '').replace(/"/g, '\\"')}"`,
        `email: "${(prefillMeta.email ?? '').replace(/"/g, '\\"')}"`,
      ].join('\n')

      const generatedBlocks: Array<{ name: string; yaml: string }> = [
        { name: 'Meta', yaml: metaYaml },
      ]

      // Generate each module sequentially
      for (const moduleName of modulesToGenerate) {
        setGenerationItems(prev =>
          prev.map(item => item.name === moduleName ? { ...item, status: 'generating' } : item)
        )

        try {
          const brief =
            modulesBrief[moduleName] ??
            `Generate a ${MODULE_LABELS[moduleName] ?? moduleName} section with a warm, professional tone appropriate for a home care franchise newsletter.`

          const genRes = await fetch('/api/newsletter/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleName, brief, clientId }),
          })
          const genData = await genRes.json()

          generatedBlocks.push({ name: moduleName, yaml: genData.yaml ?? '' })

          setGenerationItems(prev =>
            prev.map(item => item.name === moduleName ? { ...item, status: 'done' } : item)
          )
        } catch {
          generatedBlocks.push({ name: moduleName, yaml: '' })
          setGenerationItems(prev =>
            prev.map(item => item.name === moduleName ? { ...item, status: 'error' } : item)
          )
        }
      }

      // Serialize blocks into rawContent
      const rawContent = generatedBlocks
        .map(({ name, yaml }) => `:::module:${name}\n${yaml.endsWith('\n') ? yaml : yaml + '\n'}:::`)
        .join('\n\n')

      const moduleOrder = generatedBlocks.map(b => b.name)

      // Write initial content to edition (safe fallback if user navigates away)
      await fetch(`/api/clients/${clientId}/newsletter/editions/${editionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent }),
      })

      // Transition to reviewing phase
      setEditionIdForReview(editionId)
      setReviewRawContent(rawContent)
      setReviewModuleOrder(moduleOrder)
      setPhase('reviewing')
    } catch {
      setPhase('chatting')
      setGenerationItems([])
    }
  }

  // Generating phase
  if (phase === 'generating') {
    return (
      <div className={styles.page}>
        <div className={styles.generatingContainer}>
          <h2 className={styles.generatingTitle}>Generating your newsletter...</h2>
          <ul className={styles.progressList}>
            {generationItems.map(item => (
              <li key={item.name} className={styles.progressItem} data-status={item.status}>
                <span className={styles.progressIcon}>
                  {item.status === 'done' && '✓'}
                  {item.status === 'generating' && '◌'}
                  {item.status === 'error' && '✗'}
                  {item.status === 'pending' && '○'}
                </span>
                <span className={styles.progressLabel}>{item.label}</span>
                {item.status === 'generating' && <span className={styles.progressSpinner} />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // Reviewing phase
  if (phase === 'reviewing') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>New Edition — {clientName}</span>
          <button
            className={styles.btnGenerate}
            onClick={handleOpenInEditor}
            disabled={reviewLoading || openingInEditor}
            style={{ fontSize: '0.8rem', padding: '7px 16px' }}
          >
            {openingInEditor ? 'Opening…' : 'Open in Editor →'}
          </button>
        </div>

        {/* Compact done-modules strip */}
        <div className={styles.reviewSummary}>
          {generationItems.map(item => (
            <span key={item.name} className={styles.reviewSummaryItem}>
              <span className={styles.reviewSummaryIcon}>✓</span>
              {item.label}
            </span>
          ))}
        </div>

        {/* Review chat */}
        <div className={styles.chatArea}>
          <div className={styles.chatInner}>
            {reviewMessages.map((msg, i) => (
              <div key={i} className={styles.messageBubble} data-role={msg.role}>
                {msg.content}
              </div>
            ))}
            {reviewLoading && (
              <div className={styles.messageBubble} data-role="assistant">
                <span className={styles.typingDots}>
                  <span /><span /><span />
                </span>
              </div>
            )}
            <div ref={reviewEndRef} />
          </div>
        </div>

        <div className={styles.inputArea}>
          <div className={styles.inputInner}>
            <textarea
              ref={reviewInputRef}
              className={styles.input}
              value={reviewInput}
              onChange={e => setReviewInput(e.target.value)}
              onKeyDown={handleReviewKeyDown}
              placeholder="Ask for changes... (Enter to send)"
              rows={1}
              disabled={reviewLoading || openingInEditor}
            />
            <button
              className={styles.btnSend}
              onClick={() => sendReviewMessage(reviewInput)}
              disabled={!reviewInput.trim() || reviewLoading || openingInEditor}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Chat phase
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>New Edition — {clientName}</span>
        <Link href={`/clients/${clientId}/newsletter/editor`} className={styles.skipLink}>
          Skip → open blank editor
        </Link>
      </div>

      <div className={styles.chatArea}>
        <div className={styles.chatInner}>
          {messages.map((msg, i) => (
            <div key={i} className={styles.messageBubble} data-role={msg.role}>
              {msg.content}
            </div>
          ))}

          {showingModulePicker && (
            <div className={styles.modulePicker}>
              <p className={styles.modulePickerLabel}>Choose your sections:</p>
              <div className={styles.moduleCheckboxes}>
                {OPTIONAL_SECTIONS.map(section => (
                  <label key={section.name} className={styles.moduleCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(section.name)}
                      onChange={() => toggleModule(section.name)}
                    />
                    <span>{section.label}</span>
                  </label>
                ))}
              </div>
              <button className={styles.btnConfirmSections} onClick={confirmSections} disabled={loading}>
                Confirm sections →
              </button>
            </div>
          )}

          {loading && (
            <div className={styles.messageBubble} data-role="assistant">
              <span className={styles.typingDots}>
                <span /><span /><span />
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputInner}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your reply... (Enter to send)"
            rows={1}
            disabled={loading}
          />
          <button
            className={styles.btnSend}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            Send
          </button>
          <button
            className={styles.btnGenerate}
            onClick={handleGenerate}
            disabled={!isReady}
            title={!isReady ? 'Keep chatting until the AI has all it needs' : 'Generate newsletter'}
          >
            Generate Newsletter →
          </button>
        </div>
      </div>
    </div>
  )
}
