# 07 — Gap Analysis: Design vs. Official Chargeback Rules

> **Source document:** *Regras de imputação de custos IT* — Super Bock Group / DSI
> **Document date:** 13/02/2026
> **Analysis date:** 2026-03-10
> **Analyst:** Claude (Business Analyst role)

This document records the comparison between the functional design produced in docs 01–06 and
the official IT cost allocation policy. It identifies gaps, incorrect assumptions, and required
corrections, and serves as the change log for the updates applied to the domain model.

---

## Summary of Official Policy (PDF)

The policy document defines allocation rules for **three cost categories**:

| Category | Portuguese | Subcategories in scope |
|---|---|---|
| Hardware & Cloud | Hardware e Cloud | On-premise infra, cloud, networking, multimedia, workstations |
| Software & Data Storage | Software e armazenamento de dados | Licenses, subscriptions, data storage, RPA, GenAI |
| Communications | Comunicações | EDI, SMS, mobile/fixed lines for operations or individual use |

For each category, the policy establishes a **binary classification**:

| Classification | Who bears the cost | Criterion |
|---|---|---|
| **Corporate** (`CORPORATE`) | DSI absorbs — never charged to business areas | Centrally decided, centrally managed, benefits the whole company |
| **Chargeback** (`CHARGEBACK`) | Transferred to consuming business area | Area-specific, area-autonomous, usage-indexed, or area-requested |

### Governing Principle
> *"The principle is that cost and benefit must reside in the same budget management unit."*
> Regardless of who ultimately bears the cost, **service ownership and technical decision authority always remain with DSI**.

---

## Gap 1 — Scope: Missing cost categories ⚠️ INCORRECT ASSUMPTION

### What we had
Our initial scope included:
- Infrastructure (servers, cloud, network)
- Software licenses
- Helpdesk & support charges ← **NOT in the policy**
- IT project hours reimbursable to business areas ← **NOT in the policy**

### What the policy says
Scope is strictly:
1. Software licensing / subscriptions
2. Hardware acquisition / rental (physical or cloud)
3. Communications associated with digital processes

**Support/helpdesk and IT project hours are NOT covered by this chargeback policy.**

### Resolution
- Remove *support* and *IT project hours* from the default scope of the process
- Flag them as **out-of-scope** in the business process document
- Raise as open questions: are they billed separately? Are they absorbed by DSI?
- Update `ServiceCatalog.category` enum accordingly

**Impact:** `01-business-process.md` (scope), `05-key-entities.md` (ServiceCatalog)

---

## Gap 2 — Missing concept: Corporate vs. Chargeback classification ❌ NOT MODELLED

### What we had
Our `ServiceCatalog` entity had no concept of whether a service should ever be charged to business areas. Every service was implicitly a chargeback service.

### What the policy says
The most fundamental distinction in the entire policy is whether a service is:
- **Corporate** — centrally adopted, centrally managed, DSI budget → **never appears in a chargeback statement**
- **Chargeback** — area-specific, area-autonomous, or usage-indexed → **always triggers a statement**

Examples from the document:

| Service | Classification | Reason |
|---|---|---|
| SAP, Salesforce, Bizagi, Autentico | Corporate | Central platforms, DSI-managed |
| Corporate MPLS network | Corporate | Serves entire company network |
| SBG Data Center infrastructure | Corporate | Central, DSI-managed |
| Corporate cloud (common base) | Corporate | Whole-organisation platform |
| Office 365, Teams, PowerBI, Copilot | Chargeback | Workstation-level, area defines quantity |
| eGoi, Thingsboard, Oracle FSM, AutoCAD | Chargeback | Area-specific, area-requested |
| PCs, tablets, peripherals | Chargeback | Workstation, area defines quantity |
| RPA robots, AI agents | Chargeback | Usage-indexed, area-specific |
| GenAI tools (ChatGPT, etc.) | Chargeback | Usage-indexed |
| EDI, SMS to business partners | Chargeback | Operations-associated, variable |
| Mobile/fixed lines (individual/ops) | Chargeback | Individual or operations use |
| UAD Data Lake costs | Chargeback | Area-specific cloud costs |
| SharePoint/Teams storage (above quota) | Chargeback | Excess storage, area-driven |

### Resolution
- Add `fundingModel` attribute to `ServiceCatalog`: `CORPORATE | CHARGEBACK`
- Add business rule: corporate-classified services must never appear in a chargeback statement
- Add business rule: classification is set and maintained by the DSI Director

**Impact:** `04-business-rules.md` (new category), `05-key-entities.md` (ServiceCatalog)

---

## Gap 3 — ServiceCatalog categories do not match official taxonomy ⚠️ MISMATCH

### What we had
```
category: INFRASTRUCTURE | SOFTWARE_LICENSE | SUPPORT | PROJECT | OTHER
```

### What the policy says
The three official cost nature categories are:
```
HARDWARE_CLOUD | SOFTWARE_DATA | COMMUNICATIONS
```

Within each, a secondary distinction exists (corporate vs. chargeback), and within chargeback
services, a further allocation basis distinction:
- **Per unit** (e.g., 1 PC per user, 1 Teams license per user)
- **Usage volume** (e.g., documents processed, API calls, GB above quota)
- **Business activity index** (costs that fluctuate with business activity, e.g., e-invoice archiving)
- **Area-specific** (solution specific to one area, cost is fixed or negotiated)

### Resolution
- Replace `category` enum with `HARDWARE_CLOUD | SOFTWARE_DATA | COMMUNICATIONS`
- Remove `SUPPORT` and `PROJECT` (out of scope)
- Add `allocationBasis` attribute: `PER_UNIT | USAGE_VOLUME | BUSINESS_ACTIVITY | AREA_SPECIFIC`

**Impact:** `05-key-entities.md` (ServiceCatalog)

---

## Gap 4 — Service ownership principle not captured ⚠️ MISSING RULE

### What we had
No explicit rule about who retains technical authority over a service, regardless of who pays.

### What the policy says
> *"Regardless of whether the final cost allocation stays with DSI or is transferred via chargeback to business areas, **the decision and responsibility for hardware/software is DSI's**"* (stated twice — for hardware and software sections).

This has workflow implications:
- A business area cannot unilaterally decide to stop using a DSI-managed service
- A business area cannot substitute a DSI-approved solution with an unapproved one
- Challenges to charges do not imply the right to reject the service itself

### Resolution
- Add BR-070: DSI retains technical ownership and decision authority for all services, regardless of chargeback model
- Add BR-071: A challenge or rejection of a cost line is a financial dispute, not an opt-out from the service

**Impact:** `04-business-rules.md`

---

## Gap 5 — Allocation key types incomplete ⚠️ PARTIAL COVERAGE

### What we had
```
AllocationKey.type: USAGE_BASED | HEADCOUNT_BASED | FIXED_RATE | NEGOTIATED_SHARE
```

### What the policy says
The policy implies four distinct allocation mechanisms:
1. **Per-unit / headcount** — area defines quantity (PCs, licenses) → matches `HEADCOUNT_BASED`
2. **Usage volume** — measured consumption (documents, API calls, GB) → matches `USAGE_BASED`
3. **Business activity index** — fluctuates with business (e.g., e-invoice volume) → **not explicitly modelled**
4. **Area-specific fixed/negotiated** — area-requested solution, fully attributed → partially matches `FIXED_RATE` / `NEGOTIATED_SHARE`

The `BUSINESS_ACTIVITY` type is genuinely different from pure `USAGE_BASED` because the metric is a business KPI (e.g., number of invoices issued) rather than a direct IT consumption metric.

### Resolution
- Add `BUSINESS_ACTIVITY` to `AllocationKey.type` enum
- Update description to clarify the distinction between `USAGE_BASED` (IT metric) and `BUSINESS_ACTIVITY` (business KPI)

**Impact:** `05-key-entities.md` (AllocationKey)

---

## Gap 6 — "UAD" terminology not mapped ℹ️ TERMINOLOGY

### What we had
We used the generic term "Business Area" throughout.

### What the policy says
The document uses "UAD" — likely *Unidade de Área de Negócio* (Business Area Unit) — as the internal term for the receiving business unit.

### Resolution
- Add `internalCode` or note to `BusinessArea` entity that its organisational equivalent is "UAD" in SBG terminology
- No structural change required; terminology alignment only

**Impact:** `05-key-entities.md` (BusinessArea), documentation wording

---

## Summary of Required Changes

| Document | Change type | Description |
|---|---|---|
| `01-business-process.md` | Scope correction | Remove support/project hours; define 3 official cost categories; add corporate/chargeback framing |
| `04-business-rules.md` | New rules category | Add Category 8 "Cost Classification" with BR-070 to BR-075 |
| `05-key-entities.md` | Entity update | ServiceCatalog: new `fundingModel` + `allocationBasis` fields, revised `category` enum |
| `05-key-entities.md` | Entity update | AllocationKey: add `BUSINESS_ACTIVITY` type |
| `05-key-entities.md` | Terminology note | BusinessArea: note UAD equivalence |

---

## Open Questions Raised by the Policy

| # | Question | Source | Impact |
|---|---|---|---|
| OQ-11 | Are support/helpdesk costs billed separately (outside this policy) or fully absorbed by DSI? | Gap 1 | Scope definition |
| OQ-12 | Are IT project hours (development, integration) charged to business areas, and if so, under what mechanism? | Gap 1 | Scope definition |
| OQ-13 | What is the exact meaning of "UAD" in the SBG org chart — is it equivalent to a cost centre? | Gap 6 | Entity mapping |
| OQ-14 | Who is responsible for maintaining the Corporate/Chargeback classification in the service catalog — DSI Director or DSI Controller? | Gap 2 | Access control |
| OQ-15 | For services classified as Corporate, are there any exceptions where a specific business area might be charged? | Gap 2 | Edge case modelling |
