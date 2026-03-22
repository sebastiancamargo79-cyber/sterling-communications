import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

await sql`ALTER TABLE newsletter_drafts ADD COLUMN IF NOT EXISTS token_overrides JSONB NOT NULL DEFAULT '{}'`
await sql`ALTER TABLE newsletter_editions ADD COLUMN IF NOT EXISTS token_overrides JSONB NOT NULL DEFAULT '{}'`

console.log('✓ token_overrides columns added')
