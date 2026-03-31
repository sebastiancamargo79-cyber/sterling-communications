ALTER TABLE "newsletter_editions" ADD COLUMN IF NOT EXISTS "agent_conversation" jsonb DEFAULT '[]'::jsonb NOT NULL;
