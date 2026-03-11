# 05 — Technical Architecture

> Minimal stack. Single deployable. No microservices.
> A small team can build and maintain this end-to-end.

---

## Guiding Principles

1. **One codebase, one container** — frontend, backend, and database in a single Docker Compose stack
2. **Boring technology** — proven tools, no experimental choices
3. **No external dependencies at runtime** — no third-party SaaS, no message queues, no caches
4. **Data in PostgreSQL** — not in files, not in a spreadsheet

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Full-stack React — UI + API routes in one project |
| **Language** | TypeScript | Type safety, autocomplete, catches data model errors early |
| **Database** | PostgreSQL 16 | Reliable, handles decimal arithmetic correctly, good JSON support |
| **ORM** | Prisma | Type-safe queries, auto-generated migrations, excellent DX |
| **Auth** | NextAuth.js (Credentials provider) | Simple username/password login; no OAuth needed for MVP |
| **UI components** | shadcn/ui + Tailwind CSS | Accessible, unstyled-by-default components; easy to customise |
| **Tables / grids** | TanStack Table | Sorting, filtering, pagination — client-side for small datasets |
| **CSV export** | `papaparse` | Lightweight, browser-compatible |
| **Containerisation** | Docker + Docker Compose | Single command to run anywhere |

---

## Project Structure

```
chargeback-app/
├── prisma/
│   ├── schema.prisma          ← Data model (single source of truth)
│   └── migrations/            ← Auto-generated DB migrations
│
├── src/
│   ├── app/                   ← Next.js App Router
│   │   ├── (auth)/
│   │   │   └── login/         ← Login page
│   │   ├── (app)/             ← Protected routes
│   │   │   ├── dashboard/
│   │   │   ├── organizacao/           ← Pelouro / Direção / Area tree
│   │   │   ├── colaboradores/
│   │   │   │   └── [id]/      ← Employee detail
│   │   │   ├── catalogo/
│   │   │   │   └── [id]/      ← Item detail
│   │   │   ├── precos/
│   │   │   ├── atribuicoes/
│   │   │   └── relatorios/
│   │   └── api/               ← API routes (server-side)
│   │       ├── pelouros/
│   │       ├── direcoes/
│   │       ├── areas/
│   │       ├── colaboradores/
│   │       ├── categorias/    ← ServiceCategory CRUD
│   │       ├── items/
│   │       ├── precos/
│   │       ├── atribuicoes/
│   │       ├── custos-diretos/
│   │       └── relatorios/            ← colaborador / area / direcao / pelouro
│   │
│   ├── components/            ← Shared UI components
│   │   ├── ui/                ← shadcn primitives
│   │   ├── layout/            ← Sidebar, topbar, year selector
│   │   └── tables/            ← Reusable table components
│   │
│   ├── lib/
│   │   ├── prisma.ts          ← Prisma client singleton
│   │   ├── auth.ts            ← NextAuth config
│   │   └── calculations.ts    ← Calculation helpers (thin layer over SQL)
│   │
│   └── types/                 ← Shared TypeScript types
│
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Database Schema (Prisma)

```prisma
model Pelouro {
  id        String     @id @default(uuid())
  code      String     @unique
  name      String
  isActive  Boolean    @default(true)
  direcoes  Direcao[]
}

model Direcao {
  id          String       @id @default(uuid())
  code        String       @unique
  name        String
  pelouroId   String
  isActive    Boolean      @default(true)
  pelouro     Pelouro      @relation(fields: [pelouroId], references: [id])
  areas       Area[]
}

model Area {
  id          String       @id @default(uuid())
  code        String       @unique  // e.g. "CC-201" (cost center code)
  name        String                // e.g. "Marketing Digital"
  direcaoId   String
  isActive    Boolean      @default(true)
  direcao     Direcao      @relation(fields: [direcaoId], references: [id])
  employees   Employee[]
  directCosts DirectCost[]
}

model Employee {
  id              String       @id @default(uuid())
  employeeNumber  String       @unique
  firstName       String
  lastName        String
  email           String       @unique
  areaId          String
  company         String?               // e.g. "Super Bock Bebidas", "VMPS"
  isActive        Boolean      @default(true)
  area            Area         @relation(fields: [areaId], references: [id])
  assignments     Assignment[]
}

model ServiceCategory {
  id          String   @id @default(uuid())
  code        String   @unique  // e.g. "WORKPLACE_HW"
  name        String            // e.g. "Workplace Hardware"
  description String?
  color       String?           // hex color for UI badges, e.g. "#3B82F6"
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  items       ITItem[]
}

model ITItem {
  id                String          @id @default(uuid())
  code              String          @unique
  name              String
  serviceCategoryId String
  fundingModel      FundingModel
  unit              String
  description       String?
  isActive          Boolean         @default(true)
  serviceCategory   ServiceCategory @relation(fields: [serviceCategoryId], references: [id])
  prices            AnnualPrice[]
  assignments       Assignment[]
  directCosts       DirectCost[]
}

model AnnualPrice {
  id         String   @id @default(uuid())
  itItemId   String
  year       Int
  unitPrice  Decimal  @db.Decimal(10, 2)
  notes      String?
  itItem     ITItem   @relation(fields: [itItemId], references: [id])
  @@unique([itItemId, year])
}

model Assignment {
  id          String   @id @default(uuid())
  employeeId  String
  itItemId    String
  year        Int
  quantity    Decimal  @db.Decimal(10, 3)
  notes       String?
  employee    Employee @relation(fields: [employeeId], references: [id])
  itItem      ITItem   @relation(fields: [itItemId], references: [id])
  @@unique([employeeId, itItemId, year])
}

model DirectCost {
  id         String   @id @default(uuid())
  areaId     String
  itItemId   String
  year       Int
  totalCost  Decimal  @db.Decimal(10, 2)
  notes      String?
  area       Area     @relation(fields: [areaId], references: [id])
  itItem     ITItem   @relation(fields: [itItemId], references: [id])
  @@unique([areaId, itItemId, year])
}

model User {
  id           String  @id @default(uuid())
  email        String  @unique
  name         String
  passwordHash String
  isActive     Boolean @default(true)
}

enum FundingModel {
  CORPORATE
  CHARGEBACK
}
```

---

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/pelouros` | List all pelouros |
| POST | `/api/pelouros` | Create pelouro |
| PATCH | `/api/pelouros/[id]` | Update pelouro |
| GET | `/api/direcoes` | List all directions (optional `?pelouroId=`) |
| POST/PATCH | `/api/direcoes/[id]` | Create / update direction |
| GET | `/api/areas` | List all areas (optional `?direcaoId=`, `?pelouroId=`) |
| POST | `/api/areas` | Create area |
| PATCH | `/api/areas/[id]` | Update area |
| GET | `/api/colaboradores` | List employees (`?areaId=`, `?direcaoId=`, `?search=`) |
| GET | `/api/colaboradores/[id]` | Employee detail + assignments for year |
| POST/PATCH | `/api/colaboradores/[id]` | Create / update employee |
| GET | `/api/categorias` | List all service categories (ordered by `sortOrder`) |
| POST | `/api/categorias` | Create service category |
| PATCH | `/api/categorias/[id]` | Update name, description, color, sortOrder |
| GET | `/api/items` | List IT items (`?serviceCategoryId=`, `?fundingModel=`, `?search=`) |
| POST/PATCH | `/api/items/[id]` | Create / update IT item |
| GET | `/api/precos?year=2026` | All prices for a year |
| POST/PATCH | `/api/precos` | Set / update price |
| GET | `/api/atribuicoes?year=2026` | All assignments for a year |
| POST | `/api/atribuicoes` | Create assignment |
| PATCH | `/api/atribuicoes/[id]` | Update quantity / notes |
| DELETE | `/api/atribuicoes/[id]` | Remove assignment |
| POST | `/api/atribuicoes/import` | Bulk CSV import |
| GET | `/api/custos-diretos?year=2026` | All direct area costs for a year (`?areaId=`, `?direcaoId=`) |
| POST | `/api/custos-diretos` | Create direct cost record |
| PATCH | `/api/custos-diretos/[id]` | Update totalCost / notes |
| DELETE | `/api/custos-diretos/[id]` | Remove direct cost record |
| GET | `/api/relatorios/colaborador?year=2026` | Report by employee |
| GET | `/api/relatorios/area?year=2026` | Report by area (cost center) |
| GET | `/api/relatorios/direcao?year=2026` | Report by direction |
| GET | `/api/relatorios/pelouro?year=2026` | Report by pelouro |

All routes are protected by NextAuth session middleware. Unauthenticated requests return `401`.

---

## Deployment

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/chargeback
      NEXTAUTH_SECRET: <random-secret>
      NEXTAUTH_URL: http://localhost:3000
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: chargeback
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Estimated Build Effort

| Area | Estimate |
|---|---|
| Project setup (Next.js + Prisma + Auth + Docker) | 1 day |
| Org management screens (Pelouro + Direção + Area) | 1 day |
| Employee CRUD + detail page | 1.5 days |
| IT Catalogue CRUD + Service Category management | 1.5 days |
| Annual Prices screen | 1 day |
| Assignments (employee tab + direct costs tab + employee detail + CSV import) | 2.5 days |
| Reports (4 tabs + CSV export) | 1.5 days |
| Dashboard | 0.5 days |
| Auth + polish + testing | 1.5 days |
| **Total** | **~12 working days** |

---

## Future options (non-breaking)

| Option | How to add |
|---|---|
| Read-only viewer role for business areas | Add `role` to `User`, add middleware guard |
| Azure AD / SSO login | Add Azure provider to NextAuth config |
| Audit log | Add `AuditLog` table + Prisma middleware |
| Email notifications | Add `nodemailer` + cron job |
| Multi-year price copy (already designed) | Already in scope |
