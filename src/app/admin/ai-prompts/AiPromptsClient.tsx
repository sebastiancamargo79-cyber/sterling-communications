'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Container from '@/components/Container'
import { type ModuleDef } from '@/lib/module-registry'

interface Props {
  modules: ModuleDef[]
}

interface PromptRow {
  moduleName: string
  promptText: string
}

export default function AiPromptsClient({ modules }: Props) {
  const [globalPrompts, setGlobalPrompts] = useState<Record<string, string>>({})
  const [editingModule, setEditingModule] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/ai-prompts')
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {}
        data.prompts?.forEach((p: PromptRow) => {
          map[p.moduleName] = p.promptText
        })
        setGlobalPrompts(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleEdit = (mod: ModuleDef) => {
    setEditingModule(mod.name)
    setEditText(globalPrompts[mod.name] ?? mod.aiPromptTemplate)
  }

  const handleSave = async (moduleName: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/ai-prompts/${moduleName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: editText }),
      })
      if (!res.ok) throw new Error()
      setGlobalPrompts((prev) => ({ ...prev, [moduleName]: editText }))
      setEditingModule(null)
      toast.success(`Default prompt saved for ${moduleName}`)
    } catch {
      toast.error('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '48px 0' }}>
      <Container>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--text)' }}>
            AI Prompt Defaults
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '4px' }}>
            Set global default prompts for each module. Clients can override these per-client in the editor.
          </p>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {modules.map((mod) => {
              const hasOverride = mod.name in globalPrompts
              const isEditing = editingModule === mod.name

              return (
                <div
                  key={mod.name}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--borderLight)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isEditing ? '1rem' : 0 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
                        {mod.label}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: '0.75rem', fontFamily: 'monospace' }}>
                        {mod.name}
                      </span>
                      {hasOverride && (
                        <span style={{
                          marginLeft: '0.75rem',
                          padding: '2px 8px',
                          background: 'rgba(79,70,229,0.08)',
                          color: 'var(--accent)',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                        }}>
                          Customised
                        </span>
                      )}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => handleEdit(mod)}
                        style={{
                          padding: '4px 14px',
                          background: 'transparent',
                          color: 'var(--primary)',
                          border: '1px solid var(--borderLight)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={8}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--borderLight)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontFamily: "'SF Mono', 'Fira Code', monospace",
                          color: 'var(--text)',
                          resize: 'vertical',
                          lineHeight: 1.6,
                          marginBottom: '0.75rem',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleSave(mod.name)}
                          disabled={saving}
                          style={{
                            padding: '8px 18px',
                            background: 'var(--primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            opacity: saving ? 0.6 : 1,
                          }}
                        >
                          {saving ? 'Saving…' : 'Save Default'}
                        </button>
                        <button
                          onClick={() => {
                            setEditText(mod.aiPromptTemplate)
                          }}
                          style={{
                            padding: '8px 14px',
                            background: 'transparent',
                            color: 'var(--muted)',
                            border: '1px solid var(--borderLight)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          Reset to Built-in
                        </button>
                        <button
                          onClick={() => setEditingModule(null)}
                          style={{
                            padding: '8px 14px',
                            background: 'transparent',
                            color: 'var(--muted)',
                            border: 'none',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </main>
  )
}
