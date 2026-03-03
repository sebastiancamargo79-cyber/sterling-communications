-- Rename offices → clients
ALTER TABLE "offices" RENAME TO "clients";
--> statement-breakpoint

-- Rename office_id → client_id in brand_kits + update FK
ALTER TABLE "brand_kits" RENAME COLUMN "office_id" TO "client_id";
--> statement-breakpoint
ALTER TABLE "brand_kits" DROP CONSTRAINT "brand_kits_office_id_offices_id_fk";
--> statement-breakpoint
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Add nullable client_id to newsletter_drafts
ALTER TABLE "newsletter_drafts" ADD COLUMN "client_id" uuid;
--> statement-breakpoint
ALTER TABLE "newsletter_drafts" ADD CONSTRAINT "newsletter_drafts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Create newsletter_editions table
CREATE TABLE "newsletter_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"raw_content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "newsletter_editions" ADD CONSTRAINT "newsletter_editions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

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
