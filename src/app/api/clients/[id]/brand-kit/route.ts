export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { brandKits } from '@/db/schema'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const brandKit = await db.query.brandKits.findFirst({
      where: eq(brandKits.clientId, id),
    })

    if (!brandKit) {
      return NextResponse.json({ error: 'Brand kit not found' }, { status: 404 })
    }

    return NextResponse.json(brandKit)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[GET] ${msg}` }, { status: 500 })
  }
}

const brandKitSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  bgColor: z.string().optional(),
  accentColor: z.string().optional(),
  textColor: z.string().optional(),
  fontHeadingName: z.string().optional(),
  fontBodyName: z.string().optional(),
  headingFontSize: z.string().optional(),
  bodyFontSize: z.string().optional(),
  cardBorderRadius: z.string().optional(),
  layoutDensity: z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const parsed = brandKitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: `[validate] ${JSON.stringify(parsed.error.flatten())}` },
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

    // Update only provided fields
    const updateData: Record<string, any> = {}
    if (parsed.data.primaryColor !== undefined) {
      updateData.primaryColor = parsed.data.primaryColor
    }
    if (parsed.data.secondaryColor !== undefined) {
      updateData.secondaryColor = parsed.data.secondaryColor
    }
    if (parsed.data.bgColor !== undefined) {
      updateData.bgColor = parsed.data.bgColor
    }
    if (parsed.data.accentColor !== undefined) {
      updateData.accentColor = parsed.data.accentColor
    }
    if (parsed.data.textColor !== undefined) {
      updateData.textColor = parsed.data.textColor
    }
    if (parsed.data.fontHeadingName !== undefined) {
      updateData.fontHeadingName = parsed.data.fontHeadingName
    }
    if (parsed.data.fontBodyName !== undefined) {
      updateData.fontBodyName = parsed.data.fontBodyName
    }
    if (parsed.data.headingFontSize !== undefined) {
      updateData.headingFontSize = parsed.data.headingFontSize
    }
    if (parsed.data.bodyFontSize !== undefined) {
      updateData.bodyFontSize = parsed.data.bodyFontSize
    }
    if (parsed.data.cardBorderRadius !== undefined) {
      updateData.cardBorderRadius = parsed.data.cardBorderRadius
    }
    if (parsed.data.layoutDensity !== undefined) {
      updateData.layoutDensity = parsed.data.layoutDensity
    }

    const [updated] = await db
      .update(brandKits)
      .set(updateData)
      .where(eq(brandKits.id, existing.id))
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `[PUT] ${msg}` }, { status: 500 })
  }
}
