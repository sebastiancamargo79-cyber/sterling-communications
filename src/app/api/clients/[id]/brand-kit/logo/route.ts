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
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'file is missing or not a File' }, { status: 400 })
    }

    const existing = await db.query.brandKits.findFirst({
      where: eq(brandKits.clientId, id),
    })

    if (!existing) {
      return NextResponse.json({ error: 'Brand kit not found' }, { status: 404 })
    }

    const timestamp = Date.now()
    const ext = file.name.split('.').pop() || 'png'
    const blob = await put(`logos/${id}/logo-${timestamp}.${ext}`, file, { access: 'public' })

    const [updated] = await db
      .update(brandKits)
      .set({ logoUrl: blob.url })
      .where(eq(brandKits.id, existing.id))
      .returning()

    return NextResponse.json({ logoUrl: updated.logoUrl })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[POST] ${msg}` }, { status: 500 })
  }
}
