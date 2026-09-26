# Career Scout

AI job discovery + ATS-optimized CV builder for the Indian job market.

Stack: Next.js 16, Prisma 7 + Neon Postgres, Gemini, Firecrawl, react-pdf, Vercel.

## Quick start

```bash
# 1. Provision a free Neon database at https://neon.tech and copy the connection string
# 2. Get a Gemini API key at https://aistudio.google.com/apikey
# 3. Get a Firecrawl API key at https://firecrawl.dev (free tier = 500 credits/mo)
# 4. Copy env template and fill in real values
cp .env.example .env
# 5. Install deps (already done if cloned)
npm install
# 6. Generate Prisma client + push schema to database
npx prisma generate
npx prisma db push
# 7. Run dev server
npm run dev
```

Open http://localhost:3000 → Onboarding → paste/upload your CV → Run discovery scan.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string (include `?sslmode=require`) |
| `GOOGLE_API_KEY` | Yes | Gemini API key for profile parsing, scoring, CV generation |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl key for web search + careers page scraping |
| `GEMINI_MODEL` | No | Override model (default: `gemini-3.6-flash`) |
| `FIRECRAWL_MAX_CREDITS_PER_SCAN` | No | Cap credits per scan run (default: 500) |
| `FIRECRAWL_WEBHOOK_SECRET` | No | Shared secret for the agent webhook. Strongly recommended in production; when unset the endpoint only accepts callbacks for agent job ids already tracked in the database. |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token for storing CV PDFs (falls back to local `public/cvs/` in dev) |
| `NEXT_PUBLIC_APP_URL` | No | Set automatically on Vercel; for local dev with Firecrawl webhooks use ngrok |

## How it works

1. **Profile setup** — paste CV text or upload PDF → Gemini parses into structured profile + derives search config (queries, keywords, negative filters, locations)
2. **Discovery scan** — fetches Greenhouse/Ashby/Lever ATS boards for tracked companies, runs Firecrawl web searches for each query, scrapes company careers pages
3. **Scoring** — each job scored for fit (Gemini) + ghost listing score (deterministic: source quality, freshness, repost markers)
4. **CV builder** — Gemini generates tailored ATS resume per job → react-pdf renders PDF → stored on Vercel Blob (or local in dev)
5. **Agent** (optional) — Firecrawl async agent for deep discovery; results arrive via webhook

## Project structure

```
app/
  api/         Route handlers (profile, discover, jobs, cv, score, tracker, webhooks)
  page.tsx     Dashboard
  onboarding/  CV upload + profile setup
  jobs/        Job list + detail + CV builder
  tracker/     Application pipeline
  agent/       Firecrawl agent launcher
lib/
  db.ts        Prisma client (lazy singleton with Neon adapter)
  types.ts     Shared TS types
  portals.ts   India job boards + tracked companies + ATS URL builders
  jobs.ts      Title filtering, dedup, seniority ranking
  utils.ts     Helpers (timeAgo, normalizeUrl, etc.)
  mappers.ts   Prisma row → plain data converters
  gemini/      Profile parsing, search config, scoring, CV tailoring
  firecrawl/   Client, ATS fetchers, web search, careers scrape, agent
  scoring/     Deterministic GLS (ghost listing score)
  pdf/         react-pdf ATS template, render, Blob upload, PDF text extraction
prisma/
  schema.prisma
generated/     Prisma client output (gitignored)
```

## Database

Free tier: Neon Postgres (serverless, scales to zero).

```bash
# Push schema (creates tables, no migrations needed for dev)
npx prisma db push

# For production migrations:
npx prisma migrate dev --name init
```

Models: `Profile`, `SearchConfig`, `Scan`, `Job`, `ScanHistory`.

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel → auto-detects Next.js
3. Set env vars in Vercel dashboard (DATABASE_URL, GOOGLE_API_KEY, FIRECRAWL_API_KEY)
4. Add `@neondatabase/serverless` and `@prisma/adapter-neon` to Vercel's bundled dependencies if needed
5. Deploy

## Credits / limits

- **Gemini free tier**: 15 RPM, 1M tokens/day — sufficient for scoring + CV generation
- **Firecrawl free tier**: 500 credits/month — use ATS feeds first (free), then web search
- **Neon free tier**: 0.5 GB storage, 24/7 compute — sufficient for single-user
- **Vercel Hobby**: 300s max function duration, 2GB memory — scan runs use `after()` to avoid blocking
