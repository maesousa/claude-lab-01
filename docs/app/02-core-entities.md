# 02 — Core Entities

> Ten entities. No workflow states. No audit log. No challenge objects.

---

## Entity Map

```
ServiceCategory
      │
      └──< ITItem >──< AnnualPrice
               │
Pelouro        ├──< Assignment >──┐
  └──< Direção │                  │
        └──< Area──< DirectCost   │
              └──< Employee ──────┘
```

---

## Entity 1 — Pelouro

Top-level organisational grouping.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | String | Short code, unique (e.g., `FIN`, `COM`, `IND`) |
| `name` | String | Full name (e.g., "Pelouro Financeiro") |
| `isActive` | Boolean | Soft-delete |

---

## Entity 2 — Direção

Department / direction. Belongs to one Pelouro.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | String | Short code, unique (e.g., `RH`, `MKT`, `IT`) |
| `name` | String | Full name (e.g., "Recursos Humanos") |
| `pelouroId` | UUID | FK → Pelouro |
| `isActive` | Boolean | Soft-delete |

---

## Entity 3 — Area (Cost Center)

An operational unit within a Direção. Identified by a cost center code.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | String | Cost center code, unique (e.g., `CC-101`, `CC-MKT-01`) |
| `name` | String | Cost center description (e.g., "Área de Marketing Digital") |
| `direcaoId` | UUID | FK → Direção |
| `isActive` | Boolean | Soft-delete |

---

## Entity 4 — Employee

A person to whom IT items can be assigned.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `employeeNumber` | String | Internal HR number, unique |
| `firstName` | String | |
| `lastName` | String | |
| `email` | String | Unique |
| `areaId` | UUID | FK → Area |
| `company` | String? | Legal entity (e.g., `"Super Bock Bebidas"`, `"VMPS"`). Optional; populated from SAP HR export. |
| `isActive` | Boolean | Inactive employees keep their assignment history |

**Derived (not stored):**
- `fullName` = `firstName + ' ' + lastName`
- `direcao` = via `Area.direcaoId`
- `pelouro` = via `Area.Direção.pelouroId`

---

## Entity 5 — ServiceCategory

A catalogue grouping for IT items, used to organise the catalogue and aggregate reporting.

> **Added 2026-03-10.** Categories are configurable — the initial set is pre-seeded but new ones can be added by the DSI team.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | String | Unique identifier (e.g., `WORKPLACE_HW`) |
| `name` | String | Display name (e.g., "Workplace Hardware") |
| `description` | Text | Optional — explains what belongs in this category |
| `color` | String | Hex color for UI badges (e.g., `#3B82F6`) |
| `sortOrder` | Integer | Controls display order in lists and reports |
| `isActive` | Boolean | Inactive categories cannot be assigned to new items |

**Initial categories (pre-seeded):**

| sortOrder | code | name | Description |
|---|---|---|---|
| 1 | `WORKPLACE_HW` | Workplace Hardware | Laptops, desktops, tablets, monitors, peripherals |
| 2 | `WORKPLACE_SW` | Workplace Software | Office suite, VPN, antivirus, productivity tools |
| 3 | `CLOUD_SVC` | Cloud Services | SharePoint storage, AI subscriptions, EDI/SMS communications, cloud consumption |
| 4 | `BUSINESS_APP` | Business Applications | Applications used by specific business areas (e.g., Jotform, eGoi, SoftExpert) |
| 5 | `DIRECT_APP` | Directly Charged Applications | Applications managed by DSI but directly invoiced to business areas by the vendor |

**Rules:**
- Every `ITItem` must belong to exactly one `ServiceCategory`
- Deleting a category is only permitted if it has no associated items

---

## Entity 6 — ITItem

An item in the IT catalogue that can be assigned to employees.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `code` | String | Unique (e.g., `HW-LAPTOP`, `SW-O365`, `APP-JOTFORM`) |
| `name` | String | Display name (e.g., "Laptop", "Office 365", "Jotform") |
| `serviceCategoryId` | UUID | FK → ServiceCategory. Mandatory. |
| `fundingModel` | Enum | `CORPORATE` \| `CHARGEBACK` |
| `unit` | String | Unit label for the price (e.g., `unidade`, `utilizador/mês`, `GB/mês`) |
| `description` | Text | Optional notes |
| `isActive` | Boolean | Inactive items cannot be newly assigned |

**Rule:** Only `CHARGEBACK` items can be assigned to employees and appear in chargeback reports.
`CORPORATE` items are in the catalogue for reference only.

**Example items per category:**

| ServiceCategory | fundingModel | Example Items |
|---|---|---|
| Workplace Hardware | `CHARGEBACK` | Laptop, Desktop, Tablet, Monitor adicional, Periféricos |
| Workplace Software | `CHARGEBACK` | Office 365, VPN Client, Antivírus, PowerBI Pro |
| Cloud Services | `CHARGEBACK` | SharePoint Storage (acima da quota), Copilot, ChatGPT Enterprise, EDI, SMS |
| Business Applications | `CHARGEBACK` | Jotform, eGoi, SoftExpert, Oracle FSM, AutoCAD |
| Directly Charged Applications | `CHARGEBACK` | Rolling Legal, Thingsboard, (vendor-billed tools) |
| *(any category)* | `CORPORATE` | SAP, Salesforce, Bizagi, Rede MPLS (never assigned) |

---

## Entity 7 — AnnualPrice

The unit price of an IT item for a specific calendar year.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `itItemId` | UUID | FK → ITItem |
| `year` | Integer | e.g., `2026` |
| `unitPrice` | Decimal | Price per unit, in EUR |
| `notes` | Text | Optional (e.g., source of price, contract reference) |

**Constraint:** One price per (`itItemId`, `year`) pair — unique.
Historical prices are never deleted; only future-year prices are edited.

---

## Entity 8 — Assignment

Records that a given employee has a certain quantity of an IT item in a given year.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `employeeId` | UUID | FK → Employee |
| `itItemId` | UUID | FK → ITItem (must be `CHARGEBACK`) |
| `year` | Integer | The year this assignment applies to |
| `quantity` | Decimal | Quantity assigned (usually an integer, but decimal allowed for partial units) |
| `notes` | Text | Optional (e.g., "2 monitors — home office setup") |

**Constraint:** One assignment per (`employeeId`, `itItemId`, `year`) — unique.
If the quantity changes mid-year, update the existing record.

---

## Entity 9 — DirectCost

A fixed annual cost charged directly to an Area (cost center), with no per-employee breakdown.
Used for software services that DSI allocates at cost-center level rather than per user
(e.g., Oracle FSM, ISQE, Hightail, RPA processes, SharePoint storage, EDI).

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `areaId` | UUID | FK → Area |
| `itItemId` | UUID | FK → ITItem (must be `CHARGEBACK`) |
| `year` | Integer | The year this cost applies to |
| `totalCost` | Decimal | Total annual amount charged to this area, in EUR |
| `notes` | String? | Optional (e.g., "Oracle FSM — 50% of annual contract", "RPA DICs process") |

**Constraint:** One record per (`areaId`, `itItemId`, `year`) — unique.
The same IT item can appear as a `DirectCost` on multiple areas in the same year (e.g., Thingsboard charged to both the SAT area and a second area).

**Rule:** Items used in `DirectCost` do not need an `AnnualPrice` record.
`AnnualPrice.unitPrice` remains optional/reference-only for these items.

---

## Entity 10 — User *(app users only)*

DSI team members who log in to the application.

| Attribute | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `email` | String | Unique, used as login |
| `name` | String | Display name |
| `passwordHash` | String | Bcrypt hash |
| `isActive` | Boolean | |

---

## Relationships Summary

| From | To | Cardinality | Note |
|---|---|---|---|
| Pelouro | Direção | 1 : N | A pelouro has many directions |
| Direção | Area | 1 : N | A direction has many areas (cost centers) |
| Area | Employee | 1 : N | An area has many employees; each employee belongs to exactly one area |
| **Area** | **DirectCost** | **1 : N** | **An area can have many direct cost records (one per item per year)** |
| Employee | Assignment | 1 : N | An employee has many assignments |
| **ServiceCategory** | **ITItem** | **1 : N** | **Every item belongs to exactly one category** |
| ITItem | Assignment | 1 : N | An item can be assigned to many employees |
| **ITItem** | **DirectCost** | **1 : N** | **An item can appear as a direct cost on multiple areas** |
| ITItem | AnnualPrice | 1 : N | One price per item per year (optional for DirectCost items) |
| Assignment | AnnualPrice | N : 1 | Linked via `(itItemId, year)` |

---

## What was intentionally removed (vs. v1 model)

| V1 entity | Reason removed |
|---|---|
| Statement | No longer needed — reports are computed on demand |
| BillingPeriod | Replaced by simple `year` integer on assignments |
| AllocationKey | Replaced by direct `quantity × unitPrice` |
| Challenge | No dispute workflow |
| Approval | No approval workflow |
| AuditLog | Out of MVP scope |
