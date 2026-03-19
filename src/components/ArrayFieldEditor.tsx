'use client'

interface Props {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}

export default function ArrayFieldEditor({ label, values, onChange }: Props) {
  const update = (idx: number, val: string) => {
    const next = [...values]
    next[idx] = val
    onChange(next)
  }

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx))
  }

  const add = () => {
    onChange([...values, ''])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label
        style={{
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#5a6a7a',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {values.map((val, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={val}
              onChange={(e) => update(idx, e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem 0.75rem',
                border: '1px solid #e8e0d4',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#10263B',
                outline: 'none',
              }}
            />
            {values.length > 1 && (
              <button
                onClick={() => remove(idx)}
                style={{
                  padding: '0.3rem 0.6rem',
                  background: 'transparent',
                  color: '#9ca3af',
                  border: '1px solid #e8e0d4',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={add}
          style={{
            alignSelf: 'flex-start',
            padding: '0.35rem 0.9rem',
            background: 'transparent',
            color: '#B8965A',
            border: '1px dashed #B8965A',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          + Add Item
        </button>
      </div>
    </div>
  )
}
