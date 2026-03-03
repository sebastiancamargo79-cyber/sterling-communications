# Sterling Communications

Office and brand kit management platform for Home Instead franchise offices.

**Repo:** https://github.com/sebastiancamargo79-cyber/sterling-communications
**Vercel:** https://vercel.com/swift-f7122582/sterling-communications
**Live:** https://sterling-communications.vercel.app

## Tech Stack

Next.js 15 · TypeScript · Drizzle ORM · Neon Postgres · Vercel Blob · Zod

## Features

- **Office & Brand Kit Management** — create and manage offices with manual or uploaded brand kits (logo, primary colour, guidelines PDF)
- **Monthly Newsletter** — print-first 6-page A4 newsletter renderer at `/newsletter/preview`; driven by a single Markdown/YAML file, no database required

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

## Migration Commands

```bash
npm run db:generate   # generate SQL from schema changes
npm run db:migrate    # apply pending migrations to Neon
```

## Newsletter

The newsletter renderer lives at `/newsletter/preview` and is driven entirely by `src/content/newsletter.md` — no database queries, no authentication.

**To update the newsletter content**, edit `src/content/newsletter.md`. The YAML frontmatter controls all six pages:

| Section | Page |
|---|---|
| `cover` | Page 1 — Cover (hero image + teasers) |
| `director_update` | Page 2 — Director's Update |
| `events` | Page 3 — Dates for the Diary (up to 6 cards; auto-fills with photos) |
| `client_story` | Page 4 — Client Story |
| `spotlight` | Page 5 — Care Professional Spotlight |
| `tips` + `community` | Page 6 — Tips & Community / Anniversaries |

Content is validated with Zod at request time — invalid fields render a clear error page instead of crashing. To print or save as PDF, use the **Print / Save as PDF** button on the preview page.

## Deploy (Vercel)

- Connect repo to Vercel
- Set `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in Vercel project settings
- Vercel runs `next build` automatically on push

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/offices` | List all offices with brand kits |
| `POST` | `/api/offices` | Create office + brand kit (multipart/form-data) |
| `GET` | `/api/openapi.json` | OpenAPI 3.1 specification |
| `GET` | `/docs` | API documentation page |
