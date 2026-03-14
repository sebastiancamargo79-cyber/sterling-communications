-- Drop existing tables if they exist
DROP TABLE IF EXISTS "brand_conversations" CASCADE;
DROP TABLE IF EXISTS "newsletter_editions" CASCADE;
DROP TABLE IF EXISTS "newsletter_drafts" CASCADE;
DROP TABLE IF EXISTS "module_definitions" CASCADE;
DROP TABLE IF EXISTS "brand_kits" CASCADE;
DROP TABLE IF EXISTS "clients" CASCADE;
DROP TABLE IF EXISTS "offices" CASCADE;

-- Create clients table (renamed from offices)
CREATE TABLE "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

-- Create brand_kits table with ALL columns
CREATE TABLE "brand_kits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "mode" text NOT NULL,
  "primary_color" text,
  "secondary_color" text,
  "bg_color" text,
  "accent_color" text,
  "text_color" text,
  "logo_url" text,
  "guidelines_pdf_url" text,
  "font_heading_url" text,
  "font_body_url" text,
  "font_heading_name" text,
  "font_body_name" text,
  "heading_font_size" text,
  "body_font_size" text,
  "card_border_radius" text,
  "layout_density" text,
  "created_at" timestamptz DEFAULT now()
);

-- Create newsletter_drafts table
CREATE TABLE "newsletter_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid REFERENCES "clients"("id") ON DELETE CASCADE,
  "slug" text NOT NULL,
  "raw_content" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "newsletter_drafts_slug_unique" UNIQUE("slug"),
  CONSTRAINT "newsletter_drafts_client_id_unique" UNIQUE("client_id")
);

-- Create newsletter_editions table
CREATE TABLE "newsletter_editions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "raw_content" text NOT NULL,
  "access_code" text UNIQUE,
  "html_snapshot" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);

-- Create module_definitions table
CREATE TABLE "module_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "label" text NOT NULL,
  "storage_key" text NOT NULL,
  "fields" jsonb NOT NULL,
  "ai_prompt" text NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "module_definitions_name_unique" UNIQUE("name"),
  CONSTRAINT "module_definitions_storage_key_unique" UNIQUE("storage_key")
);

-- Create brand_conversations table
CREATE TABLE "brand_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "messages" jsonb NOT NULL DEFAULT '[]',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
