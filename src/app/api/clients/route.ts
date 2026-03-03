export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { db } from '@/db'
import { clients, brandKits, newsletterDrafts } from '@/db/schema'

export async function GET() {
  const rows = await db
    .select()
    .from(clients)
    .leftJoin(brandKits, eq(brandKits.clientId, clients.id))
    .orderBy(asc(clients.name))

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
    const c = row.clients
    const bk = row.brand_kits
    if (!map.has(c.id)) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        createdAt: c.createdAt,
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

  return NextResponse.json({ clients: Array.from(map.values()) })
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

    const logoFile = formData.get('logo')
    if (!logoFile || !(logoFile instanceof File)) {
      return NextResponse.json(
        { error: '[file-check] logo file is missing or not a File' },
        { status: 400 }
      )
    }

    let logoUrl: string
    try {
      const blob = await put(`logos/${Date.now()}-${logoFile.name}`, logoFile, { access: 'public' })
      logoUrl = blob.url
    } catch (e) {
      return errMsg('blob-upload-logo', e)
    }

    let client: typeof clients.$inferSelect
    try {
      ;[client] = await db.insert(clients).values({ name: parsed.data.name }).returning()
    } catch (e) {
      return errMsg('db-insert-client', e)
    }

    let brandKit: typeof brandKits.$inferSelect
    try {
      ;[brandKit] = await db
        .insert(brandKits)
        .values({ clientId: client.id, mode: 'manual', primaryColor: parsed.data.primary_color, logoUrl })
        .returning()
    } catch (e) {
      return errMsg('db-insert-brandkit', e)
    }

    // Create blank draft
    try {
      await db.insert(newsletterDrafts).values({
        clientId: client.id,
        slug: `client-${client.id}`,
        rawContent: '',
      })
    } catch (e) {
      return errMsg('db-insert-draft', e)
    }

    return NextResponse.json({ client, brandKit }, { status: 201 })
  }

  if (rawMode === 'uploaded') {
    const parsed = uploadedSchema.safeParse({ name: rawName, mode: rawMode })
    if (!parsed.success) {
      return NextResponse.json(
        { error: `[validate] ${JSON.stringify(parsed.error.flatten())}` },
        { status: 400 }
      )
    }

    const pdfFile = formData.get('guidelines_pdf')
    if (!pdfFile || !(pdfFile instanceof File)) {
      return NextResponse.json(
        { error: '[file-check] guidelines_pdf is missing or not a File' },
        { status: 400 }
      )
    }

    let guidelinesPdfUrl: string
    try {
      const blob = await put(`guidelines/${Date.now()}-${pdfFile.name}`, pdfFile, { access: 'public' })
      guidelinesPdfUrl = blob.url
    } catch (e) {
      return errMsg('blob-upload-pdf', e)
    }

    let client: typeof clients.$inferSelect
    try {
      ;[client] = await db.insert(clients).values({ name: parsed.data.name }).returning()
    } catch (e) {
      return errMsg('db-insert-client', e)
    }

    let brandKit: typeof brandKits.$inferSelect
    try {
      ;[brandKit] = await db
        .insert(brandKits)
        .values({ clientId: client.id, mode: 'uploaded', guidelinesPdfUrl })
        .returning()
    } catch (e) {
      return errMsg('db-insert-brandkit', e)
    }

    // Create blank draft
    try {
      await db.insert(newsletterDrafts).values({
        clientId: client.id,
        slug: `client-${client.id}`,
        rawContent: '',
      })
    } catch (e) {
      return errMsg('db-insert-draft', e)
    }

    return NextResponse.json({ client, brandKit }, { status: 201 })
  }

  return NextResponse.json({ error: 'mode must be "manual" or "uploaded"' }, { status: 400 })
}
