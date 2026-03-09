import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core'

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const brandKits = pgTable('brand_kits', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  mode: text('mode').notNull(),
  primaryColor: text('primary_color'),
  secondaryColor: text('secondary_color'),
  logoUrl: text('logo_url'),
  guidelinesPdfUrl: text('guidelines_pdf_url'),
  fontHeadingUrl: text('font_heading_url'),
  fontBodyUrl: text('font_body_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const newsletterDrafts = pgTable('newsletter_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).unique(),
  slug: text('slug').notNull().unique(),
  rawContent: text('raw_content').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const newsletterEditions = pgTable('newsletter_editions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  rawContent: text('raw_content').notNull(),
  accessCode: text('access_code').unique(),
  htmlSnapshot: text('html_snapshot'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const moduleDefinitions = pgTable('module_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  label: text('label').notNull(),
  storageKey: text('storage_key').notNull().unique(),
  fields: jsonb('fields').notNull(),
  aiPrompt: text('ai_prompt').notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

