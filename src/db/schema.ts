import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

export const newsletterDrafts = pgTable('newsletter_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  rawContent: text('raw_content').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})


export const offices = pgTable('offices', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const brandKits = pgTable('brand_kits', {
  id: uuid('id').defaultRandom().primaryKey(),
  officeId: uuid('office_id').notNull().references(() => offices.id, { onDelete: 'cascade' }),
  mode: text('mode').notNull(),
  primaryColor: text('primary_color'),
  logoUrl: text('logo_url'),
  guidelinesPdfUrl: text('guidelines_pdf_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})
