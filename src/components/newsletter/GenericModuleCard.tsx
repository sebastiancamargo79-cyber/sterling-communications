import matter from 'gray-matter'

interface Props {
  moduleName: string
  label: string
  yaml: string
}

export default function GenericModuleCard({ moduleName, label, yaml }: Props) {
  let fields: Record<string, unknown> = {}
  try {
    const { data } = matter(`---\n${yaml}---`)
    fields = data
  } catch {
    // If YAML parsing fails, show raw
  }

  const entries = Object.entries(fields)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--brand-accent, #1a5c38)',
        borderRadius: 'var(--brand-radius, 6px)',
        padding: '2rem',
        margin: '1rem 0',
        pageBreakInside: 'avoid',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-heading, Georgia, serif)',
          fontSize: 'var(--brand-heading-size, 22px)',
          color: 'var(--brand-primary, #006938)',
          marginBottom: '1rem',
          borderBottom: '2px solid var(--brand-accent, #1a5c38)',
          paddingBottom: '0.5rem',
        }}
      >
        {label}
      </h2>
      {entries.length === 0 ? (
        <p style={{ color: '#5a6a7a', fontStyle: 'italic' }}>No content yet</p>
      ) : (
        <dl style={{ display: 'grid', gap: '0.75rem' }}>
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#5a6a7a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.25rem',
                }}
              >
                {key.replace(/_/g, ' ')}
              </dt>
              <dd style={{ fontSize: 'var(--brand-body-size, 13px)', color: 'var(--brand-text, #10263B)' }}>
                {typeof value === 'string' ? (
                  value.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value}
                      alt={key}
                      style={{ maxWidth: '100%', borderRadius: 'var(--brand-radius, 6px)' }}
                    />
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
                  )
                ) : Array.isArray(value) ? (
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem' }}>
                    {value.map((item, i) => (
                      <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <span>{JSON.stringify(value)}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
