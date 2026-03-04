# Sterling Communications

Client and brand kit management platform with newsletter creation pipeline for Home Instead franchise offices.

**Repo:** https://github.com/sebastiancamargo79-cyber/sterling-communications
**Vercel:** https://vercel.com/swift-f7122582/sterling-communications
**Live:** https://sterling-communications.vercel.app

## Tech Stack

Next.js 15 · TypeScript · Drizzle ORM · Neon Postgres · Vercel Blob · Zod · OpenAI · Puppeteer

## Features

- **Client & Brand Kit Management** — create and manage clients with manual or uploaded brand kits (logo, primary colour, guidelines PDF)
- **Newsletter Editor** — per-client, per-module editing UI with AI-assisted content generation (GPT-4o). New clients are seeded with a full module template pre-populated with their name.
- **Monthly Newsletter Preview** — print-first 6-page A4 newsletter renderer with per-client content stored in Neon Postgres
- **PDF Export** — server-side PDF generation via Puppeteer (headless Chrome), plus browser Print
- **Edition History** — save named editions (snapshots) of newsletters, restore previous editions
- **Client Delivery Portal** — password-protected public route (`/delivery/[editionId]`) for clients to view published editions via unique access codes
- **Admin Centre** — manage custom newsletter module definitions at `/admin/modules`

## Route Architecture

```
/                                        Home (2-card nav)
/clients                                 Client list
/clients/new                             Create client
/clients/[id]                            Client workspace
/clients/[id]/newsletter/editor          Newsletter editor
/clients/[id]/newsletter/preview         Newsletter preview + PDF download
/clients/[id]/newsletter/editions        Edition history
/delivery/[editionId]                    Public delivery portal (access code)
/admin                                   Admin landing
/admin/modules                           Module management
```

## Local Dev Setup

1. Clone repo
2. `npm install`
3. Copy `.env.example` → `.env.local` and fill in values
4. `npm run db:migrate` — applies migrations to Neon
5. `npm run dev` — starts on http://localhost:3000

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

### Pipeline

Client Structured Submission → AI Content Generation → Layout Component Rendering → PDF + HTML Output → Client Delivery Portal

### Module Format

Content is stored as `:::module:` blocks in the DB:

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

1. Visit `/clients/[id]/newsletter/editor`
2. Edit module fields directly, or enter a brief and click **✨ Generate** to AI-generate the content
3. Click **Save** — content is persisted to Neon Postgres
4. Click **Preview →** to review the full print layout
5. Use **Download PDF** for server-generated A4 PDF, or **Print / Save as PDF** for browser print

### Client Delivery

1. Save an edition from the editor (click **Save Edition**)
2. Each edition gets a unique access code shown in the editions list
3. Share the `/delivery/[editionId]` link + access code with the client
4. Client enters the code to view the published edition

Content is validated with Zod at render time — invalid fields show a clear error page instead of crashing.

## Deploy (Vercel)

- Connect repo to Vercel
- Set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `OPENAI_API_KEY` in Vercel project settings
- Vercel runs `next build` automatically on push

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients` | List all clients with brand kits |
| `POST` | `/api/clients` | Create client + brand kit (multipart/form-data) |
| `GET` | `/api/clients/[id]` | Get client workspace data |
| `DELETE` | `/api/clients/[id]` | Delete client (cascade) |
| `GET` | `/api/clients/[id]/newsletter` | Get client newsletter draft |
| `PUT` | `/api/clients/[id]/newsletter` | Save client newsletter draft |
| `GET` | `/api/clients/[id]/newsletter/editions` | List editions |
| `POST` | `/api/clients/[id]/newsletter/editions` | Publish edition (generates access code) |
| `GET` | `/api/clients/[id]/newsletter/pdf` | Generate PDF of newsletter |
| `POST` | `/api/delivery/[editionId]` | Validate access code, return edition |
| `POST` | `/api/newsletter/generate` | AI-generate content for a module (GPT-4o) |
| `GET` | `/api/admin/modules` | List all module definitions |
| `POST` | `/api/admin/modules` | Create custom module definition |
