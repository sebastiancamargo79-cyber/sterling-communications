ALTER TABLE brand_kits
  ADD COLUMN text_color text,
  ADD COLUMN heading_font_size text,
  ADD COLUMN body_font_size text,
  ADD COLUMN card_border_radius text,
  ADD COLUMN layout_density text;

CREATE TABLE brand_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
