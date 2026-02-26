# Sterling Communications

Office and brand kit management platform.

## Tech Stack

Next.js 15 · TypeScript · Drizzle ORM · Neon Postgres · Vercel Blob

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

## Deploy (Vercel)

- Connect repo to Vercel
- Set `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` in Vercel project settings
- Vercel runs `next build` automatically on push

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/offices | List all offices with brand kits |
| POST | /api/offices | Create office + brand kit (multipart/form-data) |
| GET | /api/openapi.json | OpenAPI 3.1 specification |
| GET | /docs | API documentation page |
