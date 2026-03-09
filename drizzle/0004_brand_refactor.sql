-- Brand Kit: add secondary color + font URLs
ALTER TABLE "brand_kits"
  ADD COLUMN "secondary_color" text,
  ADD COLUMN "font_heading_url" text,
  ADD COLUMN "font_body_url" text;

-- Editions: add updatedAt for tracking edits
ALTER TABLE "newsletter_editions"
  ADD COLUMN "updated_at" timestamptz;

-- Unique constraint on drafts so we can upsert by clientId
ALTER TABLE "newsletter_drafts"
  ADD CONSTRAINT "newsletter_drafts_client_id_unique" UNIQUE ("client_id");
