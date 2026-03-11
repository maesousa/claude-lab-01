# Chargeback App

IT Cost Allocation Management — Next.js + SQLite (local) / PostgreSQL (production)

---

## Prerequisites

| Tool | Minimum Version | Install |
|------|----------------|---------|
| **Node.js** | 20 LTS | https://nodejs.org/en/download (LTS) |

> **Windows users:** After installing Node.js, restart any open terminals (git-bash, PowerShell, cmd) so the new PATH takes effect. No Docker required for local development.

---

## Quick Start (one-time setup)

```bash
# 1. Install dependencies
npm install

# 2. Create the database and run migrations
npx prisma migrate dev

# 3. Seed with sample data
npm run db:seed

# 4. Start the app
npm run dev
```

Open http://localhost:3000 — Login: `admin@chargeback.local` / `Admin123!`

---

## Daily Development

```bash
# Start Next.js dev server
npm run dev

# Open Prisma Studio (visual DB browser) at http://localhost:5555
npm run db:studio
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js in dev mode |
| `npm run build` | Production build |
| `npm run db:migrate` | Create & apply a new migration |
| `npm run db:seed` | Populate with sample data |
| `npm run db:studio` | Open Prisma Studio at :5555 |

---

## Database

- **Local development:** SQLite — file stored at `prisma/dev.db` (auto-created on first migration)
- **Production:** PostgreSQL 16 — see `docker-compose.yml` for container setup

The domain model and all business logic are identical between both environments.
Prisma handles the difference transparently.

---

## Architecture

- **Framework:** Next.js 14 (App Router)
- **Database (local):** SQLite via Prisma
- **ORM:** Prisma
- **Auth:** NextAuth.js (credentials)
- **UI:** shadcn/ui + Tailwind CSS

See `docs/app/` for full design documentation.
