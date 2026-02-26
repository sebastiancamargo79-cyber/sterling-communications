import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { db } from '@/db'
import { offices, brandKits } from '@/db/schema'

export async function GET() {
  const rows = await db
    .select()
    .from(offices)
    .leftJoin(brandKits, eq(brandKits.officeId, offices.id))

  // Group by office (an office may appear multiple times if it had multiple brand kits,
  // but we insert exactly one per office, so this just normalises the join shape)
  const map = new Map<string, {
    id: string
    name: string
    createdAt: Date | null
    brandKit: {
      id: string
      mode: string
      primaryColor: string | null
      logoUrl: string | null
      guidelinesPdfUrl: string | null
    } | null
  }>()

  for (const row of rows) {
    const o = row.offices
    const bk = row.brand_kits
    if (!map.has(o.id)) {
      map.set(o.id, {
        id: o.id,
        name: o.name,
        createdAt: o.createdAt,
        brandKit: bk
          ? {
              id: bk.id,
              mode: bk.mode,
              primaryColor: bk.primaryColor,
              logoUrl: bk.logoUrl,
              guidelinesPdfUrl: bk.guidelinesPdfUrl,
            }
          : null,
      })
    }
  }

  return NextResponse.json({ offices: Array.from(map.values()) })
}

const manualSchema = z.object({
  name: z.string().min(1),
  mode: z.literal('manual'),
  primary_color: z.string().min(1),
})

const uploadedSchema = z.object({
  name: z.string().min(1),
  mode: z.literal('uploaded'),
})

export async function POST(request: Request) {
  const formData = await request.formData()

  const rawMode = formData.get('mode')
  const rawName = formData.get('name')

  if (rawMode === 'manual') {
    const parsed = manualSchema.safeParse({
      name: rawName,
      mode: rawMode,
      primary_color: formData.get('primary_color'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const logoFile = formData.get('logo')
    if (!logoFile || !(logoFile instanceof File)) {
      return NextResponse.json({ error: 'logo file is required for manual mode' }, { status: 400 })
    }

    const logoBlob = await put(
      `logos/${Date.now()}-${logoFile.name}`,
      logoFile,
      { access: 'public' }
    )

    const [office] = await db
      .insert(offices)
      .values({ name: parsed.data.name })
      .returning()

    const [brandKit] = await db
      .insert(brandKits)
      .values({
        officeId: office.id,
        mode: 'manual',
        primaryColor: parsed.data.primary_color,
        logoUrl: logoBlob.url,
      })
      .returning()

    return NextResponse.json({ office, brandKit }, { status: 201 })
  }

  if (rawMode === 'uploaded') {
    const parsed = uploadedSchema.safeParse({
      name: rawName,
      mode: rawMode,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const pdfFile = formData.get('guidelines_pdf')
    if (!pdfFile || !(pdfFile instanceof File)) {
      return NextResponse.json(
        { error: 'guidelines_pdf file is required for uploaded mode' },
        { status: 400 }
      )
    }

    const pdfBlob = await put(
      `guidelines/${Date.now()}-${pdfFile.name}`,
      pdfFile,
      { access: 'public' }
    )

    const [office] = await db
      .insert(offices)
      .values({ name: parsed.data.name })
      .returning()

    const [brandKit] = await db
      .insert(brandKits)
      .values({
        officeId: office.id,
        mode: 'uploaded',
        guidelinesPdfUrl: pdfBlob.url,
      })
      .returning()

    return NextResponse.json({ office, brandKit }, { status: 201 })
  }

  return NextResponse.json(
    { error: 'mode must be "manual" or "uploaded"' },
    { status: 400 }
  )
}
