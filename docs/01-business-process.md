# 01 — Business Process

> **Process name:** IT Cost Transfer — Chargeback DSI (Imputação de Custos IT)
> **Trigger:** Quarterly closing cycle or ad hoc request
> **Policy reference:** *Regras de imputação de custos IT*, Super Bock Group / DSI, 13/02/2026

---

### In-scope cost categories (per official policy)

| Category | Examples of chargeback services |
|---|---|
| **Hardware & Cloud** | Workstation PCs/tablets/peripherals, area-specific hardware, UAD Data Lake, e-invoice archiving storage |
| **Software & Data Storage** | Office 365, Teams, PowerBI, Copilot, eGoi, Oracle FSM, AutoCAD, RPA/AI agents, GenAI tools, SharePoint storage above quota |
| **Communications** | EDI, SMS to business partners, mobile/fixed lines for individual or operational use |

### Out-of-scope (NOT covered by this chargeback process)

| Item | Status |
|---|---|
| Corporate IT platforms (SAP, Salesforce, Bizagi, Autentico, central cloud base, MPLS network, Data Centers) | **Never charged** — borne entirely by DSI budget |
| Helpdesk & support charges | **Out of scope** — see OQ-11 |
| IT project hours (development, integration) | **Out of scope** — see OQ-12 |

> **Governing principle:** Cost and benefit must reside in the same budget management unit. Services defined and propagated centrally by DSI for digital transformation are absorbed by DSI. Services that are area-specific, area-autonomous, or usage-indexed are charged to the consuming area.

---

## Overview

The IT Cost Transfer process ensures that the costs incurred by DSI to deliver IT services are fairly allocated and formally transferred to the consuming business areas. The process spans from cost collection inside DSI to financial posting in the accounting system.

The process has **five phases**, each with distinct responsibilities and deliverables.

---

## Phase 1 — Cost Collection & Preparation

**Owner:** DSI Controller / Finance
**Goal:** Assemble all IT costs for the period and allocate them to business areas using predefined allocation keys.

### Steps

| Step | Description | Actor |
|---|---|---|
| 1.1 | Define or confirm the billing period (quarter, or specific date range for ad hoc) | DSI Controller |
| 1.2 | Collect raw cost data for the three in-scope categories: (a) Hardware & Cloud — workstation equipment, area-specific hardware, UAD cloud costs; (b) Software & Data Storage — workstation licenses, area-specific software, excess storage, RPA/AI/GenAI usage; (c) Communications — EDI/SMS, mobile/fixed lines. **Only services classified as CHARGEBACK in the Service Catalog are included.** | DSI Controller |
| 1.3 | Apply allocation keys per service and per business area (usage-based, headcount-based, fixed rate, or negotiated share) | DSI Controller |
| 1.4 | Generate draft cost transfer statements — one statement per business area | DSI Controller |
| 1.5 | Attach supporting documentation (invoices, usage reports, allocation key justifications) | DSI Controller |

### Inputs
- Raw cost data from accounting / ERP (filtered to CHARGEBACK-classified services only)
- Allocation key agreements per service type (per-unit, usage-volume, business-activity-index, area-specific)
- Service catalog with rates and funding model classification

### Output
- Draft cost transfer statements (one per business area)

---

## Phase 2 — Internal DSI Review & Validation

**Owner:** DSI Director
**Goal:** Ensure accuracy and fairness of all statements before they are sent to business areas.

### Steps

| Step | Description | Actor |
|---|---|---|
| 2.1 | DSI Controller submits all draft statements for internal review | DSI Controller |
| 2.2 | DSI Director reviews the global envelope (total amount, distribution across areas) | DSI Director |
| 2.3 | DSI Director drills into individual statements if needed | DSI Director |
| 2.4 | DSI Director either approves statements for sending or sends them back with correction requests | DSI Director |
| 2.5 | DSI Controller corrects and resubmits if required | DSI Controller |

### Business Constraint
> No statement may be sent to a business area without explicit DSI Director approval.

### Output
- Validated cost transfer statements, ready for distribution

---

## Phase 3 — Distribution to Business Areas

**Owner:** DSI Controller / Finance
**Goal:** Formally communicate the validated cost transfer statements to the business areas for their review.

### Steps

| Step | Description | Actor |
|---|---|---|
| 3.1 | System notifies Business Area Manager and Business Area Controller of the new statement | System |
| 3.2 | Statement is made available in the application with full detail (cost lines, allocation keys, amounts) | System |
| 3.3 | Review deadline is set and communicated (e.g., 15 business days from dispatch) | DSI Controller |

### Output
- Notification sent and logged
- Review clock started

---

## Phase 4 — Business Area Review

**Owner:** Business Area Manager + Business Area Controller
**Goal:** The business area reviews the charges, confirms accuracy, and either approves or challenges specific items.

### Steps

| Step | Description | Actor |
|---|---|---|
| 4.1 | Business Area Manager reviews all cost lines in their area's statement | BA Manager |
| 4.2 | For each line: accept silently OR raise a formal challenge with justification | BA Manager |
| 4.3 | Business Area Controller reviews the overall financial impact and validates the total accepted amount | BA Controller |
| 4.4 | BA Controller formally approves the statement (or escalates challenges to DSI) | BA Controller |

### Sub-process: Challenge Management

When a business area challenges one or more cost lines:

| Step | Description | Actor |
|---|---|---|
| C.1 | BA Manager submits a challenge: contested line, reason, suggested correction | BA Manager |
| C.2 | DSI Controller is notified and reviews the challenge | DSI Controller |
| C.3 | DSI Director validates DSI's position | DSI Director |
| C.4a | **DSI accepts correction** → statement updated, re-enters Phase 2 for the corrected lines | DSI Controller |
| C.4b | **DSI rejects challenge** → provides written justification; BA must accept or escalate | DSI Controller |
| C.5 | If escalated, DSI Director and BA Manager resolve the dispute bilaterally | DSI Director |

### Output
- Statement approved (with or without corrections)
- All challenges resolved and documented

---

## Phase 5 — Financial Posting & Archiving

**Owner:** DSI Controller / General Finance
**Goal:** Translate the approved cost transfer into accounting entries and archive the full dossier.

### Steps

| Step | Description | Actor |
|---|---|---|
| 5.1 | DSI Controller generates the final posting file (compatible with the ERP/accounting system) | DSI Controller |
| 5.2 | Finance team posts the intercompany / internal cost transfer entries | DSI Controller / Finance |
| 5.3 | All parties are notified that the transfer is posted | System |
| 5.4 | The full dossier (statement, supporting docs, challenge history, approvals) is archived | System |

### Output
- Accounting entries posted
- Statement in ARCHIVED status
- Full audit trail preserved

---

## End-to-End Process Summary

```
[DSI Controller]         [DSI Director]        [BA Manager]        [BA Controller]        [Finance]
      │                        │                     │                     │                   │
   PHASE 1                  PHASE 2              PHASE 4a             PHASE 4b            PHASE 5
 Cost Collection         Internal Review       BA Review            BA Approval           Posting
      │                        │                     │                     │                   │
  Draft statements ──────► Review & Sign-off          │                     │                   │
                                │                     │                     │                   │
                          Validated ──────────────► Review ────────────► Approve ────────────► Post
                                                       │                                        │
                                               [Challenge?]                                  Archive
                                                       │
                                            ◄──── DSI reviews
                                            Accept / Reject
```

---

## Key Process Metrics (Target)

| Metric | Target |
|---|---|
| Time from cost collection to statement dispatch | ≤ 5 business days |
| Business area review window | 15 business days |
| Challenge resolution time (DSI response) | ≤ 5 business days |
| No-response auto-acceptance deadline | 15 business days after dispatch |
| Full cycle duration (end-to-end) | ≤ 30 business days |
