export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { moduleDefinitions } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Helper: find module by UUID or by name
async function findModule(idOrName: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrName)
  const [existing] = await db
    .select()
    .from(moduleDefinitions)
    .where(isUuid ? eq(moduleDefinitions.id, idOrName) : eq(moduleDefinitions.name, idOrName))
  return existing ?? null
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = await findModule(id)

  if (!existing) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  if (existing.isSystem) {
    return NextResponse.json({ error: 'Cannot update system modules' }, { status: 403 })
  }

  const body = await req.json() as {
    label?: string
    fields?: unknown[]
    aiPrompt?: string
    sortOrder?: number
  }

  const updates: Record<string, unknown> = {}
  if (body.label !== undefined) updates.label = body.label
  if (body.fields !== undefined) updates.fields = body.fields
  if (body.aiPrompt !== undefined) updates.aiPrompt = body.aiPrompt
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder

  try {
    const [updated] = await db
      .update(moduleDefinitions)
      .set(updates)
      .where(eq(moduleDefinitions.id, existing.id))
      .returning()

    return NextResponse.json({ module: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const existing = await findModule(id)

  if (!existing) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 })
  }

  if (existing.isSystem) {
    return NextResponse.json({ error: 'Cannot delete system modules' }, { status: 403 })
  }

  try {
    await db
      .delete(moduleDefinitions)
      .where(eq(moduleDefinitions.id, existing.id))

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
