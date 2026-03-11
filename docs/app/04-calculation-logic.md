# 04 — Calculation Logic

> Two cost mechanisms. One aggregation chain. All derivations roll up the same way.

---

## Two Cost Mechanisms

### Mechanism A — Per-employee assignment

```
assignment_cost = assignment.quantity × annual_price.unitPrice
```

- `assignment` links one **employee** to one IT item for one year
- `annual_price` is the per-unit price for that item in that year
- Used for: all HW devices, Office licences, VPN, Copilot, Power BI, etc.

### Mechanism B — Direct area cost

```
direct_cost = directCost.totalCost
```

- `directCost` links one **Area** to one IT item for one year with a fixed annual amount
- No unit price, no quantity — the total is entered directly
- Used for: Oracle FSM, ISQE, Hightail, Optrak, Safemed, Rolling Legal, IDW,
  MyDataManager, SoftExpert, RPA processes, SharePoint storage, EDI, etc.

---

## Aggregation Rules

### Per Employee
```
employee_total(employeeId, year) =
  Σ assignment_cost
    for all assignments where
      assignment.employeeId = employeeId
      AND assignment.year = year
      AND assignment.itItem.fundingModel = 'CHARGEBACK'
```

### Per Area (Cost Center)
```
area_total(areaId, year) =
    Σ employee_total(e.id, year)          ← Mechanism A: per-employee assignments
      for all employees e where
        e.areaId = areaId
  + Σ directCost.totalCost               ← Mechanism B: fixed area charges
      for all DirectCost records where
        directCost.areaId = areaId
        AND directCost.year = year
        AND directCost.itItem.fundingModel = 'CHARGEBACK'
```

### Per Direção
```
direcao_total(direcaoId, year) =
  Σ area_total(a.id, year)
    for all areas a where
      a.direcaoId = direcaoId
```

### Per Pelouro
```
pelouro_total(pelouroId, year) =
  Σ direcao_total(d.id, year)
    for all directions d where
      d.pelouroId = pelouroId
```

### Grand Total
```
grand_total(year) =
  Σ pelouro_total(p.id, year)
    for all active pelouros p
```

---

## Worked Example

**Setup:**
- Employee: Ana Ferreira, Área Mk. Digital (CC-201), Dir. Marketing, Pelouro Comercial
- Área Mk. Digital also has one direct cost: Algolia (€240 fixed for the year)
- Year: 2026

**Mechanism A — Ana Ferreira's assignment costs:**

| Item | Qty | Unit Price | Line Cost |
|---|---|---|---|
| Laptop | 1 | €1.200 | €1.200 |
| Office 365 | 1 | €180 | €180 |
| Telemóvel | 1 | €480 | €480 |
| Monitor extra | 2 | €290 | €580 |
| **employee_total** | | | **€2.440** |

**Mechanism B — Área Mk. Digital direct costs:**

| Item | Total Cost |
|---|---|
| Algolia | €240 |
| **direct_cost total** | **€240** |

**Roll-up:**
```
Ana Ferreira (employee_total)         → €  2.440  (Mechanism A)
Other employees in Área Mk. Digital  → €  9.880  (Mechanism A, example)
Algolia direct cost (Mechanism B)    → €    240
─────────────────────────────────────────────────
Área Mk. Digital (area_total)        → € 12.560

Área Mk. Produto (area_total)        → €  8.200  (example)
─────────────────────────────────────────────────
Dir. Marketing (direcao_total)       → € 20.760

... + Dir. Vendas + ...
─────────────────────────────────────────────────
Pelouro Comercial (pelouro_total)    → € X.XXX
```

---

## Edge Cases

| Case | Behaviour |
|---|---|
| Case | Behaviour |
|---|---|
| Item has no price for the selected year | Assignment (Mechanism A) cannot be created. DirectCost (Mechanism B) does not require an AnnualPrice — totalCost is entered directly. |
| Employee has `isActive = false` | Their historical assignments still count in reports for years they were active. |
| Item `fundingModel = CORPORATE` | Excluded from all calculations. Cannot be assigned or used in a DirectCost. |
| `quantity = 0` | Not permitted for Assignments — the row should be deleted instead. |
| `totalCost = 0` | Not permitted for DirectCost — the row should be deleted instead. |
| Fractional quantity (e.g., `0.5`) | Allowed for Assignments. Useful for shared items or partial-year corrections. |
| Same item, multiple areas (DirectCost) | Allowed. E.g., Thingsboard can be charged to both the SAT area and a second area with different `totalCost` values — each is a separate DirectCost record. |
| Area deactivated (`isActive = false`) | Historical DirectCost records remain and are counted in reports for the relevant year. |

---

## Report Breakdown by Category

Within any aggregation level, costs can be broken down by `ITItem.serviceCategory`.
Both cost mechanisms contribute to category totals.

**At employee level** (Mechanism A only — employees have no direct costs):
```
employee_total_by_category(employeeId, year, serviceCategoryId) =
  Σ assignment_cost
    for all assignments where
      assignment.employeeId = employeeId
      AND assignment.year = year
      AND assignment.itItem.serviceCategoryId = serviceCategoryId
      AND assignment.itItem.fundingModel = 'CHARGEBACK'
```

**At area level** (both mechanisms):
```
area_total_by_category(areaId, year, serviceCategoryId) =
    Σ employee_total_by_category(e.id, year, serviceCategoryId)
      for all employees e where e.areaId = areaId
  + Σ directCost.totalCost
      for all DirectCost records where
        directCost.areaId = areaId
        AND directCost.year = year
        AND directCost.itItem.serviceCategoryId = serviceCategoryId
```

This powers the category breakdown bars on the Dashboard and optional columns in Reports.

---

## No rounding surprises

- All monetary values stored as `DECIMAL(10, 2)` — two decimal places, EUR
- Mechanism A: `quantity (DECIMAL) × unitPrice (DECIMAL)` — computed in the database
- Mechanism B: `totalCost` is stored directly; no multiplication required
- Aggregations done with `SUM()` in SQL across both assignment costs and direct costs — never in JavaScript
- Display: always formatted as `€ X.XXX,XX` (Portuguese locale)
