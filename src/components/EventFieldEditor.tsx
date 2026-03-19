'use client'

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

interface Props {
  events: EventItem[]
  onChange: (events: EventItem[]) => void
}

const labelStyle = {
  fontSize: '0.72rem',
  fontWeight: 600 as const,
  color: '#5a6a7a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  marginBottom: '0.2rem',
}

const inputStyle = {
  width: '100%',
  padding: '0.45rem 0.7rem',
  border: '1px solid #e8e0d4',
  borderRadius: '6px',
  fontSize: '0.85rem',
  color: '#10263B',
  outline: 'none',
}

export default function EventFieldEditor({ events, onChange }: Props) {
  const update = (idx: number, patch: Partial<EventItem>) => {
    const next = events.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    onChange(next)
  }

  const remove = (idx: number) => {
    onChange(events.filter((_, i) => i !== idx))
  }

  const addEvent = () => {
    onChange([...events, { type: 'event', title: '', date: '', time: '', location: '', description: '' }])
  }

  const addPhoto = () => {
    onChange([...events, { type: 'photo', image_url: '', caption: '' }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Events</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {events.map((event, idx) => (
          <div
            key={idx}
            style={{
              background: '#fff',
              border: '1px solid #e8e0d4',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={event.type}
                  onChange={(e) => {
                    const newType = e.target.value
                    if (newType === 'photo') {
                      update(idx, { type: 'photo', image_url: event.image_url ?? '', caption: event.caption ?? '' })
                    } else {
                      update(idx, { type: 'event', title: event.title ?? '', date: event.date ?? '', time: event.time ?? '', location: event.location ?? '', description: event.description ?? '' })
                    }
                  }}
                  style={{
                    padding: '0.3rem 0.5rem',
                    border: '1px solid #e8e0d4',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#10263B',
                    background: '#f9f8f6',
                  }}
                >
                  <option value="event">Event</option>
                  <option value="photo">Photo</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#5a6a7a' }}>#{idx + 1}</span>
              </div>
              {events.length > 1 && (
                <button
                  onClick={() => remove(idx)}
                  style={{
                    padding: '0.2rem 0.5rem',
                    background: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #e8e0d4',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                >
                  ✕
                </button>
              )}
            </div>

            {event.type === 'photo' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <div style={labelStyle}>Image URL</div>
                  <input style={inputStyle} value={event.image_url ?? ''} onChange={(e) => update(idx, { image_url: e.target.value })} placeholder="https://…" />
                </div>
                <div>
                  <div style={labelStyle}>Caption</div>
                  <input style={inputStyle} value={event.caption ?? ''} onChange={(e) => update(idx, { caption: e.target.value })} />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <div style={labelStyle}>Title</div>
                  <input style={inputStyle} value={event.title ?? ''} onChange={(e) => update(idx, { title: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <div style={labelStyle}>Date</div>
                    <input style={inputStyle} value={event.date ?? ''} onChange={(e) => update(idx, { date: e.target.value })} placeholder="Day DD Month YYYY" />
                  </div>
                  <div>
                    <div style={labelStyle}>Time</div>
                    <input style={inputStyle} value={event.time ?? ''} onChange={(e) => update(idx, { time: e.target.value })} placeholder="10:00 am – 2:00 pm" />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Location</div>
                  <input style={inputStyle} value={event.location ?? ''} onChange={(e) => update(idx, { location: e.target.value })} />
                </div>
                <div>
                  <div style={labelStyle}>Description</div>
                  <input style={inputStyle} value={event.description ?? ''} onChange={(e) => update(idx, { description: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={addEvent}
            style={{
              padding: '0.35rem 0.9rem',
              background: 'transparent',
              color: '#B8965A',
              border: '1px dashed #B8965A',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            + Add Event
          </button>
          <button
            onClick={addPhoto}
            style={{
              padding: '0.35rem 0.9rem',
              background: 'transparent',
              color: '#B8965A',
              border: '1px dashed #B8965A',
              borderRadius: '6px',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            + Add Photo
          </button>
        </div>
      </div>
    </div>
  )
}
