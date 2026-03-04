ALTER TABLE "newsletter_editions" ADD COLUMN "access_code" text UNIQUE;
ALTER TABLE "newsletter_editions" ADD COLUMN "html_snapshot" text;
