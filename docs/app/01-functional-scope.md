# 01 — Functional Scope

> A simple internal tool for the DSI team to manage IT chargeback to business areas.
> No approvals. No workflows. No external users.

---

## What the app does

| Module | Description |
|---|---|
| **Organisation** | Manage the company's org structure: pelouros, directions, and employees |
| **IT Catalogue** | Manage the list of IT items that can be assigned to employees |
| **Annual Prices** | Set and update the unit price of each IT item per year |
| **Assignments** | Record which IT items (and how many) are assigned to each employee |
| **Reports** | View and export chargeback amounts rolled up by employee, direction, or pelouro |

---

## In scope

- **CRUD** for all reference data: org structure, IT items, prices, assignments
- **Chargeback calculation**: `quantity × unit price`, aggregated at every org level
- **Reports**: by employee / by area / by direction / by pelouro, filtered by year
- **CSV export** of any report view
- **Single user role** — the DSI team uses the app internally; no external access needed for MVP
- **Annual pricing model** — one price per item per year; prices can be updated for future years without affecting past records

## Out of scope (MVP)

- Approval workflows or multi-step validations
- Business area self-service portal (business areas don't log in)
- Challenge / dispute management
- ERP or SAP integration
- SSO / Active Directory authentication (simple password login is fine for MVP)
- Audit trail / change history
- Multi-currency support (EUR only)
- Mobile app

---

## Users

For MVP, the app has **one user type**: DSI team member (internal).
All DSI users can read and write all data.
A simple login (username + password) is sufficient.

> Future: if business areas need read-only access to their own reports, a second role (`viewer`) can be added without structural changes.

---

## Org structure model

The company org chart has four levels:

```
Pelouro
  └── Direção (one or more per Pelouro)
        └── Area / Cost Center (one or more per Direção)
              └── Employee (one or more per Area)
```

- **Pelouro** — highest grouping (e.g., "Pelouro Financeiro", "Pelouro Comercial")
- **Direção** — department / direction (belongs to one Pelouro)
- **Area** — operational unit / cost center (belongs to one Direção; identified by a cost center code)
- **Employee** — person assigned IT items (belongs to one Area)

---

## IT item classification (from official policy)

IT items are classified along two axes:

| Attribute | Values | Purpose |
|---|---|---|
| `serviceCategory` | FK → `ServiceCategory` entity (configurable by DSI) | Organise the catalogue |
| `fundingModel` | `CORPORATE` \| `CHARGEBACK` | Only `CHARGEBACK` items appear in reports and assignments |

`CORPORATE` items (SAP, Salesforce, MPLS network, etc.) are managed by DSI but never charged to business areas. They are in the catalogue for reference only.

---

## Annual pricing model

- Each IT item has **one price per year**
- Prices are set at the start of the year (or updated as needed)
- Historical prices are preserved — changing the 2027 price does not affect 2026 calculations
- If no price exists for a year, the item cannot be assigned for that year

---

## Key simplifications vs. v1 design

| V1 design | MVP reality |
|---|---|
| Complex approval workflow (5 phases) | No workflow — DSI edits data directly |
| Challenge / dispute management | Not needed — internal tool only |
| Formal sign-off by business areas | Not needed |
| Billing period lifecycle | Replaced by simple year filter |
| Audit log per state transition | Not in MVP |
| One statement per business area | Reports computed on demand from assignments |
