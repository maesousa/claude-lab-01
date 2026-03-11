# 06 — Excel Gap Analysis

> **Source file:** `01_Chargeback_2026_Master_Final.xlsx` (6.1 MB, 25 sheets, ~3,000 employee rows)
> **Purpose:** Validate the MVP data model against the real Excel process before coding starts.
> **Verdict:** MVP model is mostly sound. One structural gap requires a small but important model addition.

---

## 1. Excel Workbook Overview

### Sheet inventory

| Role | Sheet(s) | Notes |
|---|---|---|
| **Core data — values** | `MASTER - Valor` | ~3,000 rows × 51 cols; one row per employee; all cost columns are `qty × price` formulas |
| **Core data — quantities** | `MASTER - Quantidades` | Same employee list; all quantity columns are VLOOKUPs from inventory/M365 exports |
| **Price table** | `Tabela Preços` | ~38 items with unit prices hardcoded in col C; referenced as `$C$5`…`$C$43` |
| **Summary report** | `ChargeBack 26` | 2025 actual vs 2026 projected by Pelouro + Área; delta columns |
| **Pivot outputs** | `PIVOT Totais Não mexer`, `PIVOT Resumo`, `Pivot Quant`, `Pivot Valor` | Aggregations sourced from MASTER sheets; used by ChargeBack 26 |
| **Employee master** | `Colaboradores` | ~2,950 rows from SAP HR export; fields: N°, name, empresa, CC, description, functional group, email |
| **HW inventory** | `Inventario filtrado` (active, ~1,985 devices), `Inventario Bruto` (full, ~7,232), `Gestão de Equipa` (raw copy) | CMDB export; includes assignment to employee (serial → contact lookup) |
| **HW pivot** | `Master Não mexer Pivot` | Employee N° → device type counts; VLOOKUP source for MASTER - Quantidades HW columns |
| **SW license export** | `users_8_13_2025 10_50_53 AB` | ~1,904 rows; Azure AD/M365 export; email → E3/F3/VPN/Copilot/PBI/Visio/Project flags |
| **SW cost details** | `ChargeBack SW total`, `AM ChargeBack`, `DG_ChargeBack` | Per-software per-CC allocations; split by "responsible" (AM, PNM, DG) |
| **Reference tables** | `Legenda`, `HW`, `Microsoft` | Glossaries and lookup codes |
| **CC hierarchy** | `EstruturaCC`, `EstruturaCC_DSI` | Full cost center hierarchy table (2,465 rows, 66 cols) |
| **Special allocations** | `Sharepoint` | SharePoint storage cost split proportionally by CC usage |
| **Legend/empty** | `EDI` | Completely empty — EDI cost data not yet populated |
| **Hidden** | `Tabela` | 2025 vs 2026 HW price comparison; intermediate working table |

---

## 2. Org Hierarchy — Excel vs MVP

### What the Excel uses

The MASTER sheets have exactly these org columns:

```
Pelouro | Área | Centro de custo | Designação Centro de custo
```

The `ChargeBack 26` summary report aggregates at **Pelouro + Área** (2 levels — "Nivel 1" and "Nivel 2").

The `EstruturaCC` table exposes a richer 7-level corporate hierarchy, but for chargeback purposes only these 3 operational levels matter:

| Excel label | Example value | Role in chargeback |
|---|---|---|
| `Pelouro` | Supply Chain | Top grouping |
| `Área` | Produção | Sub-grouping (dept) |
| `Centro de custo` | C03302 | Lowest unit; employee belongs here |

### Mapping to the MVP model

| Excel field | MVP entity | MVP field | Match? |
|---|---|---|---|
| `Pelouro` | `Pelouro` | `name` | ✅ Direct |
| `Área` | `Direção` | `name` | ✅ — name differs; concept identical |
| `Centro de custo` (code) | `Area` | `code` | ✅ Direct |
| `Designação Centro de custo` | `Area` | `name` | ✅ Direct |
| Employee belongs to CC | `Employee` | `areaId` | ✅ Direct |

> **Conclusion:** The 4-level MVP hierarchy (Pelouro → Direção → Area → Employee) correctly captures the Excel's 3-level data structure. The MVP's "Direção" = Excel's "Área"; the MVP's "Area" = Excel's "Centro de Custo". No change needed here.

### Real Pelouro names (for seeding)

From the Excel (ChargeBack 26):

| Pelouro | Áreas (Direções) |
|---|---|
| Administrativo / Financeira | Compras, Financeira, Planeamento e CG, Projeto SAP |
| Áreas de Suporte | Auditoria Interna, Org. Sociais, Sistemas de Informação, … |
| Comercial | On Trade, Off Trade, Customer Development, … |
| Marketing | Marketing |
| Supply Chain | Logística, Produção, … |
| Turismo | Turismo |

---

## 3. IT Catalogue — Excel vs MVP

### Hardware items (Sheet: `Tabela Preços` + `Legenda`)

| Excel ID | Description | Unit price 2026 | Qty 2026 |
|---|---|---|---|
| D1 | Desktop (Fixo) | €210 | 273 |
| L0 | Portátil Estagiários/Trainees | €250 | 27 |
| L1 | Portátil Standard | €357 | 671 |
| L2 | Laptop Ultramobilidade | €400 | 28 |
| L3 | Laptop Executivo Diretor | €490 | 10 |
| L4 | Laptop Executivo Administrador | €490 | 4 |
| T1 | Tablet Bundle Tipo 1 (Vendedores On-Trade) | €340 | 200 |
| T2 | Tablet Bundle Tipo 2 (Vendedores Off-Trade) | €340 | 32 |
| T3 | Tablet Bundle Tipo 3 (Partilhados) | €208 | 62 |
| T4 | Tablet Bundle Tipo 4 (AT) | €266 | 164 |
| T5 | Tablet Bundle Tipo 5 (Entregadores) | €255 | 168 |

All 11 HW items have a per-unit annual price and are assigned per-employee. **→ Fits MVP model exactly.**

### Software items (Sheets: `Tabela Preços`, `ChargeBack SW total`, `DG_ChargeBack`)

| Name | Price 2026 | Allocation method | Category |
|---|---|---|---|
| Office E3 | €460/user | Per-employee (M365 export) | Workplace Software |
| Office F3 | €130/user | Per-employee (M365 export) | Workplace Software |
| VPN SAP | €52/user | Per-employee (M365 export) | Workplace Software |
| MS Copilot | €360/user | Per-employee (M365 export) | Cloud Services |
| Power BI | €135/user | Per-employee (M365 export) | Workplace Software |
| Visio | €145/user | Per-employee (M365 export) | Workplace Software |
| Project | €287/user | Per-employee (M365 export) | Workplace Software |
| SharePoint/Teams storage | ~€2,492 (total) | Proportional by CC usage | Cloud Services |
| ChatGPT Team | €300 total | Per-area (fixed) | Cloud Services |
| MS Copilot (AM areas) | €360/user | Per-employee | Cloud Services |
| Thingsboard | €9,411.93 total | Fixed → SAT area | Business Applications |
| Jotform | €774 total | Fixed → (area TBD) | Business Applications |
| QRCode Generator | €150 total | Fixed | Business Applications |
| Algolia | €240 total | Fixed | Business Applications |
| eGoi | €1,486 total | Fixed | Business Applications |
| GCP UAD Comercial | €24,000 total | Fixed → Comercial areas | Cloud Services |
| RPA (DICs) | €1,067 total | Fixed → Assessoria Fiscal CC | Cloud Services |
| RPA (Extratos) | €1,961 total | Fixed → Gestão Financeira CC | Cloud Services |
| RPA (Câmbios) | €1,068 total | Fixed → Gestão Financeira CC | Cloud Services |
| RPA (Docs Colabs) | multiple | Fixed → HR CC | Cloud Services |
| RPA (Mestre Clientes) | €1,195 total | Fixed → BI Comercial CC | Cloud Services |
| Winshuttle | €4,862–12,934 | Fixed → specific CCs | Business Applications |
| Crowdstrike | €44/server × 30 | Per-server | Workplace Software |
| EDI | €38,204 total | Fixed per message volume | Cloud Services |
| Rolling Legal | €799.50 | **Direto à Área** | Directly Charged |
| IDW (Portal Fornecedores) | €1,230 | **Direto à Área** | Directly Charged |
| MyDataManager | €7,021.25 | **Direto à Área** | Directly Charged |
| ISQE (Cornerstone) | €51,025.49 | **Direto à Área** | Directly Charged |
| Oracle FSM | €86,751 | **Direto à Área** | Directly Charged |
| Hightail | €26,370 | **Direto à Área** | Directly Charged |
| Optrak | €41,000 | **Direto à Área** | Directly Charged |
| Safemed | €5,058.50 | **Direto à Área** | Directly Charged |
| SoftExpert | €15,352.64 | **Direto à Área** | Directly Charged |

Total: ~32 software items across 5 service categories.

---

## 4. Pricing Model — Excel vs MVP

### Two distinct pricing mechanisms revealed

The Excel uses **two fundamentally different mechanisms** to allocate IT costs:

#### Mechanism A — Per-employee assignment (quantity × unit price)

> Used for: all HW devices, Office E3/F3, VPN, Copilot, PBI, Visio, Project

```
cost = assignment.quantity × item.unitPrice
```

An employee can have 1 laptop, 2 monitors, 1 Office E3 licence, etc.
The unit price is the same for all employees (set annually in Tabela Preços).

**→ This is exactly what the MVP Assignment model supports.** ✅

#### Mechanism B — Fixed annual cost charged directly to an Area (cost center)

> Used for: Oracle FSM, ISQE, Hightail, Optrak, Safemed, Rolling Legal, IDW,
> MyDataManager, SoftExpert, Thingsboard, GCP UAD, RPA processes, Winshuttle, EDI, SharePoint

```
cost = fixed_annual_amount (assigned directly to a cost center / Area)
```

No per-employee breakdown exists. The total cost of the service is charged to a specific Area (cost center), not spread across individual employees. The `ChargeBack SW total` sheet classifies these as either **"Charge back"** (allocated via DSI's mechanism) or **"Direto à Área"** (vendor invoices directly; DSI manages the record).

**→ The MVP data model currently has NO way to represent this.** ❌

---

## 5. Gap Analysis

### Gap 1 — CRITICAL: Direct Area Cost assignment (missing entity)

**Problem:** The current `Assignment` entity requires an `employeeId`. It models cost only as `employee ↔ item`. But ~20 of the 32 SW items are charged directly to an Area (cost center) with a fixed annual cost — there is no per-employee breakdown.

**Impact:** Without this, the MVP cannot represent the chargeback for:
- All "Directly Charged Applications" (Oracle, ISQE, Hightail, Optrak, Safemed, Rolling Legal, IDW, MyDataManager, SoftExpert)
- Most "Business Applications" (Thingsboard, Jotform, Algolia, eGoi, GCP UAD, Winshuttle)
- RPA processes (5 distinct charge lines)
- SharePoint/Teams storage
- EDI

This is **more than half the catalogue by item count** and likely **a significant fraction of total chargeback value**.

**Proposed fix — add `DirectCost` entity:**

```
DirectCost {
  id         UUID     PK
  areaId     UUID     FK → Area
  itItemId   UUID     FK → ITItem (fundingModel must be CHARGEBACK)
  year       Int
  totalCost  Decimal(10,2)   — the annual cost charged to this area
  notes      String?         — e.g., "Oracle FSM — 50% of annual contract"
  @@unique([areaId, itItemId, year])
}
```

**Calculation rule:**
```
area_direct_cost(areaId, year) = Σ directCost.totalCost
  for all DirectCost records where
    directCost.areaId = areaId
    AND directCost.year = year

area_total(areaId, year) =
  Σ employee_total(e.id, year)   ← existing per-employee assignments
  + area_direct_cost(areaId, year)  ← NEW direct costs
```

**API routes to add:** `GET/POST /api/custos-diretos`, `PATCH /api/custos-diretos/[id]`

**UI impact:** A new section on the Area detail view (within Organização or a dedicated screen) showing direct cost lines, similar to the employee detail assignment table but at area level.

---

### Gap 2 — MINOR: Same IT item can appear on multiple Areas simultaneously

**Problem:** Some services (e.g., Thingsboard) are charged to multiple areas with different amounts (AM area €9,411.93, DG area €9,647.23 in the same year). The proposed `DirectCost` unique constraint `@@unique([areaId, itItemId, year])` already handles this correctly — one record per (area, item, year) — but a single item can legitimately have `DirectCost` records in multiple areas.

**Impact:** None — the unique constraint is at the (area, item) level, not (item) level.
**Action:** No model change needed. Document this as expected behaviour.

---

### Gap 3 — MINOR: Shared / unassigned devices

**Problem:** The inventory includes ~69 devices (mainly D1 desktops, some L1 laptops) assigned to employee N°=0 — i.e., not linked to any specific person. These are shared workstations (e.g., factory floor shared terminals).

**Impact:** Low monetary impact. These devices have no `employeeId` and cannot be represented in the current `Assignment` model.

**Options:**
1. **Ignore** — shared devices are often a small fraction of total cost and may be absorbed at CC level.
2. **Model as `DirectCost`** — treat the shared device cost as a direct cost to the Area that owns the shared devices.
3. **Create a "shared pool" employee per Area** — a dummy employee record per Area named e.g., "Equipamentos Partilhados — CC-101". Simple but slightly hacky.

**Recommendation:** Option 2 (model as DirectCost) — the proposed `DirectCost` entity handles this naturally. Mark the item type as "HW" and the Area as the owning cost center.

---

### Gap 4 — MINOR: Multiple legal entities

**Problem:** The `Colaboradores` sheet shows employees from multiple companies: `D000` (Super Bock Bebidas), `AA00` (VMPS Águas e Turismo), `CIG-*` (CIG group entities). Reports may need to be filtered or sub-totalled by legal entity.

**Impact:** Depends on whether chargeback is per-entity or cross-group. The current MVP model has no `company` field on Employee or Area.

**Recommendation:** Add `company` (String, optional) to `Employee`. Populate from the SAP HR export during data migration. Can be used as a filter in reports. No structural change to the calculation logic.

---

### Gap 5 — INFORMATIONAL: AnnualPrice unit price vs. total annual cost

**Problem:** `Tabela Preços` has two pricing patterns:
- **Per-unit prices** (e.g., €357 per laptop) — used for HW and per-user SW
- **Total annual costs** (e.g., €86,751 for Oracle FSM) — used for fixed area charges

The proposed `DirectCost.totalCost` field handles fixed costs. The existing `AnnualPrice.unitPrice` handles per-unit items.

For items that will be managed as `DirectCost` records, an `AnnualPrice` record may not be meaningful. However, it doesn't hurt to have both — the `AnnualPrice` can hold the total annual contract value as a reference, even if the actual chargeback is via `DirectCost`.

**Action:** No model change. Document the two usage patterns in code comments.

---

### Gap 6 — INFORMATIONAL: IPC price escalation

**Problem:** The `DG_ChargeBack` sheet uses a 2.5% IPC (inflation) rate to calculate 2026 prices from 2025 baseline: `=C+(C×0.025)`.

**Impact:** The MVP's `AnnualPrice` model already supports per-year prices naturally. The IPC calculation is just a convenience tool for setting the new year's price — the user can enter the inflated price directly, or we can add a "copy from previous year + inflate by X%" feature to the Preços Anuais screen.

**Recommendation:** No model change. Consider adding a `[Copiar de 2025 + inflação X%]` option to the annual price copy dialog as a later enhancement.

---

## 6. Summary — Model Assessment

| Area | Status | Action required |
|---|---|---|
| Org hierarchy (Pelouro → Direção → Area → Employee) | ✅ Correct | None — maps cleanly to Excel's Pelouro → Área → CC |
| IT item catalogue (~32 items, 5 categories) | ✅ Correct | None |
| Per-unit annual pricing (HW + per-user SW) | ✅ Correct | None |
| Per-employee assignment model | ✅ Correct | None |
| **Direct-to-Area fixed cost assignment** | ❌ **Missing** | **Add `DirectCost` entity — see Gap 1** |
| Multi-entity employees (company field) | ⚠️ Missing | Add `company` field to `Employee` (minor) |
| Shared/unassigned devices | ⚠️ Minor gap | Handle via `DirectCost` or manual workaround |
| IPC price escalation | ℹ️ Informational | Future UI enhancement; no model change |
| SharePoint proportional allocation | ✅ Handled by `DirectCost` | DSI pre-calculates per-CC amount; enters as DirectCost |
| RPA per-process charging | ✅ Handled by `DirectCost` | Each RPA process = one ITItem; charged at Area level |

---

## 7. Required Model Changes (additions only)

### 7a — New entity: `DirectCost`

```prisma
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
```

### 7b — Add `company` field to `Employee`

```prisma
model Employee {
  ...
  company   String?   // e.g. "Super Bock Bebidas", "VMPS"
  ...
}
```

### 7c — Updated calculation chain

```
area_total(areaId, year) =
  Σ employee_total(e.id, year)        ← per-employee assignments
  + Σ directCost.totalCost            ← direct area charges
    for all DirectCost where
      directCost.areaId = areaId
      AND directCost.year = year
```

All higher-level aggregations (direcao_total, pelouro_total) roll up naturally from area_total.

---

## 8. What Does NOT Need to Change

- The `Assignment` entity — unchanged; handles all HW and per-user SW
- The `AnnualPrice` entity — unchanged; `DirectCost` items can optionally have an `AnnualPrice` for reference
- The `ServiceCategory` entity — the 5 existing categories are confirmed correct by the Excel
- The `ITItem.fundingModel` (CORPORATE | CHARGEBACK) — confirmed correct
- The report structure (by employee / by area / by direção / by pelouro) — all still valid, area totals now include both assignment costs and direct costs
- The `User` entity for login — unchanged
- Docker + Next.js + Prisma + PostgreSQL stack — unchanged
