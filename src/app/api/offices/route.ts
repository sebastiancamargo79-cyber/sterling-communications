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

function errMsg(step: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  return NextResponse.json({ error: `[${step}] ${msg}` }, { status: 500 })
}

export async function POST(request: Request) {
  // Step 1: parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch (e) {
    return NextResponse.json(
      { error: `[parse-form] ${e instanceof Error ? e.message : String(e)}` },
      { status: 400 }
    )
  }

  const rawMode = formData.get('mode')
  const rawName = formData.get('name')

  if (rawMode === 'manual') {
    // Step 2: validate fields
    const parsed = manualSchema.safeParse({
      name: rawName,
      mode: rawMode,
      primary_color: formData.get('primary_color'),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: `[validate] ${JSON.stringify(parsed.error.flatten())}` },
        { status: 400 }
      )
    }

    // Step 3: check file present
    const logoFile = formData.get('logo')
    if (!logoFile || !(logoFile instanceof File)) {
      return NextResponse.json(
        { error: '[file-check] logo file is missing or not a File' },
        { status: 400 }
      )
    }

    // Step 4: upload to Vercel Blob
    let logoUrl: string
    try {
      const blob = await put(`logos/${Date.now()}-${logoFile.name}`, logoFile, { access: 'public' })
      logoUrl = blob.url
    } catch (e) {
      return errMsg('blob-upload-logo', e)
    }

    // Step 5: insert office
    let office: typeof offices.$inferSelect
    try {
      ;[office] = await db.insert(offices).values({ name: parsed.data.name }).returning()
    } catch (e) {
      return errMsg('db-insert-office', e)
    }

    // Step 6: insert brand kit
    let brandKit: typeof brandKits.$inferSelect
    try {
      ;[brandKit] = await db
        .insert(brandKits)
        .values({ officeId: office.id, mode: 'manual', primaryColor: parsed.data.primary_color, logoUrl })
        .returning()
    } catch (e) {
      return errMsg('db-insert-brandkit', e)
    }

    return NextResponse.json({ office, brandKit }, { status: 201 })
  }

  if (rawMode === 'uploaded') {
    // Step 2: validate fields
    const parsed = uploadedSchema.safeParse({ name: rawName, mode: rawMode })
    if (!parsed.success) {
      return NextResponse.json(
        { error: `[validate] ${JSON.stringify(parsed.error.flatten())}` },
        { status: 400 }
      )
    }

    // Step 3: check file present
    const pdfFile = formData.get('guidelines_pdf')
    if (!pdfFile || !(pdfFile instanceof File)) {
      return NextResponse.json(
        { error: '[file-check] guidelines_pdf is missing or not a File' },
        { status: 400 }
      )
    }

    // Step 4: upload to Vercel Blob
    let guidelinesPdfUrl: string
    try {
      const blob = await put(`guidelines/${Date.now()}-${pdfFile.name}`, pdfFile, { access: 'public' })
      guidelinesPdfUrl = blob.url
    } catch (e) {
      return errMsg('blob-upload-pdf', e)
    }

    // Step 5: insert office
    let office: typeof offices.$inferSelect
    try {
      ;[office] = await db.insert(offices).values({ name: parsed.data.name }).returning()
    } catch (e) {
      return errMsg('db-insert-office', e)
    }

    // Step 6: insert brand kit
    let brandKit: typeof brandKits.$inferSelect
    try {
      ;[brandKit] = await db
        .insert(brandKits)
        .values({ officeId: office.id, mode: 'uploaded', guidelinesPdfUrl })
        .returning()
    } catch (e) {
      return errMsg('db-insert-brandkit', e)
    }

    return NextResponse.json({ office, brandKit }, { status: 201 })
  }

  return NextResponse.json({ error: 'mode must be "manual" or "uploaded"' }, { status: 400 })
}
