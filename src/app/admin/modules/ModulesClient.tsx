'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Container from '@/components/Container'
import { type ModuleDef } from '@/lib/module-registry'
import styles from './page.module.css'

interface FieldRow {
  key: string
  label: string
  type: string
}

interface Props {
  modules: ModuleDef[]
}

export default function ModulesClient({ modules }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [fields, setFields] = useState<FieldRow[]>([{ key: '', label: '', type: 'text' }])

  const storageKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  function addField() {
    setFields((prev) => [...prev, { key: '', label: '', type: 'text' }])
  }

  function updateField(idx: number, patch: Partial<FieldRow>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)))
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleCreate() {
    setError(null)
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          label: label.trim(),
          storageKey,
          fields: fields.filter((f) => f.key.trim()),
          aiPrompt,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error ?? 'Failed to create module.')
        return
      }
      setCreating(false)
      setName('')
      setLabel('')
      setAiPrompt('')
      setFields([{ key: '', label: '', type: 'text' }])
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const systemModules = modules.filter((m) =>
    ['Meta', 'Cover', 'DirectorUpdate', 'Events', 'ClientStory', 'StaffSpotlight', 'Tips', 'Community'].includes(m.name)
  )
  const customModules = modules.filter((m) =>
    !['Meta', 'Cover', 'DirectorUpdate', 'Events', 'ClientStory', 'StaffSpotlight', 'Tips', 'Community'].includes(m.name)
  )

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <div>
            <a href="/admin" className={styles.back}>← Admin</a>
            <h1 className={styles.heading}>Newsletter Modules</h1>
          </div>
          {!creating && (
            <button className={styles.btnNew} onClick={() => setCreating(true)}>
              + Create Module
            </button>
          )}
        </div>

        {creating && (
          <div className={styles.createForm}>
            <h2 className={styles.formTitle}>New Module</h2>

            <div className={styles.formRow}>
              <label className={styles.formLabel}>Module Name</label>
              <input
                className={styles.formInput}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FamilyUpdate"
              />
              <span className={styles.formHint}>Used in :::module:Name blocks</span>
            </div>

            <div className={styles.formRow}>
              <label className={styles.formLabel}>Display Label</label>
              <input
                className={styles.formInput}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Family Update"
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.formLabel}>Storage Key (auto)</label>
              <input className={styles.formInput} type="text" value={storageKey} readOnly />
            </div>

            <div className={styles.formRow}>
              <label className={styles.formLabel}>Fields</label>
              <div className={styles.fieldsBuilder}>
                {fields.map((field, idx) => (
                  <div key={idx} className={styles.fieldRow}>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      placeholder="key"
                      value={field.key}
                      onChange={(e) => updateField(idx, { key: e.target.value })}
                    />
                    <input
                      className={styles.fieldInput}
                      type="text"
                      placeholder="label"
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                    />
                    <select
                      className={styles.fieldSelect}
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value })}
                    >
                      <option value="text">text</option>
                      <option value="textarea">textarea</option>
                      <option value="url">url</option>
                      <option value="number">number</option>
                      <option value="array">array</option>
                    </select>
                    <button className={styles.btnRemoveField} onClick={() => removeField(idx)}>✕</button>
                  </div>
                ))}
                <button className={styles.btnAddField} onClick={addField}>+ Add Field</button>
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.formLabel}>AI Prompt</label>
              <textarea
                className={styles.formTextarea}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Instructions for the AI to generate this module's YAML content…"
                rows={5}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formActions}>
              <button className={styles.btnCreate} onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Module'}
              </button>
              <button className={styles.btnCancelForm} onClick={() => setCreating(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>System Modules</h2>
          <div className={styles.moduleList}>
            {systemModules.map((m) => (
              <div key={m.name} className={styles.moduleRow}>
                <div>
                  <span className={styles.moduleName}>{m.label}</span>
                  <span className={styles.moduleKey}>:::module:{m.name}</span>
                </div>
                <span className={styles.badgeSystem}>System</span>
              </div>
            ))}
          </div>
        </div>

        {customModules.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Custom Modules</h2>
            <div className={styles.moduleList}>
              {customModules.map((m) => (
                <div key={m.name} className={styles.moduleRow}>
                  <div>
                    <span className={styles.moduleName}>{m.label}</span>
                    <span className={styles.moduleKey}>:::module:{m.name}</span>
                  </div>
                  <span className={styles.badgeCustom}>Custom</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </main>
  )
}
