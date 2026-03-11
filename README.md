# Sterling Communications

Client and brand kit management platform with newsletter creation pipeline for Home Instead franchise offices.

**Repo:** https://github.com/sebastiancamargo79-cyber/sterling-communications
**Vercel:** https://vercel.com/swift-f7122582/sterling-communications
**Live:** https://sterling-communications.vercel.app

## Tech Stack

**Frontend:** Next.js 15 · TypeScript · React · CSS Modules
**Backend:** Next.js API Routes · Drizzle ORM · Zod
**Database:** Neon Postgres (pooled)
**Storage:** Vercel Blob
**AI:** OpenAI (GPT-4o for chat, content generation, PDF extraction)
**PDF:** pdf-parse (text extraction), Puppeteer (PDF rendering)
**Design:** Drag-and-drop (dnd-kit), CSS variables

## Features

- **Client & Brand Kit Management** — create and manage clients with manual or uploaded brand kits (logo, primary colour, guidelines PDF)
- **Newsletter Editor** — per-client, per-module editing UI with AI-assisted content generation (GPT-4o). New clients are seeded with a full module template pre-populated with their name.
- **Monthly Newsletter Preview** — print-first 6-page A4 newsletter renderer with per-client content stored in Neon Postgres
- **PDF Export** — server-side PDF generation via Puppeteer (headless Chrome), plus browser Print
- **Edition History** — save named editions (snapshots) of newsletters, restore previous editions
- **Client Delivery Portal** — password-protected public route (`/delivery/[editionId]`) for clients to view published editions via unique access codes
- **Admin Centre** — manage custom newsletter module definitions at `/admin/modules`
- **🎨 Brand Studio** — AI-powered design engine with live token editor, PDF extraction, and design chatbot

## Route Architecture

```
/                                        Home (3-card nav)
/clients                                 Client list
/clients/new                             Create client
/clients/[id]                            Client workspace
/clients/[id]/newsletter/editor          Newsletter editor
/clients/[id]/newsletter/preview         Newsletter preview + PDF download
/clients/[id]/newsletter/editions        Edition history
/brand-studio                            Brand Studio landing (client list)
/brand-studio/[clientId]                 Brand Studio — AI design engine
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
| `DATABASE_URL` | Neon Postgres connection string (pooled via `@neondatabase/serverless`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token (for PDF uploads + logo storage) |
| `OPENAI_API_KEY` | OpenAI API key — powers: AI content generation, PDF token extraction, design chatbot (GPT-4o) |

## Migration Commands

```bash
npm run db:generate   # generate SQL from schema changes
npm run db:migrate    # apply pending migrations to Neon
```

## Brand Studio — Design Engine

Brand Studio is an AI-powered design token management system at `/brand-studio` that allows users to:
- Extract design tokens from brand guideline PDFs using GPT-4o vision
- Edit and refine brand tokens (colors, fonts, typography, layout)
- See live preview updates as tokens change
- Get AI design suggestions via conversational design assistant
- Save tokens and apply them across all newsletters

### Features

#### 1. **Token Editor** (left panel)
Manage 11 design tokens:
- **Colors**: Primary, Secondary, Background, Accent, Text
- **Fonts**: Heading font name, Body font name (Google Fonts or uploaded)
- **Typography**: Heading size, Body size
- **Layout**: Border radius, Layout density (compact/normal/airy)

#### 2. **Live Preview** (right panel)
- Scaled A4 newsletter cover (~40%) updates in real-time
- Shows how tokens affect newsletter rendering
- Responsive to all token changes

#### 3. **PDF Extraction** (right panel)
- Upload brand guideline PDFs via Vercel Blob
- GPT-4o analyzes PDF text to extract brand tokens
- Shows confidence scores (0-1.0) for each extracted token
- Per-token accept/skip toggle (high confidence tokens auto-selected)
- "Apply Selected" button to update editor with accepted tokens

#### 4. **Design Chatbot** (bottom panel)
- Persistent conversation history per client (stored in DB)
- Ask: "Make headings warmer", "Create a full style refresh", etc.
- Chatbot proposes token changes with side-by-side diffs
- Apply individual changes or "Apply All Changes"
- Maintains full chat history for iterative design

### Database Schema

**brandKits table** — extended with 5 new columns:
```sql
text_color VARCHAR              -- Brand text color (#hex)
heading_font_size VARCHAR       -- Heading font size (22px, 1.5rem, etc.)
body_font_size VARCHAR          -- Body font size (13px, 0.875rem, etc.)
card_border_radius VARCHAR      -- Border radius (6px, 0.25rem, etc.)
layout_density VARCHAR          -- Spacing density (compact/normal/airy)
```

**brandConversations table** — new:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id) ON DELETE CASCADE
messages JSONB NOT NULL DEFAULT '[]'  -- Chat history
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

### Workflow

1. Visit `/brand-studio` → see all clients with brand kit status
2. Click a client → Brand Studio opens with token editor
3. Upload PDF or manually set tokens
4. Ask the design chatbot for suggestions
5. Review live preview in real-time
6. Click **Save Brand Kit** to persist tokens to Neon
7. Tokens automatically apply to all newsletters for that client

### Technical Details

- **PDF Extraction**: Uses `pdf-parse` to extract text from first 3 pages, sends to GPT-4o with token extraction prompt
- **Font Resolution**: Google Fonts by name or uploaded font files
- **CSS Variables**: All tokens injected as CSS custom properties (`--font-heading`, `--brand-primary`, etc.)
- **Live Sync**: BrandStudioClient uses React state; changes reflect instantly in preview

---

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

### Clients & Brand Kits
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients` | List all clients with brand kits |
| `POST` | `/api/clients` | Create client + brand kit (multipart/form-data) |
| `GET` | `/api/clients/[id]` | Get client workspace data |
| `DELETE` | `/api/clients/[id]` | Delete client (cascade) |
| `GET` | `/api/clients/[id]/brand-kit` | Get client brand kit |
| `PUT` | `/api/clients/[id]/brand-kit` | Update brand kit (all 11 tokens) |

### Brand Studio
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/clients/[id]/brand-kit/extract` | Extract tokens from PDF (GPT-4o vision) |
| `GET` | `/api/clients/[id]/brand-kit/chat` | Get design chat history |
| `POST` | `/api/clients/[id]/brand-kit/chat` | Send message to design chatbot (GPT-4o) |
| `POST` | `/api/upload` | Upload PDF to Vercel Blob (returns public URL) |

### Newsletter
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/clients/[id]/newsletter` | Get client newsletter draft |
| `PUT` | `/api/clients/[id]/newsletter` | Save client newsletter draft |
| `GET` | `/api/clients/[id]/newsletter/editions` | List editions |
| `POST` | `/api/clients/[id]/newsletter/editions` | Publish edition (generates access code) |
| `GET` | `/api/clients/[id]/newsletter/pdf` | Generate PDF of newsletter |
| `POST` | `/api/delivery/[editionId]` | Validate access code, return edition |
| `POST` | `/api/newsletter/generate` | AI-generate content for a module (GPT-4o) |

### Admin
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/modules` | List all module definitions |
| `POST` | `/api/admin/modules` | Create custom module definition |
