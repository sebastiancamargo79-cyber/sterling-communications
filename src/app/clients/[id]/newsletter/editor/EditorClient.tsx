'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { type ModuleDef } from '@/lib/module-registry'
import { extractModuleBlocks, serializeModuleArray } from '@/lib/module-parser'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ArrayFieldEditor from '@/components/ArrayFieldEditor'
import EventFieldEditor from '@/components/EventFieldEditor'
import styles from './editor.module.css'

interface ModuleBlock {
  name: string
  yaml: string
  brief: string
  generating: boolean
}

interface Props {
  initialContent: string
  clientId: string
  clientName: string
  editionId?: string
  moduleDefs: ModuleDef[]
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
  onClick,
  sortableId,
}: {
  block: ModuleBlock
  moduleDefs: ModuleDef[]
  isActive: boolean
  onClick: () => void
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

export default function EditorClient({ initialContent, clientId, clientName, editionId, moduleDefs }: Props) {
  const router = useRouter()
  const [blocks, setBlocks] = useState<ModuleBlock[]>(() => {
    const parsed = extractModuleBlocks(initialContent)
      .map((b) => ({ ...b, brief: '', generating: false }))
    const presentNames = new Set(parsed.map((b) => b.name))
    const requiredMissing = moduleDefs
      .filter((m) => m.required && !presentNames.has(m.name))
      .map((m) => ({ name: m.name, yaml: '', brief: '', generating: false }))
    return [...requiredMissing, ...parsed]
  })
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)
  const [addingModule, setAddingModule] = useState(false)
  const [editionOpen, setEditionOpen] = useState(false)
  const [editionTitle, setEditionTitle] = useState('')
  const [savingEdition, setSavingEdition] = useState(false)
  const [selectedModuleName, setSelectedModuleName] = useState<string | null>(null)

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
    try {
      const rawContent = serializeModuleArray(blocks)
      const endpoint = editionId
        ? `/api/clients/${clientId}/newsletter/editions/${editionId}`
        : `/api/clients/${clientId}/newsletter`

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent }),
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Draft saved')
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }, [blocks, clientId, editionId])

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
    setSaveStatus('saving')
    const snapshot = blocks
    const eid = editionId
    const cid = clientId
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const rawContent = serializeModuleArray(snapshot)
        const endpoint = eid
          ? `/api/clients/${cid}/newsletter/editions/${eid}`
          : `/api/clients/${cid}/newsletter`
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawContent }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch {
        setSaveStatus('idle')
        toast.error('Auto-save failed')
      }
    }, 2000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [blocks, clientId, editionId])

  const previewHref = editionId
    ? `/clients/${clientId}/newsletter/preview?editionId=${editionId}`
    : `/clients/${clientId}/newsletter/preview`

  const handlePreview = useCallback(async () => {
    // Flush any pending auto-save before navigating to preview
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    try {
      const rawContent = serializeModuleArray(blocks)
      const endpoint = editionId
        ? `/api/clients/${clientId}/newsletter/editions/${editionId}`
        : `/api/clients/${clientId}/newsletter`
      await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent }),
      })
      setSaveStatus('saved')
      setLastSaved(new Date())
    } catch {
      // Non-fatal — navigate anyway
    }
    router.push(previewHref)
  }, [blocks, clientId, editionId, previewHref, router])

  const handleSaveEdition = async () => {
    if (!editionTitle.trim()) return
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
        body: JSON.stringify({ title: editionTitle.trim() }),
      })
      if (res.ok) {
        setEditionTitle('')
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

  const selectedIdx = blocks.findIndex((b) => b.name === selectedModuleName)
  const selectedBlock = selectedIdx >= 0 ? blocks[selectedIdx] : null

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <a href={`/clients/${clientId}`} className={styles.backLink}>← {clientName || 'Back'}</a>
          <h1 className={styles.topBarTitle}>Newsletter Editor</h1>
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
                value={editionTitle}
                onChange={(e) => setEditionTitle(e.target.value)}
                placeholder="Edition title…"
                autoFocus
              />
              <button className={styles.btnEdition} onClick={handleSaveEdition} disabled={savingEdition || !editionTitle.trim()}>
                {savingEdition ? 'Saving…' : 'Publish Edition'}
              </button>
              <button className={styles.btnCancelSmall} onClick={() => setEditionOpen(false)}>✕</button>
            </div>
          ) : (
            <button className={styles.btnEditionToggle} onClick={() => setEditionOpen(true)}>
              Publish Edition
            </button>
          )}
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
                    onClick={() => setSelectedModuleName(block.name)}
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
      </div>
    </div>
  )
}
