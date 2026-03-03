# Sterling Communications

Office and brand kit management platform for Home Instead franchise offices.

**Repo:** https://github.com/sebastiancamargo79-cyber/sterling-communications
**Vercel:** https://vercel.com/swift-f7122582/sterling-communications
**Live:** https://sterling-communications.vercel.app

## Tech Stack

Next.js 15 · TypeScript · Drizzle ORM · Neon Postgres · Vercel Blob · Zod · OpenAI

## Features

- **Office & Brand Kit Management** — create and manage offices with manual or uploaded brand kits (logo, primary colour, guidelines PDF)
- **Newsletter Editor** — per-module editing UI at `/newsletter/editor` with AI-assisted content generation (GPT-4o)
- **Monthly Newsletter Preview** — print-first 6-page A4 newsletter renderer at `/newsletter/preview`; content stored in Neon Postgres, editable via the editor

## Local Dev Setup

1. Clone repo
2. `npm install`
3. Copy `.env.example` → `.env.local` and fill in values
4. `npm run db:migrate` — applies migrations to Neon
5. `npm run dev` — starts on http://localhost:3000
6. `GET /api/newsletter/seed` — seed the DB with content from `src/content/newsletter.md` (first run only)

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token |
| `OPENAI_API_KEY` | OpenAI API key — powers AI content generation in the newsletter editor |

## Migration Commands

```bash
npm run db:generate   # generate SQL from schema changes
npm run db:migrate    # apply pending migrations to Neon
```

## Newsletter System

The newsletter is a 6-page A4 print layout driven by module-based content stored in Neon Postgres.

### Module Format

Content is stored as `:::module:` blocks (in the DB and in `src/content/newsletter.md`):

```
:::module:DirectorUpdate
body_md: |
  Welcome to March...
pull_quote: "Caring for our community."
signature_name: "James Hartley"
signature_title: "Managing Director"
:::
```

### Module → Page Map

| Module | Page |
|---|---|
| `Meta` | Newsletter metadata (office name, month, contact details) |
| `Cover` | Page 1 — Cover (hero image + teasers) |
| `DirectorUpdate` | Page 2 — Director's Update |
| `Events` | Page 3 — Dates for the Diary (up to 6 cards) |
| `ClientStory` | Page 4 — Client Story |
| `StaffSpotlight` | Page 5 — Care Professional Spotlight |
| `Tips` | Page 6 — Tips section |
| `Community` | Page 6 — Community / Anniversaries section |

### Editing Workflow

1. Visit `/newsletter/editor`
2. Edit module fields directly, or enter a brief and click **✨ Generate** to AI-generate the content
3. Click **Save** — content is persisted to Neon Postgres
4. Click **Preview →** to review the full print layout at `/newsletter/preview`
5. Use **Print / Save as PDF** on the preview page to export

Content is validated with Zod at render time — invalid fields show a clear error page instead of crashing.

## Deploy (Vercel)

- Connect repo to Vercel
- Set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `OPENAI_API_KEY` in Vercel project settings
- Vercel runs `next build` automatically on push

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/offices` | List all offices with brand kits |
| `POST` | `/api/offices` | Create office + brand kit (multipart/form-data) |
| `GET` | `/api/newsletter` | Get current newsletter draft |
| `PUT` | `/api/newsletter` | Save newsletter draft to DB |
| `POST` | `/api/newsletter/generate` | AI-generate content for a module (GPT-4o) |
| `GET` | `/api/newsletter/seed` | Seed DB from `src/content/newsletter.md` (one-time) |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 specification |
| `GET` | `/docs` | API documentation page |
