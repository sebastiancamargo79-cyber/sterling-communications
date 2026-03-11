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
  const [bgColor, setBgColor] = useState(brandKit?.bgColor || '#f5f5f0')
  const [accentColor, setAccentColor] = useState(brandKit?.accentColor || '#1a5c38')
  const [logoUrl, setLogoUrl] = useState(brandKit?.logoUrl || '')
  const [fontHeadingUrl, setFontHeadingUrl] = useState(brandKit?.fontHeadingUrl || '')
  const [fontBodyUrl, setFontBodyUrl] = useState(brandKit?.fontBodyUrl || '')
  const [fontHeadingName, setFontHeadingName] = useState(brandKit?.fontHeadingName || '')
  const [fontBodyName, setFontBodyName] = useState(brandKit?.fontBodyName || '')

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFont, setUploadingFont] = useState<'heading' | 'body' | null>(null)

  const [extracting, setExtracting] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [pdfUrl, setPdfUrl] = useState(brandKit?.guidelinesPdfUrl || '')

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
          bgColor,
          accentColor,
          fontHeadingName,
          fontBodyName,
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

  const handleExtractBrandKit = async () => {
    if (!pdfUrl) {
      setSaveStatus('error')
      return
    }

    setExtracting(true)
    setSaveStatus('idle')
    try {
      const res = await fetch(`/api/clients/${clientId}/brand-kit/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl }),
      })

      if (!res.ok) throw new Error('Extraction failed')
      const data = await res.json()
      setExtractedData(data)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setExtracting(false)
    }
  }

  const handleApplyExtractedData = () => {
    if (!extractedData) return

    if (extractedData.primaryColor) setPrimaryColor(extractedData.primaryColor)
    if (extractedData.secondaryColor) setSecondaryColor(extractedData.secondaryColor)
    if (extractedData.bgColor) setBgColor(extractedData.bgColor)
    if (extractedData.accentColor) setAccentColor(extractedData.accentColor)
    if (extractedData.fontHeadingName) setFontHeadingName(extractedData.fontHeadingName)
    if (extractedData.fontBodyName) setFontBodyName(extractedData.fontBodyName)
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

      {/* PDF Extraction Section */}
      <section style={{ marginBottom: '3rem', padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '1rem', color: '#10263B' }}>Extract from Brand Guidelines PDF</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', color: '#666' }}>
            PDF URL (or paste Blob URL after upload)
          </label>
          <input
            type="text"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <button
          onClick={handleExtractBrandKit}
          disabled={extracting || !pdfUrl}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#B8965A',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            cursor: extracting || !pdfUrl ? 'not-allowed' : 'pointer',
            opacity: extracting || !pdfUrl ? 0.6 : 1,
            marginBottom: extractedData ? '1rem' : 0,
          }}
        >
          {extracting ? 'Extracting…' : 'Extract ▶'}
        </button>

        {extractedData && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '14px', fontWeight: 600, color: '#333' }}>Extracted Brand Colors & Fonts</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {extractedData.primaryColor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: extractedData.primaryColor, borderRadius: '4px', border: '1px solid #ddd' }} />
                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>Primary: {extractedData.primaryColor}</span>
                  </div>
                )}
                {extractedData.secondaryColor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: extractedData.secondaryColor, borderRadius: '4px', border: '1px solid #ddd' }} />
                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>Secondary: {extractedData.secondaryColor}</span>
                  </div>
                )}
                {extractedData.bgColor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: extractedData.bgColor, borderRadius: '4px', border: '1px solid #ddd' }} />
                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>BG: {extractedData.bgColor}</span>
                  </div>
                )}
                {extractedData.accentColor && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', backgroundColor: extractedData.accentColor, borderRadius: '4px', border: '1px solid #ddd' }} />
                    <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>Accent: {extractedData.accentColor}</span>
                  </div>
                )}
              </div>
              {(extractedData.fontHeadingName || extractedData.fontBodyName) && (
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {extractedData.fontHeadingName && <p style={{ margin: '0.25rem 0' }}>Heading: <strong>{extractedData.fontHeadingName}</strong></p>}
                  {extractedData.fontBodyName && <p style={{ margin: '0.25rem 0' }}>Body: <strong>{extractedData.fontBodyName}</strong></p>}
                </div>
              )}
            </div>
            <button
              onClick={handleApplyExtractedData}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#10263B',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Apply to Brand Kit
            </button>
          </div>
        )}
      </section>

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

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Newsletter Background
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ width: '60px', height: '60px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              placeholder="#f5f5f0"
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
            Divider Lines
          </label>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{ width: '60px', height: '60px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
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
          {saving ? 'Saving…' : 'Save All'}
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

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Heading Font
          </label>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '13px', color: '#666' }}>
              Google Font Name (e.g. "Instrument Serif")
            </label>
            <input
              type="text"
              value={fontHeadingName}
              onChange={(e) => setFontHeadingName(e.target.value)}
              placeholder="e.g. Instrument Serif"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem', fontSize: '13px', color: '#999' }}>
            — or upload a font file —
          </div>

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
              {uploadingFont === 'heading' ? 'Uploading…' : fontHeadingUrl ? `Uploaded: ${fontHeadingUrl.split('/').pop()}` : 'Click to upload heading font (.woff2, .woff, .ttf, .otf)'}
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#333' }}>
            Body Font
          </label>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '13px', color: '#666' }}>
              Google Font Name (e.g. "Plus Jakarta Sans")
            </label>
            <input
              type="text"
              value={fontBodyName}
              onChange={(e) => setFontBodyName(e.target.value)}
              placeholder="e.g. Plus Jakarta Sans"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '0.5rem', fontSize: '13px', color: '#999' }}>
            — or upload a font file —
          </div>

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
              {uploadingFont === 'body' ? 'Uploading…' : fontBodyUrl ? `Uploaded: ${fontBodyUrl.split('/').pop()}` : 'Click to upload body font (.woff2, .woff, .ttf, .otf)'}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
