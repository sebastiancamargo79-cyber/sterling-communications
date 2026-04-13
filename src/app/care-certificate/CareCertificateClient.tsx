'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Award, ClipboardCopy, Check, FileText, BookOpen, Loader2 } from 'lucide-react'
import { CARE_CERTIFICATE_STANDARDS, CONTEXT_OPTIONS, type ContextType } from '@/lib/care-certificate-standards'
import styles from './CareCertificateClient.module.css'

// ─── Tab 1: Support Visit Story ─────────────────────────────────────────────

interface StoryFormState {
  observerName: string
  careProfessionalName: string
  clientName: string
  visitDate: string
  visitTime: string
  acpVisitNotes: string
  standards: string
  additionalNotes: string
  pdfFile: File | null
}

function SupportVisitTab() {
  const [form, setForm] = useState<StoryFormState>({
    observerName: '',
    careProfessionalName: '',
    clientName: '',
    visitDate: '',
    visitTime: '',
    acpVisitNotes: '',
    standards: '',
    additionalNotes: '',
    pdfFile: null,
  })
  const [loading, setLoading] = useState(false)
  const [story, setStory] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  function set(field: keyof StoryFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, pdfFile: file }))
    setFileName(file?.name ?? null)
  }

  async function handleGenerate() {
    if (!form.observerName || !form.careProfessionalName || !form.clientName || !form.visitDate || !form.acpVisitNotes || !form.standards) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    setStory('')

    try {
      const fd = new FormData()
      fd.append('observerName', form.observerName)
      fd.append('careProfessionalName', form.careProfessionalName)
      fd.append('clientName', form.clientName)
      fd.append('visitDate', form.visitDate)
      fd.append('visitTime', form.visitTime)
      fd.append('acpVisitNotes', form.acpVisitNotes)
      fd.append('standards', form.standards)
      if (form.additionalNotes) fd.append('additionalNotes', form.additionalNotes)
      if (form.pdfFile) fd.append('pdfFile', form.pdfFile)

      const res = await fetch('/api/care-certificate/generate-story', {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Generation failed')
      }

      const data = await res.json()
      setStory(data.story ?? '')
      toast.success('Observation story generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed. Check ANTHROPIC_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!story) return
    await navigator.clipboard.writeText(story)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <p className={styles.sectionLabel}>Visit &amp; Observer Details</p>

      <div className={styles.formGrid}>
        <LabeledInput label="Observer Name *" value={form.observerName} onChange={(v) => set('observerName', v)} placeholder="e.g. Michelle Cullen" />
        <LabeledInput label="Care Professional Observed *" value={form.careProfessionalName} onChange={(v) => set('careProfessionalName', v)} placeholder="e.g. Monika Sitarz" />
        <LabeledInput label="Client Name *" value={form.clientName} onChange={(v) => set('clientName', v)} placeholder="e.g. Ruby C" />
        <LabeledInput label="Visit Date *" value={form.visitDate} type="date" onChange={(v) => set('visitDate', v)} />
        <LabeledInput label="Visit Time" value={form.visitTime} onChange={(v) => set('visitTime', v)} placeholder="e.g. lunch / 13:30" />
      </div>

      <div className={styles.textareaWrapper}>
        <label className={styles.textareaLabel}>ACP Visit Notes *</label>
        <textarea
          className={styles.textarea}
          rows={8}
          placeholder="Paste the ACP visit notes here. It doesn't matter if the text looks messy — AI will sort it out."
          value={form.acpVisitNotes}
          onChange={(e) => set('acpVisitNotes', e.target.value)}
        />
      </div>

      <div className={styles.formFull}>
        <label className={styles.textareaLabel}>Handwritten Support Visit Notes (PDF, optional)</label>
        <div
          style={{
            marginTop: 6,
            padding: '12px 16px',
            background: 'var(--bg-elevated)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
          }}
          onClick={() => fileRef.current?.click()}
        >
          <FileText size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.875rem', color: fileName ? 'var(--text)' : 'var(--muted)' }}>
            {fileName ?? 'Click to upload handwritten observation PDF'}
          </span>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      </div>

      <div className={styles.textareaWrapper}>
        <label className={styles.textareaLabel}>Care Certificate Standards Observed *</label>
        <textarea
          className={styles.textarea}
          rows={2}
          placeholder="e.g. 1.1c, 4.2b, 5.6a, 7.2a, 8.3a"
          value={form.standards}
          onChange={(e) => set('standards', e.target.value)}
        />
      </div>

      <div className={styles.textareaWrapper}>
        <label className={styles.textareaLabel}>Additional Notes (optional)</label>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder="Any extra context for the AI…"
          value={form.additionalNotes}
          onChange={(e) => set('additionalNotes', e.target.value)}
        />
      </div>

      <div className={styles.generateRow}>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 22px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'background 0.15s',
          }}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading && <span className={styles.spinner} />}
          {loading ? 'Generating…' : 'Generate Observation Story'}
        </button>
      </div>

      {story && (
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <span className={styles.outputTitle}>Generated Observation Story</span>
            <button className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`} onClick={handleCopy}>
              {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <textarea
            className={`${styles.textarea} ${styles.textareaReadonly}`}
            rows={20}
            readOnly
            value={story}
          />
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Section 3 Builder ────────────────────────────────────────────────

interface Section3Row {
  ref: string
  description: string
  checked: boolean
  date: string
  context: ContextType
}

interface GeneratedResponse {
  ref: string
  response: string
}

function Section3Tab() {
  const [careProName, setCareProName] = useState('')
  const [rows, setRows] = useState<Section3Row[]>(
    CARE_CERTIFICATE_STANDARDS.map((s) => ({
      ref: s.ref,
      description: s.description,
      checked: false,
      date: '',
      context: s.defaultContext,
    }))
  )
  const [loading, setLoading] = useState(false)
  const [responses, setResponses] = useState<GeneratedResponse[]>([])
  const [copiedAll, setCopiedAll] = useState(false)
  const [copiedRefs, setCopiedRefs] = useState<Set<string>>(new Set())

  function toggleRow(index: number) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, checked: !r.checked } : r)))
  }

  function setDate(index: number, date: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, date } : r)))
  }

  function setContext(index: number, context: ContextType) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, context } : r)))
  }

  function selectAll() {
    setRows((prev) => prev.map((r) => ({ ...r, checked: true })))
  }

  function clearAll() {
    setRows((prev) => prev.map((r) => ({ ...r, checked: false })))
  }

  const checkedCount = rows.filter((r) => r.checked).length

  async function handleGenerate() {
    if (!careProName.trim()) {
      toast.error('Please enter the Care Professional name')
      return
    }
    const selected = rows.filter((r) => r.checked)
    if (selected.length === 0) {
      toast.error('Please select at least one standard')
      return
    }
    const missingDate = selected.find((r) => !r.date)
    if (missingDate) {
      toast.error(`Please add a date for standard ${missingDate.ref}`)
      return
    }

    setLoading(true)
    setResponses([])

    try {
      const res = await fetch('/api/care-certificate/generate-section3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          careProName,
          entries: selected.map((r) => ({
            ref: r.ref,
            description: r.description,
            date: r.date,
            context: r.context,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Generation failed')
      }

      const data = await res.json()
      setResponses(data.responses ?? [])
      toast.success('Section 3 responses generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed. Check ANTHROPIC_API_KEY.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyAll() {
    if (responses.length === 0) return
    const text = responses.map((r) => `${r.ref}\n${r.response}`).join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopiedAll(true)
    toast.success('All responses copied')
    setTimeout(() => setCopiedAll(false), 2000)
  }

  async function handleCopyOne(ref: string, response: string) {
    await navigator.clipboard.writeText(response)
    setCopiedRefs((prev) => new Set(prev).add(ref))
    toast.success(`Copied ${ref}`)
    setTimeout(() => {
      setCopiedRefs((prev) => {
        const next = new Set(prev)
        next.delete(ref)
        return next
      })
    }, 2000)
  }

  return (
    <div>
      <p className={styles.section3Intro}>
        Select the standards that were discussed, enter the date and context for each, then generate professional responses ready to paste into Section 3 of the Assessment Record.
      </p>

      <div className={styles.cpNameRow}>
        <LabeledInput
          label="Care Professional Name *"
          value={careProName}
          onChange={setCareProName}
          placeholder="e.g. Monika Sitarz"
        />
      </div>

      <div className={styles.bulkActions}>
        <button className={styles.selectAllBtn} onClick={selectAll}>Select all</button>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>·</span>
        <button className={styles.selectAllBtn} onClick={clearAll}>Clear all</button>
        {checkedCount > 0 && (
          <span className={styles.selectCount}>{checkedCount} selected</span>
        )}
      </div>

      <div className={styles.section3Header}>
        <span className={styles.section3ColHeader}></span>
        <span className={styles.section3ColHeader}>Standard</span>
        <span className={styles.section3ColHeader}>Description</span>
        <span className={styles.section3ColHeader}>Date</span>
        <span className={styles.section3ColHeader}>Context</span>
      </div>

      {rows.map((row, i) => (
        <div key={row.ref} className={styles.section3Row}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={row.checked}
            onChange={() => toggleRow(i)}
          />
          <span className={`${styles.section3Ref} ${!row.checked ? styles.section3Disabled : ''}`}>
            {row.ref}
          </span>
          <span className={`${styles.section3Desc} ${!row.checked ? styles.section3Disabled : ''}`}>
            {row.description}
          </span>
          <input
            type="date"
            className={`${styles.section3DateInput} ${!row.checked ? styles.section3Disabled : ''}`}
            value={row.date}
            onChange={(e) => setDate(i, e.target.value)}
            disabled={!row.checked}
          />
          <select
            className={`${styles.section3Select} ${!row.checked ? styles.section3Disabled : ''}`}
            value={row.context}
            onChange={(e) => setContext(i, e.target.value as ContextType)}
            disabled={!row.checked}
          >
            {CONTEXT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      ))}

      <div className={styles.generateRow}>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 22px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading && <span className={styles.spinner} />}
          {loading ? 'Generating…' : 'Generate Section 3 Responses'}
        </button>
      </div>

      {responses.length > 0 && (
        <div className={styles.outputSection}>
          <div className={styles.outputHeader}>
            <span className={styles.outputTitle}>Generated Section 3 Responses ({responses.length})</span>
            <button
              className={`${styles.copyBtn} ${copiedAll ? styles.copyBtnSuccess : ''}`}
              onClick={handleCopyAll}
            >
              {copiedAll ? <Check size={13} /> : <ClipboardCopy size={13} />}
              {copiedAll ? 'Copied!' : 'Copy All'}
            </button>
          </div>

          <div className={styles.responseList}>
            {responses.map((r) => (
              <div key={r.ref} className={styles.responseCard}>
                <div className={styles.responseCardHeader}>
                  <span className={styles.responseCardRef}>{r.ref}</span>
                  <button
                    className={`${styles.copyBtn} ${copiedRefs.has(r.ref) ? styles.copyBtnSuccess : ''}`}
                    onClick={() => handleCopyOne(r.ref, r.response)}
                  >
                    {copiedRefs.has(r.ref) ? <Check size={12} /> : <ClipboardCopy size={12} />}
                    {copiedRefs.has(r.ref) ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className={styles.responseCardText}>{r.response}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared helper ───────────────────────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '9px 13px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-body)',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          width: '100%',
        }}
      />
    </div>
  )
}

// ─── Root component ──────────────────────────────────────────────────────────

type Tab = 'story' | 'section3'

export default function CareCertificateClient() {
  const [activeTab, setActiveTab] = useState<Tab>('story')

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Award size={22} />
          </div>
          <h1 className={styles.heading}>Swift Care Certificate</h1>
          <p className={styles.subtitle}>
            Generate CQC-compliant observation stories and Section 3 responses for Care Certificate assessments.
          </p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'story' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('story')}
          >
            <FileText size={14} />
            Support Visit Story
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'section3' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('section3')}
          >
            <BookOpen size={14} />
            Section 3 Builder
          </button>
        </div>

        {activeTab === 'story' && <SupportVisitTab />}
        {activeTab === 'section3' && <Section3Tab />}
      </div>
    </div>
  )
}
