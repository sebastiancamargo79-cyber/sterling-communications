import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const isPdf = file.type === 'application/pdf' || file.type === 'application/octet-stream' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json({ error: `Only PDF files are allowed (got type: ${file.type})` }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`brand-studio-pdfs/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })

    return NextResponse.json({ url: blob.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Upload failed: ${msg}` }, { status: 500 })
  }
}
