'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { MODULE_REGISTRY, AVAILABLE_MODULES, type ModuleDef } from '@/lib/module-registry'
import { extractModuleBlocks, serializeModuleArray } from '@/lib/module-parser'
import styles from './editor.module.css'

interface ModuleBlock {
  name: string
  yaml: string
  brief: string
  generating: boolean
}

interface Props {
  initialContent: string
}

function getModuleDef(name: string): ModuleDef | undefined {
  return MODULE_REGISTRY.find((m) => m.name === name)
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

// Parse a simple YAML key: value from a block's yaml string
function extractYamlValue(yaml: string, key: string): string {
  const lines = yaml.split('\n')
  const keyLine = lines.findIndex((l) => l.startsWith(key + ':'))
  if (keyLine === -1) return ''
  const firstVal = lines[keyLine].slice(key.length + 1).trim().replace(/^["']|["']$/g, '')
  // If multiline block scalar, collect indented lines
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

// Replace/set a key's value in a YAML string
function setYamlValue(yaml: string, key: string, newValue: string): string {
  const lines = yaml.split('\n')
  const keyLine = lines.findIndex((l) => l.startsWith(key + ':'))
  const isMultiline = newValue.includes('\n')

  if (keyLine === -1) {
    // Append
    if (isMultiline) {
      return yaml + `\n${key}: |\n` + newValue.split('\n').map((l) => '  ' + l).join('\n') + '\n'
    }
    return yaml + `\n${key}: "${newValue}"\n`
  }

  const firstVal = lines[keyLine].slice(key.length + 1).trim()
  const isCurrentBlock = firstVal === '|' || firstVal === '>'

  if (isCurrentBlock) {
    // Find the end of the block
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

function ModuleCard({
  block,
  onYamlChange,
  onBriefChange,
  onGenerate,
  onRemove,
}: {
  block: ModuleBlock
  onYamlChange: (yaml: string) => void
  onBriefChange: (brief: string) => void
  onGenerate: () => void
  onRemove: () => void
}) {
  const def = getModuleDef(block.name)
  const [rawMode, setRawMode] = useState(false)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{def?.label ?? block.name}</span>
        <div className={styles.cardActions}>
          <button
            className={styles.btnSmall}
            onClick={() => setRawMode((v) => !v)}
            title="Toggle raw YAML"
          >
            {rawMode ? 'Fields' : 'YAML'}
          </button>
          <button className={styles.btnDanger} onClick={onRemove} title="Remove module">
            ✕
          </button>
        </div>
      </div>

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
            if (field.type === 'events' || field.type === 'array') {
              return (
                <div key={field.key} className={styles.field}>
                  <label className={styles.fieldLabel}>{field.label}</label>
                  <textarea
                    className={styles.textarea}
                    value={block.yaml}
                    onChange={(e) => onYamlChange(e.target.value)}
                    rows={12}
                    spellCheck={false}
                    placeholder="YAML list format"
                  />
                </div>
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

        <div className={styles.generateRow}>
          <textarea
            className={styles.briefTextarea}
            value={block.brief}
            onChange={(e) => onBriefChange(e.target.value)}
            placeholder="Describe what this module should cover — AI will generate content from your brief…"
            rows={2}
          />
          <button
            className={styles.btnGenerate}
            onClick={onGenerate}
            disabled={block.generating || !block.brief.trim()}
          >
            {block.generating ? (
              <span className={styles.spinner}>Generating…</span>
            ) : (
              '✨ Generate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EditorClient({ initialContent }: Props) {
  const [blocks, setBlocks] = useState<ModuleBlock[]>(() =>
    extractModuleBlocks(initialContent).map((b) => ({
      ...b,
      brief: '',
      generating: false,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [addingModule, setAddingModule] = useState(false)

  const existingNames = new Set(blocks.map((b) => b.name))
  const availableToAdd = AVAILABLE_MODULES.filter((n) => !existingNames.has(n))

  const updateBlock = useCallback((idx: number, patch: Partial<ModuleBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
  }, [])

  const removeBlock = useCallback((idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const addModule = useCallback((name: string) => {
    setBlocks((prev) => [...prev, { name, yaml: '', brief: '', generating: false }])
    setAddingModule(false)
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
          }),
        })
        if (!res.ok) throw new Error('Generate request failed')
        const { yaml } = await res.json() as { yaml: string }
        updateBlock(idx, { yaml, generating: false })
      } catch {
        updateBlock(idx, { generating: false })
        alert('Generation failed. Check your ANTHROPIC_API_KEY.')
      }
    },
    [blocks, updateBlock]
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      const rawContent = serializeModuleArray(blocks)
      const res = await fetch('/api/newsletter', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawContent }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <h1 className={styles.topBarTitle}>Newsletter Editor</h1>
        <div className={styles.topBarActions}>
          {saveStatus === 'saved' && <span className={styles.savedMsg}>Saved ✓</span>}
          {saveStatus === 'error' && <span className={styles.errorMsg}>Save failed</span>}
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link href="/newsletter/preview" className={styles.btnPreview}>
            Preview →
          </Link>
        </div>
      </div>

      <div className={styles.modules}>
        {blocks.map((block, idx) => (
          <ModuleCard
            key={`${block.name}-${idx}`}
            block={block}
            onYamlChange={(yaml) => updateBlock(idx, { yaml })}
            onBriefChange={(brief) => updateBlock(idx, { brief })}
            onGenerate={() => handleGenerate(idx)}
            onRemove={() => removeBlock(idx)}
          />
        ))}
      </div>

      <div className={styles.addModuleRow}>
        {addingModule ? (
          <div className={styles.addModuleDropdown}>
            {availableToAdd.length === 0 ? (
              <span className={styles.noModules}>All modules already added</span>
            ) : (
              availableToAdd.map((name) => {
                const def = getModuleDef(name)
                return (
                  <button
                    key={name}
                    className={styles.addModuleOption}
                    onClick={() => addModule(name)}
                  >
                    {def?.label ?? name}
                  </button>
                )
              })
            )}
            <button className={styles.btnSmall} onClick={() => setAddingModule(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className={styles.btnAddModule} onClick={() => setAddingModule(true)}>
            + Add Module
          </button>
        )}
      </div>
    </div>
  )
}
