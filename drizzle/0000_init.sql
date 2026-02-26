CREATE TABLE IF NOT EXISTS "offices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "brand_kits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "office_id" uuid NOT NULL REFERENCES "offices"("id") ON DELETE CASCADE,
  "mode" text NOT NULL CHECK ("mode" IN ('manual', 'uploaded')),
  "primary_color" text,
  "logo_url" text,
  "guidelines_pdf_url" text,
  "created_at" timestamptz DEFAULT now()
);
