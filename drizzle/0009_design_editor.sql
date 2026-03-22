ALTER TABLE "newsletter_drafts" ADD COLUMN IF NOT EXISTS "token_overrides" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "newsletter_editions" ADD COLUMN IF NOT EXISTS "token_overrides" JSONB NOT NULL DEFAULT '{}';
