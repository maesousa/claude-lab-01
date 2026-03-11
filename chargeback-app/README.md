# Chargeback App

IT Cost Allocation Management — Next.js 14 + Prisma + SQLite (local dev) / PostgreSQL (production)

---

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| **Node.js** | 20 LTS | https://nodejs.org/en/download (LTS) |

> **Windows users:** After installing Node.js, restart any open terminals (git-bash, PowerShell, cmd) so the new `PATH` takes effect. No Docker required for local development.

---

## Quick Start (first-time setup)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Create the SQLite database and apply the schema
npx prisma migrate dev --name init

# 4. Seed with sample data (employees, items, assignments for 2026)
npm run db:seed

# 5. Start the development server
npm run dev
```

Open **http://localhost:3000**

---

## Developer Workflow

### Daily development

```bash
# Start the Next.js dev server (hot-reload)
npm run dev

# Open Prisma Studio — visual DB browser at http://localhost:5555
npm run db:studio
```

### Code quality (run before committing)

```bash
# ESLint — catches style and correctness issues
npm run lint

# TypeScript type-check — strict mode, no emit
npm run typecheck

# Run all tests (unit + API + integration)
npm test

# Run tests in watch mode (TDD)
npm run test:watch

# Run tests with coverage report (used in CI)
npm run test:ci
```

### After changing the Prisma schema

```bash
# Create and apply a new migration
npm run db:migrate

# (or push schema changes directly — useful during early exploration)
npx prisma db push

# Regenerate the Prisma Client after schema changes
npm run db:generate
```

### Production build

```bash
npm run build
npm start
```

---

## Scripts reference

| Script | What it does |
|--------|-------------|
| `npm run dev` | Start Next.js dev server with hot-reload |
| `npm run build` | Production build |
| `npm start` | Run the production server |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `npm test` | Jest — all tests |
| `npm run test:watch` | Jest in interactive watch mode |
| `npm run test:ci` | Jest with `--ci` flag and coverage output |
| `npm run db:migrate` | Create & apply a new Prisma migration |
| `npm run db:push` | Push schema to DB without a migration file |
| `npm run db:seed` | Populate DB with sample data |
| `npm run db:studio` | Open Prisma Studio at :5555 |
| `npm run db:generate` | Regenerate Prisma Client |

---

## Environment variables

| Variable | Example | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `file:./dev.db` | SQLite path for local dev; use a PostgreSQL DSN for production |
| `NEXTAUTH_SECRET` | `change-me` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` | Must match the server URL |

`.env.example` is committed and always kept up-to-date. Copy it to `.env` (git-ignored) and fill in real values.

---

## Database

| Environment | Engine | Location |
|-------------|--------|----------|
| Local dev | SQLite | `prisma/dev.db` — auto-created by `prisma migrate dev` |
| Production | PostgreSQL 16 | Set `DATABASE_URL` to a PostgreSQL connection string |

> **SQLite note:** SQLite does not support Prisma enums. `FundingModel` is stored as a plain `String` with values `"CORPORATE"` or `"CHARGEBACK"`. TypeScript safety is enforced via the `FundingModel` union type in `src/types/index.ts`. The `@db.Decimal` native-type annotation is also omitted; Prisma stores `Decimal` fields as TEXT in SQLite.

---

## Testing

Tests live in `src/__tests__/` and use **Jest** with Next.js's built-in SWC transform (via `next/jest`). Prisma is always mocked — tests require **no real database**.

```
src/__tests__/
  lib/
    utils.test.ts          ← formatCurrency, toNumber
    calculations.test.ts   ← core cost-calculation rules
  api/
    items.test.ts          ← GET + POST /api/items
    assignments.test.ts    ← GET + POST /api/assignments (cost math guarded here)
    direct-costs.test.ts   ← GET + POST /api/direct-costs
  integration/
    cost-flow.test.ts      ← full lifecycle: create → fetch → cost total → guards
```

---

## CI / Continuous Integration

The GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push and pull request:

1. `npm ci` — clean dependency install
2. `npm run lint` — ESLint
3. `npm run typecheck` — TypeScript (`tsc --noEmit`)
4. `npm run test:ci` — Jest (Prisma mocked; no real DB needed)
5. `npx prisma db push` — create empty CI SQLite database
6. `npm run build` — Next.js production build

---

## Architecture

```
src/
  app/
    api/               ← Next.js Route Handlers (REST API)
      assignments/     ← per-employee IT cost allocations
      direct-costs/    ← fixed per-area costs
      items/           ← IT item catalogue
      employees/       ← employee reference list
      areas/           ← area / cost-centre reference list
      categories/      ← service category reference list
    assignments/       ← Assignments page (full CRUD UI)
    items/             ← IT Items catalogue page
    page.tsx           ← Dashboard (stats + cost breakdown)
  __tests__/           ← all tests (unit, API, integration)
  lib/
    prisma.ts          ← Prisma client singleton
    utils.ts           ← formatCurrency, toNumber, cn
  types/
    index.ts           ← shared TypeScript types
  components/
    layout/
      Sidebar.tsx      ← navigation sidebar
prisma/
  schema.prisma        ← data model (11 entities)
  seed.ts              ← sample data for 2026
.github/
  workflows/
    ci.yml             ← CI pipeline
```

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| ORM | Prisma 5 |
| DB — local | SQLite |
| DB — production | PostgreSQL 16 |
| Styling | Tailwind CSS 3 |
| Testing | Jest 29 (SWC transform via `next/jest`) |
| CI | GitHub Actions |
