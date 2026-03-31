'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { type ModuleDef } from '@/lib/module-registry'
import { extractModuleBlocks, serializeModuleArray, extractVariantFromYaml, setVariantInYaml } from '@/lib/module-parser'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ArrayFieldEditor from '@/components/ArrayFieldEditor'
import EventFieldEditor from '@/components/EventFieldEditor'
import ModuleDesignOverlay from './ModuleDesignOverlay'
import styles from './editor.module.css'

interface ModuleBlock {
  name: string
  yaml: string
  brief: string
  generating: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatOperation {
  type: 'update_module' | 'add_module' | 'remove_module' | 'reorder_modules'
  name?: string
  yaml?: string
  after?: string
  order?: string[]
}

interface AssistantMessage extends ChatMessage {
  role: 'assistant'
  operations?: ChatOperation[]
}

function applyOperations(blocks: ModuleBlock[], ops: ChatOperation[], moduleDefs: ModuleDef[]): ModuleBlock[] {
  const REQUIRED = new Set(moduleDefs.filter((d) => d.required).map((d) => d.name))
  let result = [...blocks]
  for (const op of ops) {
    if (op.type === 'update_module' && op.name) {
      result = result.map((b) => b.name === op.name ? { ...b, yaml: op.yaml ?? b.yaml } : b)
    } else if (op.type === 'add_module' && op.name) {
      if (!result.find((b) => b.name === op.name)) {
        const nb: ModuleBlock = { name: op.name, yaml: op.yaml ?? '', brief: '', generating: false }
        const afterIdx = op.after ? result.findIndex((b) => b.name === op.after) : -1
        result.splice(afterIdx + 1, 0, nb)
      }
    } else if (op.type === 'remove_module' && op.name) {
      if (!REQUIRED.has(op.name)) result = result.filter((b) => b.name !== op.name)
    } else if (op.type === 'reorder_modules' && op.order) {
      const byName = Object.fromEntries(result.map((b) => [b.name, b]))
      result = op.order.flatMap((n) => byName[n] ? [byName[n]] : [])
    }
  }
  return result
}

interface Props {
  initialContent: string
  initialTokenOverrides: Record<string, string>
  clientId: string
  clientName: string
  editionId?: string
  editionTitle?: string
  moduleDefs: ModuleDef[]
  initialAgentConversation?: Array<{ role: string; content: string }>
}

function getModuleDef(name: string, defs: ModuleDef[]): ModuleDef | undefined {
  return defs.find((m) => m.name === name)
}

function YamlField({
  fieldDef,
  value,
  onChange,
}: {
  fieldDef: { key: string; label: string; type: string; placeholder?: string }
  value: string
  onChange: (val: string) => void
}) {
  if (fieldDef.type === 'textarea') {
    return (
      <div className={styles.field}>
        <label className={styles.fieldLabel}>{fieldDef.label}</label>
        <textarea
          className={styles.textarea}
          value={value}
          placeholder={fieldDef.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
        />
      </div>
    )
  }
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{fieldDef.label}</label>
      <input
        className={styles.input}
        type="text"
        value={value}
        placeholder={fieldDef.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function extractYamlValue(yaml: string, key: string): string {
  const lines = yaml.split('\n')
  const keyLine = lines.findIndex((l) => l.startsWith(key + ':'))
  if (keyLine === -1) return ''
  const firstVal = lines[keyLine].slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
  if (firstVal === '|' || firstVal === '>') {
    const indent = lines[keyLine + 1]?.match(/^(\s+)/)?.[1]?.length ?? 2
    const blockLines: string[] = []
    for (let i = keyLine + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '' || line.startsWith(' '.repeat(indent))) {
        blockLines.push(line.slice(indent))
      } else {
        break
      }
    }
    return blockLines.join('\n').trimEnd()
  }
  return firstVal
}

function setYamlValue(yaml: string, key: string, newValue: string): string {
  const lines = yaml.split('\n')
  const keyLine = lines.findIndex((l) => l.startsWith(key + ':'))
  const isMultiline = newValue.includes('\n')

  if (keyLine === -1) {
    if (isMultiline) {
      return yaml + `\n${key}: |\n` + newValue.split('\n').map((l) => '  ' + l).join('\n') + '\n'
    }
    return yaml + `\n${key}: "${newValue}"\n`
  }

  const firstVal = lines[keyLine].slice(key.length + 1).trim()
  const isCurrentBlock = firstVal === '|' || firstVal === '>'

  if (isCurrentBlock) {
    const indent = lines[keyLine + 1]?.match(/^(\s+)/)?.[1]?.length ?? 2
    let endLine = keyLine + 1
    while (endLine < lines.length) {
      const line = lines[endLine]
      if (line.trim() !== '' && !line.startsWith(' '.repeat(indent))) break
      endLine++
    }
    const newLines = isMultiline
      ? [`${key}: |`, ...newValue.split('\n').map((l) => '  ' + l)]
      : [`${key}: "${newValue}"`]
    lines.splice(keyLine, endLine - keyLine, ...newLines)
  } else {
    if (isMultiline) {
      const newLines = [`${key}: |`, ...newValue.split('\n').map((l) => '  ' + l)]
      lines.splice(keyLine, 1, ...newLines)
    } else {
      lines[keyLine] = `${key}: "${newValue}"`
    }
  }

  return lines.join('\n')
}

function extractYamlArray(yaml: string, key: string): string[] {
  const lines = yaml.split('\n')
  const keyLine = lines.findIndex((l) => l.startsWith(key + ':'))
  if (keyLine === -1) return ['']
  const items: string[] = []
  for (let i = keyLine + 1; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/^\s+-\s+["']?(.*?)["']?\s*$/)
    if (match) {
      items.push(match[1])
    } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('-')) {
      break
    }
  }
  return items.length > 0 ? items : ['']
}

function setYamlArray(yaml: string, key: string, values: string[]): string {
  const lines = yaml.split('\n')
  const keyLine = lines.findIndex((l) => l.startsWith(key + ':'))
  const arrayYaml = values.map((v) => `  - "${v}"`).join('\n')

  if (keyLine === -1) {
    return yaml + `\n${key}:\n${arrayYaml}\n`
  }

  let endLine = keyLine + 1
  while (endLine < lines.length) {
    const line = lines[endLine]
    if (line.match(/^\s+-/)) {
      endLine++
    } else {
      break
    }
  }
  lines.splice(keyLine, endLine - keyLine, `${key}:\n${arrayYaml}`)
  return lines.join('\n')
}

interface EventItem {
  type: string
  title?: string
  date?: string
  time?: string
  location?: string
  description?: string
  image_url?: string
  caption?: string
}

function parseEventsFromYaml(yaml: string): EventItem[] {
  const items: EventItem[] = []
  const lines = yaml.split('\n')
  let current: Record<string, string> | null = null

  for (const line of lines) {
    const itemStart = line.match(/^-\s+(\w+):\s*(.*)$/)
    if (itemStart) {
      if (current) items.push(current as unknown as EventItem)
      current = { [itemStart[1]]: itemStart[2].replace(/^["']|["']$/g, '') }
      continue
    }
    const fieldMatch = line.match(/^\s+(\w+):\s*(.*)$/)
    if (fieldMatch && current) {
      current[fieldMatch[1]] = fieldMatch[2].replace(/^["']|["']$/g, '')
    }
  }
  if (current) items.push(current as unknown as EventItem)
  return items.length > 0 ? items : [{ type: 'event', title: '', date: '', time: '', location: '', description: '' }]
}

function serializeEventsToYaml(events: EventItem[]): string {
  return events.map((e) => {
    if (e.type === 'photo') {
      return `- type: photo\n  image_url: "${e.image_url ?? ''}"\n  caption: "${e.caption ?? ''}"`
    }
    return [
      `- type: event`,
      `  title: "${e.title ?? ''}"`,
      `  date: "${e.date ?? ''}"`,
      `  time: "${e.time ?? ''}"`,
      `  location: "${e.location ?? ''}"`,
      `  description: "${e.description ?? ''}"`,
    ].join('\n')
  }).join('\n')
}

function PromptEditModal({
  moduleName,
  moduleLabel,
  clientId,
  defaultPrompt,
  onClose,
}: {
  moduleName: string
  moduleLabel: string
  clientId: string
  defaultPrompt: string
  onClose: () => void
}) {
  const [promptText, setPromptText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/clients/${clientId}/ai-prompts`)
      .then((r) => r.json())
      .then((data) => {
        const match = data.prompts?.find((p: { moduleName: string }) => p.moduleName === moduleName)
        setPromptText(match?.promptText ?? defaultPrompt)
        setLoading(false)
      })
      .catch(() => {
        setPromptText(defaultPrompt)
        setLoading(false)
      })
  }, [clientId, moduleName, defaultPrompt])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/ai-prompts/${moduleName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText }),
      })
      if (!res.ok) throw new Error()
      toast.success('AI prompt saved')
      onClose()
    } catch {
      toast.error('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await fetch(`/api/clients/${clientId}/ai-prompts/${moduleName}`, { method: 'DELETE' })
      setPromptText(defaultPrompt)
      toast.success('Prompt reset to default')
    } catch {
      toast.error('Failed to reset prompt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.modalTitle}>AI Prompt — {moduleLabel}</h3>
        <p className={styles.modalHint}>
          Customise the instructions sent to the AI when generating content for this module.
        </p>
        {loading ? (
          <p style={{ color: '#5a6a7a', fontSize: '0.9rem' }}>Loading…</p>
        ) : (
          <>
            <textarea
              className={styles.modalTextarea}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={12}
            />
            <div className={styles.modalActions}>
              <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Prompt'}
              </button>
              <button className={styles.btnSmall} onClick={handleReset} disabled={saving}>
                Reset to Default
              </button>
              <button className={styles.btnCancelSmall} onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Left panel: sortable module list item
function SortableModuleListItem({
  block,
  moduleDefs,
  isActive,
  isDesignOpen,
  onClick,
  onOpenDesign,
  sortableId,
}: {
  block: ModuleBlock
  moduleDefs: ModuleDef[]
  isActive: boolean
  isDesignOpen: boolean
  onClick: () => void
  onOpenDesign: () => void
  sortableId: string
}) {
  const def = getModuleDef(block.name, moduleDefs)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: sortableId })
  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`${styles.moduleListItem} ${isActive ? styles.moduleListItemActive : ''}`}
      onClick={onClick}
    >
      <span
        className={styles.dragHandle}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        ⠿
      </span>
      <span style={{ flex: 1 }}>{def?.label ?? block.name}</span>
      {block.generating && <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>…</span>}
      <button
        className={`${styles.btnPalette} ${isDesignOpen ? styles.btnPaletteActive : ''}`}
        title="Design assistant"
        onClick={(e) => { e.stopPropagation(); onOpenDesign() }}
      >
        🎨
      </button>
    </div>
  )
}

// Right panel: fields + generate row for a single module
function ModuleFields({
  block,
  moduleDefs,
  clientId,
  onYamlChange,
  onBriefChange,
  onGenerate,
  onRemove,
}: {
  block: ModuleBlock
  moduleDefs: ModuleDef[]
  clientId: string
  onYamlChange: (yaml: string) => void
  onBriefChange: (brief: string) => void
  onGenerate: () => void
  onRemove: () => void
}) {
  const def = getModuleDef(block.name, moduleDefs)
  const [rawMode, setRawMode] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const isRequired = def?.required ?? false

  return (
    <div>
      <div className={styles.fieldsHeader}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{def?.label ?? block.name}</span>
          {isRequired && <span className={styles.badgeRequired}>Required</span>}
          {!isRequired && <span className={styles.badgeOptional}>Optional</span>}
        </div>
        <div className={styles.cardActions}>
          {def?.aiPromptTemplate && (
            <button
              className={styles.btnSmall}
              onClick={() => setPromptOpen(true)}
              title="Edit AI prompt"
            >
              Edit prompt
            </button>
          )}
          <button className={styles.btnSmall} onClick={() => setRawMode((v) => !v)}>
            {rawMode ? 'Fields' : 'YAML'}
          </button>
          {!isRequired && (
            <button className={styles.btnDanger} onClick={onRemove}>✕</button>
          )}
        </div>
      </div>

      <div className={styles.fieldsCard}>
        <div className={styles.cardBody}>
          {rawMode || !def ? (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Raw YAML</label>
              <textarea
                className={styles.textarea}
                value={block.yaml}
                onChange={(e) => onYamlChange(e.target.value)}
                rows={10}
                spellCheck={false}
              />
            </div>
          ) : (
            def.fields.map((field) => {
              if (field.type === 'events') {
                const events = parseEventsFromYaml(block.yaml)
                return (
                  <EventFieldEditor
                    key={field.key}
                    events={events}
                    onChange={(newEvents) => onYamlChange(serializeEventsToYaml(newEvents))}
                  />
                )
              }
              if (field.type === 'array') {
                const values = extractYamlArray(block.yaml, field.key)
                return (
                  <ArrayFieldEditor
                    key={field.key}
                    label={field.label}
                    values={values}
                    onChange={(newValues) => onYamlChange(setYamlArray(block.yaml, field.key, newValues))}
                  />
                )
              }
              return (
                <YamlField
                  key={field.key}
                  fieldDef={field}
                  value={extractYamlValue(block.yaml, field.key)}
                  onChange={(val) => onYamlChange(setYamlValue(block.yaml, field.key, val))}
                />
              )
            })
          )}

          {def?.aiPromptTemplate && (
            <div className={styles.generateRow}>
              <textarea
                className={styles.briefTextarea}
                value={block.brief}
                onChange={(e) => onBriefChange(e.target.value)}
                placeholder="Describe what this module should cover — AI will generate content…"
                rows={2}
              />
              <button
                className={styles.btnGenerate}
                onClick={onGenerate}
                disabled={block.generating || !block.brief.trim()}
              >
                {block.generating ? <span className={styles.spinner}>Generating…</span> : 'Generate'}
              </button>
            </div>
          )}
        </div>
      </div>

      {promptOpen && def && (
        <PromptEditModal
          moduleName={block.name}
          moduleLabel={def.label}
          clientId={clientId}
          defaultPrompt={def.aiPromptTemplate}
          onClose={() => setPromptOpen(false)}
        />
      )}
    </div>
  )
}

export default function EditorClient({ initialContent, initialTokenOverrides, clientId, clientName, editionId, editionTitle, moduleDefs, initialAgentConversation = [] }: Props) {
  const router = useRouter()
  const [titleValue, setTitleValue] = useState(editionTitle ?? 'Untitled Edition')
  const [blocks, setBlocks] = useState<ModuleBlock[]>(() => {
    const parsed = extractModuleBlocks(initialContent)
      .map((b) => ({ ...b, brief: '', generating: false }))
    const presentNames = new Set(parsed.map((b) => b.name))
    const requiredMissing = moduleDefs
      .filter((m) => m.required && !presentNames.has(m.name))
      .map((m) => ({ name: m.name, yaml: '', brief: '', generating: false }))
    return [...requiredMissing, ...parsed]
  })
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>(initialTokenOverrides)
  const [designOverlayModule, setDesignOverlayModule] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveAbortRef = useRef<AbortController | null>(null)
  const isInitialMount = useRef(true)
  const [addingModule, setAddingModule] = useState(false)
  const [editionOpen, setEditionOpen] = useState(false)
  const [newEditionTitle, setNewEditionTitle] = useState('')
  const [savingEdition, setSavingEdition] = useState(false)
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<(ChatMessage | AssistantMessage)[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const saveTitle = useCallback(async (newTitle: string) => {
    if (!editionId || !newTitle.trim()) return
    try {
      await fetch(`/api/clients/${clientId}/newsletter/editions/${editionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
    } catch {
      toast.error('Failed to save title')
    }
  }, [clientId, editionId])

  // Keep selectedModuleName valid as blocks change
  useEffect(() => {
    if (blocks.length > 0) {
      if (!selectedModuleName || !blocks.find((b) => b.name === selectedModuleName)) {
        setSelectedModuleName(blocks[0].name)
      }
    }
  }, [blocks, selectedModuleName])

  const existingNames = new Set(blocks.map((b) => b.name))
  const availableToAdd = moduleDefs.map((m) => m.name).filter((n) => !existingNames.has(n))

  const updateBlock = useCallback((idx: number, patch: Partial<ModuleBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }, [])

  const removeBlock = useCallback((idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const addModule = useCallback((name: string) => {
    setBlocks((prev) => [...prev, { name, yaml: '', brief: '', generating: false }])
    setSelectedModuleName(name)
    setAddingModule(false)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldIndex = prev.findIndex((b) => b.name === active.id)
        const newIndex = prev.findIndex((b) => b.name === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }, [])

  const handleGenerate = useCallback(
    async (idx: number) => {
      const block = blocks[idx]
      updateBlock(idx, { generating: true })
      try {
        const res = await fetch('/api/newsletter/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleName: block.name,
            brief: block.brief,
            currentContent: block.yaml.trim() || undefined,
            clientId,
          }),
        })
        if (!res.ok) throw new Error('Generate request failed')
        const { yaml } = await res.json() as { yaml: string }
        let finalYaml = yaml
        if (block.name === 'DirectorUpdate') {
          finalYaml = setYamlValue(finalYaml, 'signature_name', '')
          finalYaml = setYamlValue(finalYaml, 'signature_title', '')
        }
        updateBlock(idx, { yaml: finalYaml, generating: false })
        toast.success('Content generated')
      } catch {
        updateBlock(idx, { generating: false })
        toast.error('Generation failed. Check your OPENAI_API_KEY.')
      }
    },
    [blocks, updateBlock, clientId]
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    saveAbortRef.current?.abort()
    const ctrl = new AbortController()
    saveAbortRef.current = ctrl
    try {
      const rawContent = serializeModuleArray(blocks)
      const endpoint = editionId
        ? `/api/clients/${clientId}/newsletter/editions/${editionId}`
        : `/api/clients/${clientId}/newsletter`

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent,
          tokenOverrides,
          agentConversation: [
            ...initialAgentConversation,
            ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Draft saved')
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }, [blocks, clientId, editionId, tokenOverrides])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  // Debounced auto-save (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    const snapshot = blocks
    const overridesSnapshot = tokenOverrides
    const eid = editionId
    const cid = clientId
    saveTimeoutRef.current = setTimeout(async () => {
      saveAbortRef.current?.abort()
      const ctrl = new AbortController()
      saveAbortRef.current = ctrl
      setSaveStatus('saving')
      try {
        const rawContent = serializeModuleArray(snapshot)
        const endpoint = eid
          ? `/api/clients/${cid}/newsletter/editions/${eid}`
          : `/api/clients/${cid}/newsletter`
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawContent, tokenOverrides: overridesSnapshot }),
          signal: ctrl.signal,
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setSaveStatus('idle')
        toast.error('Auto-save failed')
      }
    }, 2000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [blocks, clientId, editionId, tokenOverrides])

  const handlePreview = useCallback(async () => {
    // Flush any pending auto-save before navigating to preview
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    saveAbortRef.current?.abort()
    const ctrl = new AbortController()
    saveAbortRef.current = ctrl
    try {
      const rawContent = serializeModuleArray(blocks)
      const endpoint = editionId
        ? `/api/clients/${clientId}/newsletter/editions/${editionId}`
        : `/api/clients/${clientId}/newsletter`
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent, tokenOverrides }),
        signal: ctrl.signal,
      })
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch {
      // Non-fatal — navigate anyway
    }
    // Append timestamp to bust Next.js Router Cache so the preview always re-fetches from DB
    const ts = Date.now()
    const href = editionId
      ? `/clients/${clientId}/newsletter/preview?editionId=${editionId}&t=${ts}`
      : `/clients/${clientId}/newsletter/preview?t=${ts}`
    router.push(href)
  }, [blocks, clientId, editionId, router, tokenOverrides])

  const handleSaveEdition = async () => {
    if (!newEditionTitle.trim()) return
    setSavingEdition(true)
    try {
      const rawContent = serializeModuleArray(blocks)
      await fetch(`/api/clients/${clientId}/newsletter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent }),
      })
      const res = await fetch(`/api/clients/${clientId}/newsletter/editions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEditionTitle.trim() }),
      })
      if (res.ok) {
        setNewEditionTitle('')
        setEditionOpen(false)
        toast.success('Edition saved')
      } else {
        toast.error('Failed to save edition')
      }
    } catch {
      toast.error('Failed to save edition')
    } finally {
      setSavingEdition(false)
    }
  }

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const userMsg: ChatMessage = { role: 'user', content: text }
    const history = [...chatMessages, userMsg]
    setChatMessages(history)
    setChatInput('')
    setChatLoading(true)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    try {
      const rawContent = serializeModuleArray(blocks)
      const existingNames = new Set(blocks.map((b) => b.name))
      const availableModules = moduleDefs.map((m) => m.name).filter((n) => !existingNames.has(n))
      const res = await fetch('/api/newsletter/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...initialAgentConversation,
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          rawContent,
          clientId,
          availableModules,
          currentModuleOrder: blocks.map((b) => b.name),
          mode: 'edit',
        }),
      })
      if (!res.ok) throw new Error('Chat request failed')
      const { reply, operations } = await res.json() as { reply: string; operations: ChatOperation[] }
      const assistantMsg: AssistantMessage = { role: 'assistant', content: reply, operations }
      const newHistory = [...history, { role: 'assistant' as const, content: reply }]
      setChatMessages((prev) => [...prev, assistantMsg])
      // Persist conversation after each turn (fire-and-forget)
      if (editionId) {
        fetch(`/api/clients/${clientId}/newsletter/editions/${editionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentConversation: [
              ...initialAgentConversation,
              ...newHistory.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        }).catch(() => {})
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [chatInput, chatLoading, chatMessages, blocks, clientId, moduleDefs])

  const selectedIdx = blocks.findIndex((b) => b.name === selectedModuleName)
  const selectedBlock = selectedIdx >= 0 ? blocks[selectedIdx] : null

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <a href={`/clients/${clientId}`} className={styles.backLink}>← {clientName || 'Back'}</a>
          <div className={styles.editionTitleWrap}>
            <span className={styles.editionTitleLabel}>Edition</span>
            <input
              className={styles.editionTitleInput}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={(e) => saveTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
              placeholder="Untitled Edition"
            />
          </div>
        </div>
        <div className={styles.topBarActions}>
          {saveStatus === 'saving' && (
            <span className={styles.saveStatus}>Saving…</span>
          )}
          {saveStatus === 'saved' && lastSaved && (
            <span className={styles.saveStatus}>
              ✓ Saved at {lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {editionOpen ? (
            <div className={styles.editionInline}>
              <input
                className={styles.editionInput}
                type="text"
                value={newEditionTitle}
                onChange={(e) => setNewEditionTitle(e.target.value)}
                placeholder="Edition title…"
                autoFocus
              />
              <button className={styles.btnEdition} onClick={handleSaveEdition} disabled={savingEdition || !newEditionTitle.trim()}>
                {savingEdition ? 'Saving…' : 'Publish Edition'}
              </button>
              <button className={styles.btnCancelSmall} onClick={() => setEditionOpen(false)}>✕</button>
            </div>
          ) : (
            <button className={styles.btnEditionToggle} onClick={() => setEditionOpen(true)}>
              Publish Edition
            </button>
          )}
          <button
            className={`${styles.btnChat} ${chatOpen ? styles.btnChatActive : ''}`}
            onClick={() => setChatOpen((o) => !o)}
          >
            💬 Chat
          </button>
          <button className={styles.btnPreview} onClick={handlePreview}>
            Preview
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        {/* Left panel: module list */}
        <div className={styles.moduleList}>
          <div className={styles.moduleListScroll}>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map((b) => b.name)} strategy={verticalListSortingStrategy}>
                {blocks.map((block, idx) => (
                  <SortableModuleListItem
                    key={`${block.name}-${idx}`}
                    block={block}
                    moduleDefs={moduleDefs}
                    isActive={block.name === selectedModuleName}
                    isDesignOpen={block.name === designOverlayModule}
                    onClick={() => setSelectedModuleName(block.name)}
                    onOpenDesign={() => setDesignOverlayModule(
                      designOverlayModule === block.name ? null : block.name
                    )}
                    sortableId={block.name}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className={styles.moduleListFooter}>
            {addingModule ? (
              <div className={styles.addModuleDropdown}>
                {availableToAdd.length === 0 ? (
                  <span className={styles.noModules}>All modules added</span>
                ) : (
                  availableToAdd.map((name) => {
                    const def = getModuleDef(name, moduleDefs)
                    return (
                      <button key={name} className={styles.addModuleOption} onClick={() => addModule(name)}>
                        {def?.label ?? name}
                      </button>
                    )
                  })
                )}
                <button className={styles.btnSmall} onClick={() => setAddingModule(false)}>Cancel</button>
              </div>
            ) : (
              <button className={styles.btnAddModule} onClick={() => setAddingModule(true)}>
                + Add Module
              </button>
            )}
          </div>
        </div>

        {/* Right panel: field editing */}
        {!chatOpen && (
          <div className={styles.moduleFields}>
            {selectedBlock && (
              <ModuleFields
                key={selectedModuleName ?? undefined}
                block={selectedBlock}
                moduleDefs={moduleDefs}
                clientId={clientId}
                onYamlChange={(yaml) => updateBlock(selectedIdx, { yaml })}
                onBriefChange={(brief) => updateBlock(selectedIdx, { brief })}
                onGenerate={() => handleGenerate(selectedIdx)}
                onRemove={() => removeBlock(selectedIdx)}
              />
            )}
          </div>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <div className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <span className={styles.chatTitle}>AI Assistant</span>
              <button className={styles.chatCloseBtn} onClick={() => setChatOpen(false)}>✕</button>
            </div>
            <div className={styles.chatMessages}>
              {chatMessages.length === 0 && (
                <p className={styles.chatEmpty}>
                  Ask me to rearrange sections, add new content, update a module, or anything else about your newsletter.
                </p>
              )}
              {chatMessages.map((msg, i) => {
                const isAssistant = msg.role === 'assistant'
                const ops = (msg as AssistantMessage).operations
                return (
                  <div key={i} className={`${styles.chatMsg} ${isAssistant ? styles.chatMsgAssistant : styles.chatMsgUser}`}>
                    <p className={styles.chatMsgText}>{msg.content}</p>
                    {isAssistant && ops && ops.length > 0 && (
                      <>
                        <div className={styles.chatOpsList}>
                          {ops.map((op, j) => (
                            <span key={j} className={styles.chatOpsItem}>
                              {op.type === 'update_module' && `• Update ${op.name} content`}
                              {op.type === 'add_module' && `• Add ${op.name} module${op.after ? ` after ${op.after}` : ''}`}
                              {op.type === 'remove_module' && `• Remove ${op.name} module`}
                              {op.type === 'reorder_modules' && `• Reorder modules`}
                            </span>
                          ))}
                        </div>
                        <button
                          className={styles.chatApplyBtn}
                          onClick={() => {
                            setBlocks((prev) => applyOperations(prev, ops, moduleDefs))
                            setChatOpen(false)
                            toast.success('Changes applied')
                          }}
                        >
                          Apply changes
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
              {chatLoading && (
                <div className={`${styles.chatMsg} ${styles.chatMsgAssistant}`}>
                  <p className={styles.chatMsgText}>Thinking…</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className={styles.chatInputRow}>
              <textarea
                className={styles.chatInput}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSend()
                  }
                }}
                placeholder="Ask me to add a section, reorder modules, improve content…"
                rows={2}
                disabled={chatLoading}
              />
              <button
                className={styles.chatSendBtn}
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Design overlay */}
      {designOverlayModule && (() => {
        const overlayBlock = blocks.find((b) => b.name === designOverlayModule)
        const overlayDef = getModuleDef(designOverlayModule, moduleDefs)
        if (!overlayBlock) return null
        return (
          <ModuleDesignOverlay
            key={designOverlayModule}
            moduleType={designOverlayModule}
            moduleLabel={overlayDef?.label ?? designOverlayModule}
            moduleYaml={overlayBlock.yaml}
            clientId={clientId}
            editionOverrides={tokenOverrides}
            currentVariant={extractVariantFromYaml(overlayBlock.yaml)}
            agentConversation={[
              ...initialAgentConversation.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
              ...chatMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            ]}
            onClose={() => setDesignOverlayModule(null)}
            onApplyToken={(token, value, scope) => {
              if (scope === 'global') {
                // Update brand kit globally
                fetch(`/api/clients/${clientId}/brand-kit`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ [token]: value }),
                }).catch(() => {})
                toast.success(`Brand token ${token} updated globally`)
              } else {
                setTokenOverrides((prev) => ({ ...prev, [token]: value }))
                toast.success(`Design override applied`)
              }
            }}
            onApplyVariant={(variant) => {
              const blockIdx = blocks.findIndex((b) => b.name === designOverlayModule)
              if (blockIdx >= 0) {
                const newYaml = setVariantInYaml(blocks[blockIdx].yaml, variant === 'classic' ? null : variant)
                updateBlock(blockIdx, { yaml: newYaml })
                toast.success(`Layout switched to ${variant}`)
              }
            }}
          />
        )
      })()}
    </div>
  )
}
