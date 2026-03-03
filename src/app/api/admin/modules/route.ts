export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { moduleDefinitions } from '@/db/schema'
import { getAllModuleDefs } from '@/lib/module-registry'

export async function GET() {
  const defs = await getAllModuleDefs()
  return NextResponse.json({ modules: defs })
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    name: string
    label: string
    storageKey: string
    fields: unknown[]
    aiPrompt: string
  }

  if (!body.name?.trim() || !body.label?.trim() || !body.storageKey?.trim()) {
    return NextResponse.json({ error: 'name, label, and storageKey are required' }, { status: 400 })
  }

  try {
    const [mod] = await db
      .insert(moduleDefinitions)
      .values({
        name: body.name.trim(),
        label: body.label.trim(),
        storageKey: body.storageKey.trim(),
        fields: body.fields ?? [],
        aiPrompt: body.aiPrompt ?? '',
        isSystem: false,
        sortOrder: 0,
      })
      .returning()

    return NextResponse.json({ module: mod }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
