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
