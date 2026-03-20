'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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

const SYSTEM_NAMES = ['Meta', 'Cover', 'DirectorUpdate', 'Events', 'ClientStory', 'StaffSpotlight', 'Tips', 'Community']

function ModuleForm({
  initialName,
  initialLabel,
  initialFields,
  initialAiPrompt,
  isEdit,
  editId,
  onDone,
  onCancel,
}: {
  initialName: string
  initialLabel: string
  initialFields: FieldRow[]
  initialAiPrompt: string
  isEdit: boolean
  editId?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(initialName)
  const [label, setLabel] = useState(initialLabel)
  const [aiPrompt, setAiPrompt] = useState(initialAiPrompt)
  const [fields, setFields] = useState<FieldRow[]>(
    initialFields.length > 0 ? initialFields : [{ key: '', label: '', type: 'text' }]
  )

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

  async function handleSubmit() {
    setError(null)
    if (!name.trim() || !label.trim()) {
      setError('Name and label are required.')
      return
    }
    const validFields = fields.filter((f) => f.key.trim())
    if (validFields.length === 0) {
      setError('At least one field is required.')
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && editId) {
        const res = await fetch(`/api/admin/modules/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: label.trim(), fields: validFields, aiPrompt }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body?.error ?? 'Failed to update module.')
          return
        }
        toast.success('Module updated')
      } else {
        const res = await fetch('/api/admin/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            label: label.trim(),
            storageKey,
            fields: validFields,
            aiPrompt,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body?.error ?? 'Failed to create module.')
          return
        }
        toast.success('Module created')
      }
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.createForm}>
      <h2 className={styles.formTitle}>{isEdit ? 'Edit Module' : 'New Module'}</h2>

      <div className={styles.formRow}>
        <label className={styles.formLabel}>Module Name</label>
        <input
          className={styles.formInput}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. FamilyUpdate"
          readOnly={isEdit}
        />
        {!isEdit && <span className={styles.formHint}>Used in :::module:Name blocks</span>}
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

      {!isEdit && (
        <div className={styles.formRow}>
          <label className={styles.formLabel}>Storage Key (auto)</label>
          <input className={styles.formInput} type="text" value={storageKey} readOnly />
        </div>
      )}

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
        <button className={styles.btnCreate} onClick={handleSubmit} disabled={submitting}>
          {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Module')}
        </button>
        <button className={styles.btnCancelForm} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function ModulesClient({ modules }: Props) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleDef | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const systemModules = modules.filter((m) => SYSTEM_NAMES.includes(m.name))
  const customModules = modules.filter((m) => !SYSTEM_NAMES.includes(m.name))

  async function handleDelete(moduleName: string) {
    // Find the module def to get DB id — we need to find it from the custom modules
    // The API uses the module_definitions id, which we don't have directly.
    // We'll fetch via name from the GET endpoint then delete.
    setDeleting(true)
    try {
      // Fetch modules to find the DB ID
      const listRes = await fetch('/api/admin/modules')
      const listData = await listRes.json()
      // The admin GET returns modules from getAllModuleDefs which includes DB entries
      // We need the actual DB entry. Let's query the DB modules directly.
      const dbRes = await fetch('/api/admin/modules')
      const dbData = await dbRes.json()

      // We need to find the module with matching name from DB
      // Since we don't have the DB id exposed, let's add it to the API response
      // For now, we'll search by name using a different approach
      // Actually, let's use the module name to find the DB record
      // We need to update the modules API to return IDs...

      // Alternative: search for the module by filtering custom modules
      // The moduleDefinitions table has an id field. Let's fetch it.
      const searchRes = await fetch(`/api/admin/modules/${encodeURIComponent(moduleName)}`, {
        method: 'DELETE',
      })
      if (!searchRes.ok) {
        const body = await searchRes.json().catch(() => ({}))
        toast.error(body?.error ?? 'Failed to delete module')
        return
      }
      toast.success('Module deleted')
      setDeleteConfirm(null)
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className={styles.main}>
      <Container>
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>Newsletter Modules</h1>
          </div>
          {!creating && !editingModule && (
            <button className={styles.btnNew} onClick={() => setCreating(true)}>
              + Create Module
            </button>
          )}
        </div>

        {creating && (
          <ModuleForm
            initialName=""
            initialLabel=""
            initialFields={[]}
            initialAiPrompt=""
            isEdit={false}
            onDone={() => { setCreating(false); router.refresh() }}
            onCancel={() => setCreating(false)}
          />
        )}

        {editingModule && (
          <ModuleForm
            initialName={editingModule.name}
            initialLabel={editingModule.label}
            initialFields={(editingModule.fields ?? []).map((f) => ({
              key: f.key,
              label: f.label,
              type: f.type,
            }))}
            initialAiPrompt={editingModule.aiPromptTemplate}
            isEdit={true}
            editId={editingModule.name}
            onDone={() => { setEditingModule(null); router.refresh() }}
            onCancel={() => setEditingModule(null)}
          />
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
                  <div className={styles.moduleActions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => { setCreating(false); setEditingModule(m) }}
                    >
                      Edit
                    </button>
                    {deleteConfirm === m.name ? (
                      <span className={styles.deleteConfirm}>
                        <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>Delete?</span>
                        <button
                          className={styles.btnDeleteConfirm}
                          onClick={() => handleDelete(m.name)}
                          disabled={deleting}
                        >
                          {deleting ? '…' : 'Yes'}
                        </button>
                        <button
                          className={styles.btnCancelDelete}
                          onClick={() => setDeleteConfirm(null)}
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        className={styles.btnDelete}
                        onClick={() => setDeleteConfirm(m.name)}
                      >
                        Delete
                      </button>
                    )}
                    <span className={styles.badgeCustom}>Custom</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </main>
  )
}
