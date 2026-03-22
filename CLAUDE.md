# CLAUDE.md — Sterling Communications

This file provides guidance for AI assistants working on the Sterling Communications codebase.

## Project Overview

Sterling Communications is a **Next.js 15 App Router** web application for managing client newsletters, brand kits, and content delivery for Home Instead franchise offices. It supports AI-assisted content generation, PDF export, and a public delivery portal.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1 (App Router, server components + client components) |
| Language | TypeScript 5.7 (strict mode) |
| Database | PostgreSQL via Neon serverless + Drizzle ORM 0.38 |
| Validation | Zod 3.24 |
| AI | OpenAI SDK (GPT-4o) |
| File Storage | Vercel Blob |
| PDF Generation | Puppeteer-core + @sparticuz/chromium (serverless) |
| Drag-and-Drop | @dnd-kit/core + @dnd-kit/sortable |
| Styling | CSS Modules (no Tailwind) |
| Notifications | Sonner (toast) |
| Markdown | react-markdown |
| YAML Parsing | gray-matter |

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── admin/              # Admin panel (modules, ai-prompts)
│   ├── api/                # All API route handlers
│   │   ├── auth/           # Login
│   │   ├── clients/        # Client CRUD + nested resources
│   │   ├── admin/          # Admin-only API (modules, prompts)
│   │   ├── newsletter/     # Shared newsletter endpoints (generate, seed)
│   │   ├── delivery/       # Public delivery portal API
│   │   └── upload/         # Vercel Blob upload
│   ├── clients/            # Client management pages
│   ├── delivery/           # Public access-code-protected portal
│   ├── brand-studio/       # AI brand design pages
│   ├── login/              # Auth page
│   └── docs/               # API documentation
├── components/
│   ├── newsletter/         # A4 newsletter page renderers (Page1–Page6, footer)
│   └── [UI components]     # Button, Input, Card, Sidebar, etc.
├── db/
│   ├── schema.ts           # Drizzle ORM table definitions
│   └── index.ts            # Neon DB connection + Drizzle instance
├── lib/
│   ├── module-parser.ts    # Parse/serialize :::module: YAML blocks
│   ├── module-registry.ts  # Built-in module definitions + DB fallback
│   ├── newsletter-parser.ts# Multi-source newsletter data loader
│   └── newsletter-schema.ts# Zod schemas for all 8 modules
├── types/                  # Shared TypeScript interfaces
└── content/
    └── newsletter.md       # Dev fallback with example content
drizzle/                    # SQL migrations + snapshots
```

---

## Environment Variables

Required in `.env.local` (see `.env.example`):

```
SITE_PASSWORD=           # Cookie-based auth password for all admin routes
DATABASE_URL=            # Neon Postgres connection string (or POSTGRES_URL)
BLOB_READ_WRITE_TOKEN=   # Vercel Blob token for logo/font/PDF uploads
OPENAI_API_KEY=          # GPT-4o for content generation and brand extraction
```

---

## Database Schema

Seven tables managed by Drizzle ORM:

| Table | Purpose |
|---|---|
| `clients` | Franchise office records |
| `brand_kits` | Brand tokens (colors, fonts, logo) — one per client, cascades on delete |
| `newsletter_drafts` | Working copy of newsletter content (one per client, unique) |
| `newsletter_editions` | Published/versioned newsletters with public access codes |
| `module_definitions` | Custom newsletter module templates stored in DB |
| `ai_prompts` | Per-client and global AI prompt overrides |
| `brand_conversations` | Chat history for Brand Studio AI assistant |

**Migrations:** Run `npm run db:generate` then `npm run db:migrate` after schema changes.

---

## Authentication

- Simple cookie-based auth (`sc_auth` cookie = `SITE_PASSWORD`)
- Applied via `src/middleware.ts` to all routes except `/login`, `/api/auth/login`, `/delivery/*`, and preview pages
- No sessions, no user accounts — single shared password

---

## Newsletter Module System

Newsletters are composed of named YAML blocks:

```
:::module:Meta
month: January 2025
office_name: Home Instead Manchester
:::

:::module:DirectorUpdate
body_md: |
  ...
pull_quote: "Short memorable quote"
:::
```

### 8 Built-in Modules

| Module | Key Fields |
|---|---|
| `Meta` | month, office_name, phone, website, email |
| `Cover` | hero_image_url, teasers (3–5 items) |
| `DirectorUpdate` | body_md, pull_quote (≤140 chars), signature_name, signature_title |
| `Events` | items (event or photo, ≤6 total) |
| `ClientStory` | headline, image_url, body_md |
| `Spotlight` | image_url, name, role, years, quote (≤120 chars), bio_md |
| `Tips` | image_url, bullets (exactly 5) |
| `Community` | recruitment_cta_md, awards_md, anniversaries (≤6) |

Custom modules can be created in the Admin panel and are stored in `module_definitions`.

### AI Prompt Resolution Chain

When generating module content via GPT-4o, prompts resolve in this priority order:

1. Client-specific override (stored in `ai_prompts` table with `clientId`)
2. Global default (stored in `ai_prompts` with `clientId = null`)
3. Hardcoded `aiPromptTemplate` in `module-registry.ts`

---

## Key API Endpoints

### Client Resources (all under `/api/clients/[id]/`)

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/clients` | List / create clients |
| DELETE | `/api/clients/[id]` | Delete client + cascade |
| GET/PUT | `/api/clients/[id]/newsletter` | Get/save draft |
| GET/POST | `/api/clients/[id]/newsletter/editions` | List / publish editions |
| GET | `/api/clients/[id]/newsletter/pdf` | Generate PDF via Puppeteer |
| GET/PUT | `/api/clients/[id]/brand-kit` | Get/update brand tokens |
| POST | `/api/clients/[id]/brand-kit/extract` | Extract tokens from PDF via GPT-4o |
| GET/POST | `/api/clients/[id]/brand-kit/chat` | Brand Studio AI chatbot |
| POST | `/api/clients/[id]/brand-kit/fonts` | Upload custom font files |
| GET/PUT/DELETE | `/api/clients/[id]/ai-prompts/[moduleName]` | Per-client prompt overrides |

### Admin

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/admin/modules` | List / create module definitions |
| PUT/DELETE | `/api/admin/modules/[id]` | Edit / delete module |
| GET/PUT | `/api/admin/ai-prompts/[moduleName]` | Global prompt defaults |

### Public

| Method | Path | Description |
|---|---|---|
| GET | `/api/delivery/[editionId]` | Fetch edition (access code in query param) |
| POST | `/api/newsletter/generate` | AI content generation |
| GET | `/api/newsletter/seed` | Seed DB with default module definitions |
| POST | `/api/upload` | Upload file to Vercel Blob |

---

## Page Routes

| Route | Component | Notes |
|---|---|---|
| `/clients` | ClientsClient | Client list |
| `/clients/new` | CreateClientPage | Manual or PDF-upload brand setup |
| `/clients/[id]/newsletter/editor` | EditorClient | Module editor with drag-to-reorder |
| `/clients/[id]/newsletter/preview` | PreviewPage | A4 print preview + PDF download |
| `/clients/[id]/newsletter/editions` | EditionsClient | Version history |
| `/clients/[id]/brand-studio` | BrandStudioClient | AI brand extraction + chatbot |
| `/clients/[id]/brand-kit` | BrandKitClient | Manual token editor |
| `/admin/modules` | ModulesClient | Manage module definitions |
| `/admin/ai-prompts` | AiPromptsClient | Global prompt defaults |
| `/delivery/[editionId]` | DeliveryClient | Public access-code portal |

---

## Development Workflow

### Setup

```bash
npm install
cp .env.example .env.local
# Fill in .env.local values
npm run dev
```

### Database

```bash
npm run db:generate   # Generate migration after schema changes
npm run db:migrate    # Apply pending migrations
```

### Build

```bash
npm run build
npm start
```

---

## Code Conventions

### TypeScript

- Strict mode is enabled — avoid `any`, use proper types
- Path alias `@/*` maps to `src/*`
- Type definitions go in `src/types/`

### React & Next.js

- Default to **server components** unless interactivity is required
- Mark client components with `"use client"` at the top
- API routes use `NextRequest` / `NextResponse`
- Fetch data in server components or route handlers — avoid client-side fetching where possible

### Styling

- Use **CSS Modules** (`.module.css`) — no inline styles, no Tailwind
- Newsletter page components use print-optimized A4 CSS
- Shared newsletter styles live in `components/newsletter/shared.module.css`

### Database

- All DB access through `db` from `src/db/index.ts`
- Use Drizzle ORM query builder — avoid raw SQL
- Schema changes require generating and running a migration
- Foreign keys cascade on delete where child data belongs to parent

### Error Handling

- API routes return `NextResponse.json({ error: "..." }, { status: N })`
- Use `NoDraftError` from `newsletter-parser.ts` for missing client newsletters
- Database connection gracefully falls back to `null` at build time (no `DATABASE_URL`)

### File Uploads

- All file uploads go through Vercel Blob via `/api/upload` or dedicated endpoints
- Store resulting URLs in the database (e.g., `brand_kits.logoUrl`, `fontHeadingUrl`)

---

## Newsletter PDF Generation

PDF generation uses Puppeteer with a serverless Chromium binary:

1. Client calls `GET /api/clients/[id]/newsletter/pdf`
2. Server launches headless Chromium pointing to the preview page URL
3. Page renders with all brand tokens and content
4. Puppeteer captures A4 PDF with print CSS applied
5. PDF returned as binary response

**Note:** PDF generation requires `CHROMIUM_PATH` or uses `@sparticuz/chromium` bundled binary. This only works in Vercel/Lambda environments with the correct Chromium layer.

---

## Brand Token System

Brand kits store per-client CSS design tokens:

| Token | Field | Notes |
|---|---|---|
| Primary color | `primaryColor` | Main brand color |
| Secondary color | `secondaryColor` | Accent color |
| Background | `bgColor` | Page background |
| Text color | `textColor` | Body text |
| Accent | `accentColor` | Highlight color |
| Mode | `mode` | `light` or `dark` |
| Logo | `logoUrl` | Vercel Blob URL |
| Heading font | `fontHeadingUrl` + `fontHeadingName` | Custom font file |
| Body font | `fontBodyUrl` + `fontBodyName` | Custom font file |
| Border radius | `cardBorderRadius` | px value |
| Font sizes | `headingFontSize`, `bodyFontSize` | px values |
| Layout density | `layoutDensity` | `compact`, `normal`, or `spacious` |

Tokens are injected as CSS variables at render time in newsletter and preview components.

---

## Common Pitfalls

- **Database connection at build time:** `src/db/index.ts` returns `null` when `DATABASE_URL` is absent. Always null-check `db` before querying in code that may run during `next build`.
- **Module name casing:** Module names in YAML blocks are case-sensitive (`DirectorUpdate`, not `directorupdate`). The parser has a mapping for legacy names.
- **PDF Puppeteer in dev:** `next dev` does not support PDF generation reliably. Test PDF generation in a Vercel preview or production deployment.
- **Unique constraints:** `newsletter_drafts` has a unique `clientId` — upsert or update instead of insert when saving drafts.
- **Access codes:** Edition `accessCode` is unique across the table. The delivery portal uses this, not the edition ID, for public access.
- **Font uploads:** Custom fonts must be uploaded before they appear in the newsletter preview. The brand kit must be saved after upload for changes to persist.

---

## Deployment

- Deployed on **Vercel** (no CI/CD pipeline configured)
- Neon Postgres is the hosted database
- Vercel Blob for file storage
- Set all four environment variables in the Vercel project settings
- Run `npm run db:migrate` after deploying schema changes (can be done via Neon console or a one-off script)
