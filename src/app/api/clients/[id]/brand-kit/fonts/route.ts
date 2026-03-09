export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { db } from '@/db'
import { brandKits } from '@/db/schema'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const formData = await request.formData()
    const fontType = formData.get('fontType') as string | null
    const file = formData.get('file') as File | null

    if (!fontType || !['heading', 'body'].includes(fontType)) {
      return NextResponse.json(
        { error: 'fontType must be "heading" or "body"' },
        { status: 400 }
      )
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'file is missing or not a File' },
        { status: 400 }
      )
    }

    // Find existing brand kit
    const existing = await db.query.brandKits.findFirst({
      where: eq(brandKits.clientId, id),
    })

    if (!existing) {
      return NextResponse.json({ error: 'Brand kit not found' }, { status: 404 })
    }

    // Upload font to Vercel Blob
    let fontUrl: string
    try {
      const timestamp = Date.now()
      const ext = file.name.split('.').pop() || 'woff2'
      const blob = await put(
        `fonts/${id}/${fontType}-${timestamp}.${ext}`,
        file,
        { access: 'public' }
      )
      fontUrl = blob.url
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return NextResponse.json(
        { error: `[blob-upload] ${msg}` },
        { status: 500 }
      )
    }

    // Update brand kit with new font URL
    const updateData: Record<string, any> = {}
    if (fontType === 'heading') {
      updateData.fontHeadingUrl = fontUrl
    } else {
      updateData.fontBodyUrl = fontUrl
    }

    const [updated] = await db
      .update(brandKits)
      .set(updateData)
      .where(eq(brandKits.id, existing.id))
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}
