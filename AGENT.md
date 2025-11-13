# AGENT.md — Junior UA (Updated baseline)

> You are an autonomous PR‑bot for **Junior UA** — a jobs/events platform for juniors in Ukraine.  
> Work **exclusively via small PRs**, keep them atomic, and follow this plan strictly.

## 0) Operating rules

- **Package manager:** **npm** with **npm workspaces**. Do **not** switch to pnpm/yarn.
- **One‑command dev:** `npm run dev` must start **API + Web** in parallel via `npm-run-all`. Keep it working at all times.
- **Tech stack:** Node 20+, TypeScript, Next.js 15 (App Router), Hono (Node), Prisma (Postgres), Meilisearch, next-intl, Tailwind, shadcn/ui, TanStack Query, Zod, Vitest, Playwright.
- **Locales:** default **uk**, also **en**. Language switcher must be **always visible** (desktop & mobile).
- **Licensing/IP:** Only original code and demo content. No external code copying.
- **Env‑opt‑in:** Sentry/Plausible/S3/LLM keys are optional; if missing → **no‑op** (never break build).
- **Git policy:** Conventional Commits in commits/PR titles; every PR must include migration notes & test steps.

### Branch/PR conventions
- Branches: `feat/<area>-<short>`, `fix/<scope>`, `chore/<topic>` (e.g., `feat/api-jobs-filters`).
- PR title example: `feat(api): jobs filters & pagination`.
- Each PR must include a **Checklist** (see template below) and **screenshots/terminal output** when relevant.

---

## 1) Current repository state (baseline to respect)

Monorepo (npm workspaces):
```
/apps
  /web      # Next.js 15 skeleton present
  /api      # Hono server present (currently in‑memory stubs)
/packages
  /db       # Prisma present — schema + initial migration ALREADY exist
/ops
  docker-compose.yml  # Postgres + Meilisearch (redis optional)
```

What already works:
- Root scripts use **npm-run-all**; **`npm run dev` starts web+api** in parallel.
- `.gitattributes` present (LF/CRLF normalized).

What is **missing** (to be delivered by PRs):
- **Seed data** and root **DB scripts** (`db:migrate`, `db:seed`).
- API wired to DB with **Zod** validation, filters & pagination.
- **Meilisearch** integration and `/api/v1/search/jobs` + reindex.
- Frontend **next-intl**, **JSON‑LD**, **language switcher (always visible)**.
- **sitemap.xml / robots.txt / hreflang**.
- Workers (mock) to read `seed/*.csv` → DB → Meili.
- **Tests** (Vitest/Playwright) and **GitHub Actions** CI.
- `.env.example` in root.

---

## 2) Infrastructure & scripts

**Root `package.json` must include (and keep working):**
```json
{
  "devDependencies": { "npm-run-all": "^4.1.5" },
  "scripts": {
    "dev:web": "npm run -w @junior-ua/web dev",
    "dev:api": "npm run -w @junior-ua/api dev",
    "dev": "npm-run-all -p dev:api dev:web",

    "build:web": "npm run -w @junior-ua/web build",
    "build:api": "npm run -w @junior-ua/api build",
    "build": "npm-run-all -s build:api build:web",

    "start:web": "npm run -w @junior-ua/web start",
    "start:api": "npm run -w @junior-ua/api start",
    "start": "npm-run-all -p start:api start:web",

    "db:migrate": "npm run -w @junior-ua/api db:migrate",
    "db:seed": "npm run -w @junior-ua/api db:seed",
    "search:reindex": "npm run -w @junior-ua/api search:reindex",
    "e2e": "npm run -w @junior-ua/web e2e"
  }
}
```

**Docker compose (`/ops/docker-compose.yml`)**
- Services: `postgres:16`, `getmeili/meilisearch`, `redis` (optional). Ports: `5432/7700/6379`. Volumes enabled.

**.env.example (root)**
```
# COMMON
NODE_ENV=development
APP_NAME=junior-ua

# WEB
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=localhost

# API
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/junior_ua?schema=public
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=masterKey
REDIS_URL=redis://localhost:6379

# OPTIONAL
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=junior-ua
S3_ACCESS_KEY=minio
S3_SECRET_KEY=miniosecret

# ANALYTICS/ERRORS (optional no-op)
PLAUSIBLE_API=
SENTRY_DSN=
OPENAI_API_KEY=
```

---

## 3) Data model (Prisma)

**Note:** Prisma schema & initial migration already exist.  
If something is missing, extend using this baseline:

- **Source**(id, name, url, kind:`job_board|company|event_provider`, country, isActive, createdAt, updatedAt)
- **Company**(id, name, site, logoUrl, size?, verified?, createdAt, updatedAt)
- **Job**(id, title, companyId?, sourceId?, urlOriginal, descriptionRaw?, descriptionHtml?, city?, region?, country?=UA, isRemote, salaryMin?, salaryMax?, currency?=`UAH|USD|EUR`, employmentType?=`full_time|part_time|contract|internship`, experienceLevel=`intern|junior|middle|senior|lead`, skills string[], tags string[], postedAt, scrapedAt, expiresAt?, juniorScore? 0..1, isHidden default false, createdAt, updatedAt)
- **Event**(id, title, organizer?, urlOriginal, descriptionRaw?, descriptionHtml?, city?, region?, onlineUrl?, venue?, startAt, endAt?, priceMin?, priceCurrency?, tags string[], scrapedAt, createdAt, updatedAt)
- **Crawl**(id, sourceId, runAt, status:`ok|fail|partial`, stats JSON, logUrl?)
- **Region**(id, name, country, lat?, lng?)
- **Tag**(id, slug, kind:`skill|topic|soft`, i18n JSON uk/en)

Indexes: `Job(postedAt desc)`, `Job(city)`, GIN on `Job.skills/tags`, `Event(startAt asc)`.

**Seeds to add now:**
- UA regions; ≥2 companies; ≥30 jobs; ≥10 events (UK‑language content).

---

## 4) API (Hono + Zod)

Prefix: `/api/v1`.

**Jobs**
- `GET /jobs` — query: `q`, `city`, `region`, `remote`(bool), `skills`(csv), `tags`(csv), `salaryMin`, `currency`, `experience`, `page`(1..), `perPage`(<=50), `sort`(`recent|relevant|salary_desc|salary_asc`). → `{items, page, perPage, total}`
- `GET /jobs/:id` — `JobDTO`
- `POST /jobs/reindex` — Meilisearch reindex (guarded by env flag).

**Events**
- `GET /events` — query: `q`, `city`, `region`, `from`(ISO), `to`(ISO), `tags`(csv), `page`, `perPage`, `sort`(`soon|recent`)
- `GET /events/:id`

Requirements:
- Validate with **Zod** (input & output). Sanitize HTML. Default: do **not** return `descriptionRaw`.
- **CORS**: allow only `NEXT_PUBLIC_SITE_URL`.
- Simple in‑memory **rate‑limit** (env‑toggle). Request logging.

---

## 5) Search (Meilisearch)

- Indices: `jobs`, `events`. Searchable: `title`, `companyName`, `city`, `region`, `skills`, `tags`, trimmed `descriptionHtml`, dates.
- Synonyms (uk/ru/en): `Київ/Киев/Kyiv`, `віддалена/удалённая/remote`, etc.
- DB→Meili sync on upsert.
- Endpoint: `GET /search/jobs` (same response shape as `/jobs`).

---

## 6) Workers / Scrapers (MVP)

- `/apps/workers`: generic interface `fetchList() → normalize() → upsert()`.
- Provide **mock** scraper that reads `seed/*.csv` → upserts DB → reindexes Meili.
- CLI:
  - `npm run -w @junior-ua/workers jobs:run`
  - `npm run -w @junior-ua/workers events:run`

---

## 7) Frontend (Next.js 15)

- **i18n:** `next-intl`, locales **uk** (default) & **en**; `/messages/uk.json` & `/messages/en.json`.
- Pages:
  - `/[locale]` — home (search, “upcoming events”, CTA).
  - `/[locale]/jobs` — catalog w/ filters (SSR/ISR `revalidate:60` + client refinements via TanStack Query).
  - `/[locale]/jobs/[id]` — details + **JSON‑LD JobPosting** + external link.
  - `/[locale]/events` and `/[locale]/events/[id]` — list/details + **JSON‑LD Event**.
  - `/[locale]/about`, `/[locale]/privacy`, `/[locale]/terms`.
  - `/sitemap.xml`, `/robots.txt`.
- UI: Tailwind + shadcn/ui. Language switcher **always visible** (desktop & mobile). Hide empty fields (salary/company). Accessibility (ARIA, focus rings).

**SEO:** `generateMetadata`, OG images, `hreflang`, structured data.

---

## 8) Tests & CI

- **Vitest**: units for DTO normalization, salary parsing, API filters.
- **Playwright**: E2E — `/uk/jobs` → search → open job → back; include basic a11y checks.
- **GitHub Actions**:
  1) `quality`: `npm ci` → lint/typecheck/tests (workspaces).
  2) `build`: build web/api/workers.
  3) `e2e`: compose up infra → migrate/seed → start → run Playwright → upload `playwright-report` + `coverage` artifacts.

---

## 9) Phased execution (PR plan)

**PR‑1 — Seeds + DB scripts + .env.example**  
- Add CSV/TS seeds (UA regions, companies, ≥30 jobs, ≥10 events).  
- Root scripts: `db:migrate`, `db:seed`; wire scripts inside `apps/api`.  
- Create `.env.example` as in §2.  
**Acceptance:** `npm run db:migrate && npm run db:seed` succeeds; DB has data.

**PR‑2 — API → Prisma + Zod + filters/pagination**  
- Replace in‑memory with Prisma for `/jobs`, `/jobs/:id`, `/events`, `/events/:id`.  
- Zod validation, sanitized output, CORS, toggleable rate‑limit.  
**Acceptance:** queries/filters/pagination work; responses validated.

**PR‑3 — Meilisearch + /search/jobs + reindex**  
- Create indices + synonyms; DB→Meili sync; endpoint `/search/jobs`; `POST /jobs/reindex` (env‑guarded).  
**Acceptance:** search returns expected items & ordering; reindex works.

**PR‑4 — Frontend i18n + JSON‑LD + language switcher**  
- Add next‑intl, messages, always‑visible language switcher; SSR/ISR lists; details pages with JSON‑LD.  
**Acceptance:** `/uk/jobs` shows seeded data; `/en` localized; Rich‑Results OK.

**PR‑5 — Sitemap / robots / hreflang**  
**Acceptance:** validators pass; localized URLs included.

**PR‑6 — Workers mock (CSV → DB → Meili)**  
**Acceptance:** running workers inserts records and updates indices.

**PR‑7 — Tests & CI**  
**Acceptance:** GA pipelines green; reports uploaded.

**PR‑8 — Polish (a11y/empty states/Lighthouse)**  
**Acceptance:** Lighthouse mobile/desktop ≈ ≥90; README updated.

---

## 10) PR template (add `.github/pull_request_template.md`)

```
## Summary
- [ ] Purpose of this PR (what & why)

## Changes
- …

## How to test
1. docker compose -f ops/docker-compose.yml up -d
2. cp .env.example .env.local
3. npm ci
4. npm run db:migrate && npm run db:seed
5. npm run dev
6. Visit http://localhost:3000/uk and http://localhost:8787/api/v1/health

## Checklist
- [ ] One-command dev (`npm run dev`) still works
- [ ] No breaking changes in scripts/env
- [ ] Added/updated tests where relevant
- [ ] Updated README/ENV when needed
```

---

## 11) Definition of Done (MVP)

- `npm run dev` launches web+api; `/uk/jobs` shows **DB-backed** data with filters; Meili search works.
- Job/Event pages emit valid **JSON‑LD**; `sitemap/robots/hreflang` are correct.
- CI passes (quality/build/e2e). Accessibility acceptable. Lighthouse ≈ ≥90.
- README includes reproducible local steps.