import matter from 'gray-matter'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NewsletterSchema, type Newsletter } from './newsletter-schema'
import { parseModuleBlocks } from './module-parser'

export class NoDraftError extends Error {
  constructor(clientId: string) {
    super(`No newsletter draft found for client ${clientId}`)
    this.name = 'NoDraftError'
  }
}

// Module name → schema key mapping
const MODULE_KEY_MAP: Record<string, string> = {
  meta: 'meta',
  cover: 'cover',
  directorupdate: 'director_update',
  events: 'events',
  clientstory: 'client_story',
  staffspotlight: 'spotlight',
  tips: 'tips',
  community: 'community',
}

function mapModulesToSchema(modules: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(modules)) {
    const schemaKey = MODULE_KEY_MAP[key.toLowerCase()] ?? key
    result[schemaKey] = value
  }
  return result
}

export async function parseNewsletter(content?: string, clientId?: string): Promise<Newsletter> {
  if (content) {
    const modules = parseModuleBlocks(content)
    const mapped = mapModulesToSchema(modules)
    return NewsletterSchema.parse(mapped)
  }

  // Try DB first
  try {
    const { db } = await import('@/db')
    const { newsletterDrafts } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    if (clientId) {
      // Client-specific draft
      const rows = await db
        .select()
        .from(newsletterDrafts)
        .where(eq(newsletterDrafts.clientId, clientId))
        .limit(1)

      if (rows.length > 0) {
        const modules = parseModuleBlocks(rows[0].rawContent)
        const mapped = mapModulesToSchema(modules)
        return NewsletterSchema.parse(mapped)
      }

      // No draft for this client — don't fall through to filesystem
      throw new NoDraftError(clientId)
    } else {
      // Legacy default draft
      const rows = await db
        .select()
        .from(newsletterDrafts)
        .where(eq(newsletterDrafts.slug, 'default'))
        .limit(1)

      if (rows.length > 0) {
        const modules = parseModuleBlocks(rows[0].rawContent)
        const mapped = mapModulesToSchema(modules)
        return NewsletterSchema.parse(mapped)
      }
    }
  } catch {
    // DB not available in this context — fall through to filesystem
  }

  // Filesystem fallback (dev)
  const raw = readFileSync(join(process.cwd(), 'src/content', 'newsletter.md'), 'utf8')

  // Detect format: :::module: blocks vs YAML frontmatter
  if (raw.includes(':::module:')) {
    const modules = parseModuleBlocks(raw)
    const mapped = mapModulesToSchema(modules)
    return NewsletterSchema.parse(mapped)
  } else {
    const { data } = matter(raw)
    return NewsletterSchema.parse(data)
  }
}
