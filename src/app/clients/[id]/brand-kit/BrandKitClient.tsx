'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { brandKits } from '@/db/schema'

type BrandKit = typeof brandKits.$inferSelect | null

interface Props {
  clientId: string
  clientName: string
  brandKit: BrandKit
}

export default function BrandKitClient({ clientId, clientName, brandKit }: Props) {
  const [primaryColor, setPrimaryColor] = useState(brandKit?.primaryColor || '#006938')
  const [secondaryColor, setSecondaryColor] = useState(brandKit?.secondaryColor || '#1a5c38')
  const [logoUrl, setLogoUrl] = useState(brandKit?.logoUrl || '')
  const [fontHeadingUrl, setFontHeadingUrl] = useState(brandKit?.fontHeadingUrl || '')
  const [fontBodyUrl, setFontBodyUrl] = useState(brandKit?.fontBodyUrl || '')

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFont, setUploadingFont] = useState<'heading' | 'body' | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const fontHeadingInputRef = useRef<HTMLInputElement>(null)
  const fontBodyInputRef = useRef<HTMLInputElement>(null)

  const handleSaveColors = async () => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor,
          secondaryColor,
        }),
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/clients/${clientId}/brand-kit`, {
        method: 'PUT',
        body: formData as any, // FormData with logo upload
      })

      if (!res.ok) throw new Error('Logo upload failed')
      const { logoUrl: newUrl } = await res.json()
      setLogoUrl(newUrl)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleFontUpload = async (type: 'heading' | 'body', file: File) => {
    setUploadingFont(type)
    try {
      const formData = new FormData()
      formData.append('fontType', type)
      formData.append('file', file)

      const res = await fetch(`/api/clients/${clientId}/brand-kit/fonts`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Font upload failed')
      const updated = await res.json()

      if (type === 'heading') {
        setFontHeadingUrl(updated.fontHeadingUrl || '')
      } else {
        setFontBodyUrl(updated.fontBodyUrl || '')
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setUploadingFont(null)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '2rem', fontSize: '14px', color: '#666' }}>
        <Link href="/clients" style={{ color: '#10263B' }}>Clients</Link> ›
        <Link href={`/clients/${clientId}`} style={{ marginLeft: '0.5rem', color: '#10263B' }}>{clientName}</Link> ›
        <span style={{ marginLeft: '0.5rem' }}>Brand Kit</span>
      </div>

      <h1 style={{ marginBottom: '2rem', color: '#10263B' }}>Brand Kit — {clientName}</h1>

      {/* Status messages */}
      {saveStatus === 'saved' && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '4px' }}>
          Saved ✓
        </div>
      )}
      {saveStatus === 'error' && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
          Save failed. Please try again.
        </div>
      )}

      {/* Colors Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '1rem', color: '#10263B' }}>Colors</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Primary Color
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: '60px', height: '60px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#006938"
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Secondary Color
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              style={{ width: '60px', height: '60px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              placeholder="#1a5c38"
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            />
          </div>
        </div>

        <button
          onClick={handleSaveColors}
          disabled={saving}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#10263B',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Colors'}
        </button>
      </section>

      {/* Logo Section */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '1rem', color: '#10263B' }}>Logo</h2>

        {logoUrl && (
          <div style={{ marginBottom: '1rem' }}>
            <img
              src={logoUrl}
              alt="Logo"
              style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain' }}
            />
          </div>
        )}

        <div
          onClick={() => logoInputRef.current?.click()}
          style={{
            padding: '2rem',
            border: '2px dashed #ddd',
            borderRadius: '4px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#f9f9f9',
          }}
        >
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            disabled={uploadingLogo}
            style={{ display: 'none' }}
          />
          <p style={{ margin: 0, color: '#666' }}>
            {uploadingLogo ? 'Uploading…' : 'Click to upload logo image'}
          </p>
        </div>
      </section>

      {/* Fonts Section */}
      <section>
        <h2 style={{ fontSize: '18px', marginBottom: '1rem', color: '#10263B' }}>Fonts</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Heading Font
          </label>
          <div
            onClick={() => fontHeadingInputRef.current?.click()}
            style={{
              padding: '1.5rem',
              border: '2px dashed #ddd',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f9f9f9',
            }}
          >
            <input
              ref={fontHeadingInputRef}
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFontUpload('heading', file)
              }}
              disabled={uploadingFont === 'heading'}
              style={{ display: 'none' }}
            />
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {uploadingFont === 'heading' ? 'Uploading…' : fontHeadingUrl ? `Uploaded: ${fontHeadingUrl.split('/').pop()}` : 'Click to upload heading font'}
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Body Font
          </label>
          <div
            onClick={() => fontBodyInputRef.current?.click()}
            style={{
              padding: '1.5rem',
              border: '2px dashed #ddd',
              borderRadius: '4px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f9f9f9',
            }}
          >
            <input
              ref={fontBodyInputRef}
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFontUpload('body', file)
              }}
              disabled={uploadingFont === 'body'}
              style={{ display: 'none' }}
            />
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {uploadingFont === 'body' ? 'Uploading…' : fontBodyUrl ? `Uploaded: ${fontBodyUrl.split('/').pop()}` : 'Click to upload body font'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
