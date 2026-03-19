# Sterling Communications

Client and brand kit management platform with newsletter creation pipeline for Home Instead franchise offices.

**Repo:** https://github.com/sebastiancamargo79-cyber/sterling-communications
**Live:** https://sterling-communications.vercel.app

## Tech Stack

**Frontend:** Next.js 15 · TypeScript · React · CSS Modules
**Backend:** Next.js API Routes · Drizzle ORM · Zod
**Database:** Neon Postgres (pooled)
**Storage:** Vercel Blob
**AI:** OpenAI (GPT-4o for content generation, PDF extraction, design chatbot)
**PDF:** pdf-parse (text extraction), Puppeteer (PDF rendering)
**Design:** Drag-and-drop (dnd-kit), sonner toasts, CSS variables

## Features

- **Client & Brand Kit Management** — create and manage clients with manual or uploaded brand kits (logo, primary colour, guidelines PDF)
- **Newsletter Editor** — per-client, per-module editing UI with structured field inputs (events, arrays) and AI-assisted content generation (GPT-4o). Cmd+S to save. Drag to reorder modules.
- **Customisable AI Prompts** — edit the AI prompt per module per client, or set global defaults in the admin panel. Resolution chain: client override → global default → built-in
- **Structured Field Editing** — Events and array fields use form UIs instead of raw YAML (add/remove items, per-event type selector)
- **Monthly Newsletter Preview** — print-first 6-page A4 newsletter renderer with per-client brand tokens. Custom modules render via a generic card. Broken images hidden automatically.
- **PDF Export** — server-side PDF generation via Puppeteer (headless Chrome), plus browser Print
- **Edition History** — save named editions (snapshots) of newsletters, restore previous editions
- **Client Delivery Portal** — password-protected public route (`/delivery/[editionId]`) for clients to view published editions via unique access codes
- **Admin Centre** — manage custom newsletter module definitions (create, edit, delete) and global AI prompt defaults
- **Brand Studio** — AI-powered design engine with live token editor, PDF extraction, and design chatbot
- **Toast Notifications** — success/error feedback on all mutations via sonner

## Route Architecture

```
/                                        Home
/clients                                 Client list
/clients/new                             Create client
/clients/[id]                            Client workspace
/clients/[id]/newsletter/editor          Newsletter editor
/clients/[id]/newsletter/preview         Newsletter preview + PDF download
/clients/[id]/newsletter/editions        Edition history
/brand-studio                            Brand Studio landing
/brand-studio/[clientId]                 Brand Studio — AI design engine
/delivery/[editionId]                    Public delivery portal (access code)
/admin                                   Admin landing
/admin/modules                           Module management (create, edit, delete)
/admin/ai-prompts                        Global AI prompt defaults
```

## Local Dev Setup

1. Clone the repo: `git clone https://github.com/sebastiancamargo79-cyber/sterling-communications`
2. `npm install`
3. Copy `.env.example` → `.env.local` and fill in values
4. `npm run db:migrate` — applies migrations to Neon
5. `npm run dev` — starts on http://localhost:3000

## Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (pooled via `@neondatabase/serverless`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token (for PDF uploads + logo storage) |
| `OPENAI_API_KEY` | OpenAI API key — powers AI content generation, PDF token extraction, design chatbot (GPT-4o) |
| `SITE_PASSWORD` | Password for the admin/editor login |

## Migration Commands

```bash
npm run db:generate   # generate SQL from schema changes
npm run db:migrate    # apply pending migrations to Neon
```

## Database Schema

Tables: `clients`, `brand_kits`, `newsletter_drafts`, `newsletter_editions`, `module_definitions`, `ai_prompts`, `brand_conversations`

The `ai_prompts` table stores per-client and global AI prompt overrides:
- `client_id` nullable — NULL = global default, set = client override
- Unique index on `(client_id, module_name)`

## Newsletter System

The newsletter is a 6-page A4 print layout driven by module-based content stored in Neon Postgres.

### Module Format

Content is stored as `:::module:` blocks:

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
| `Events` | Page 3 — Dates for the Diary |
| `ClientStory` | Page 4 — Client Story |
| `StaffSpotlight` | Page 5 — Care Professional Spotlight |
| `Tips` | Page 6 — Tips section |
| `Community` | Page 6 — Community / Anniversaries section |
| Custom modules | Generic card (renders all YAML fields) |

### Editing Workflow

1. Visit `/clients/[id]/newsletter/editor`
2. Edit module fields (structured inputs for arrays and events), or enter a brief and click **Generate** for AI content
3. Optionally click **Edit prompt** on a module to customise the AI instructions for this client
4. Cmd+S or click **Save** — persisted to Neon Postgres
5. Click **Preview** to review the full print layout
6. Use **Download PDF** for server-generated A4 PDF, or **Print** for browser print

## API Endpoints

### Clients
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients` | List all clients |
| `POST` | `/api/clients` | Create client + brand kit |
| `DELETE` | `/api/clients/[id]` | Delete client (cascade) |

### AI Prompts
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients/[id]/ai-prompts` | List resolved prompts for client |
| `PUT` | `/api/clients/[id]/ai-prompts/[moduleName]` | Set client-level prompt override |
| `DELETE` | `/api/clients/[id]/ai-prompts/[moduleName]` | Remove client override |
| `GET` | `/api/admin/ai-prompts` | List global default prompts |
| `PUT` | `/api/admin/ai-prompts/[moduleName]` | Set global default prompt |

### Newsletter
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients/[id]/newsletter` | Get draft |
| `PUT` | `/api/clients/[id]/newsletter` | Save draft |
| `GET` | `/api/clients/[id]/newsletter/editions` | List editions |
| `POST` | `/api/clients/[id]/newsletter/editions` | Publish edition |
| `GET` | `/api/clients/[id]/newsletter/pdf` | Generate PDF |
| `POST` | `/api/newsletter/generate` | AI-generate module content (GPT-4o) |

### Admin
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/modules` | List all module definitions |
| `POST` | `/api/admin/modules` | Create custom module |
| `PUT` | `/api/admin/modules/[id]` | Update custom module |
| `DELETE` | `/api/admin/modules/[id]` | Delete custom module |

## Deploy (Vercel)

- Connect repo to Vercel
- Set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `OPENAI_API_KEY`, and `SITE_PASSWORD` in Vercel project settings
- Vercel runs `next build` automatically on push to `main`
