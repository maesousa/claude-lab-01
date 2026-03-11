# 04 — Business Rules

> Business rules are constraints, policies, and validations that the system must enforce to ensure the integrity and correctness of the IT Cost Transfer process.
>
> **Convention:**
> - `BR-xxx` = Business Rule
> - **Priority:** P1 = Mandatory (must be enforced by system) | P2 = Important (enforced with warning/bypass possible) | P3 = Advisory (guidance, no enforcement)

---

## Category 1 — Authorization & Access Control

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-001 | Only a DSI Director can approve a statement for dispatch to business areas. | P1 | Approval by DSI Controller alone is insufficient. |
| BR-002 | A business area actor can only view statements addressed to their own business area. | P1 | No cross-area visibility. |
| BR-003 | Only a Business Area Controller can perform the formal approval (sign-off) of a statement. | P1 | BA Manager review is required but not sufficient for sign-off. |
| BR-004 | Only a DSI Director can authorize the cancellation of a statement that has already been sent. | P1 | Cancellation of `DRAFT` or `PENDING_CORRECTION` can be done by DSI Controller. |
| BR-005 | DSI Director must validate DSI's response to a challenge before it is communicated to the business area. | P1 | DSI Controller prepares the response; DSI Director approves it. |
| BR-006 | A user may hold both `BA_MANAGER` and `BA_CONTROLLER` roles simultaneously for the same business area. This is the only permitted dual-role combination. DSI roles (`DSI_DIRECTOR`, `DSI_CONTROLLER`) cannot be combined with BA roles. | P1 | Decided 2026-03-10. |
| BR-007 | When a single user holds both BA roles, the system **automatically performs the Controller sign-off** once the Manager review is complete (no second explicit gesture required). The audit log must still record both actions as distinct entries, each tagged with its respective role (`ba_manager` and `ba_controller`). Logical separation is preserved in the data layer; it is collapsed in the UX. | P1 | Decided 2026-03-10. Separation is structural (audit trail), not interactional. |

---

## Category 2 — Statement Integrity

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-010 | A statement must contain at least one cost line before it can be submitted for DSI review. | P1 | Empty statements cannot be submitted. |
| BR-011 | All cost lines must have a positive amount (> 0). | P1 | Zero-amount lines must be removed or justified. |
| BR-012 | All cost lines must reference a valid service from the Service Catalog. | P1 | Free-text services are not permitted; the catalog must be maintained. |
| BR-013 | All cost lines must reference a valid Allocation Key. | P1 | Ensures traceability and justifiability of each charge. |
| BR-014 | The sum of allocated amounts for a service line across all business areas must not exceed the total cost of that service. | P1 | Prevents over-allocation. |
| BR-015 | A statement cannot be modified once it reaches `SENT` status, except through the formal challenge-and-correction process. | P1 | Ensures integrity after dispatch. |
| BR-016 | A posted statement (`POSTED` or `ARCHIVED`) is immutable. Any correction requires creating a new counter-statement. | P1 | Ensures accounting integrity. |
| BR-017 | Each statement must be uniquely identified and linked to a single billing period and a single business area. | P1 | One statement per (billing period × business area) combination. |

---

## Category 3 — Billing Period & Timing

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-020 | A billing period must have a defined start date, end date, and type (Quarterly / Ad hoc). | P1 | Period must be formally defined before statements can be created. |
| BR-021 | Two statements for the same billing period and same business area cannot coexist in active status. | P1 | Prevents duplicate billing. |
| BR-022 | The business area review window must be set at dispatch time and must be at least 5 business days. | P1 | Ensures business areas have sufficient time to review. |
| BR-023 | If the business area does not take any action before the review deadline, the statement is automatically marked as approved (auto-acceptance). | P1 | Auto-approval must be logged and all parties notified. |
| BR-024 | A reminder notification must be sent to the business area 3 business days before the review deadline. | P2 | Default: 3 days; configurable by DSI Controller. |
| BR-025 | DSI must respond to a challenge within 5 business days of receiving it. | P2 | SLA target; system sends alert at day 3 if no response. |

---

## Category 4 — Challenge Rules

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-030 | A challenge must be submitted at the cost line level (not at the total statement level). | P1 | Granularity required for proper resolution. |
| BR-031 | A challenge must include a written justification. | P1 | Free-text; minimum 20 characters. |
| BR-032 | A challenge may optionally include a suggested corrected amount. | P2 | Helps DSI assess the business area's position. |
| BR-033 | Only one open challenge may exist per cost line at any given time. | P1 | Prevents conflicting parallel challenges. |
| BR-034 | A challenge can only be submitted while the statement is in `UNDER_BA_REVIEW` status. | P1 | Challenges after approval are not permitted. |
| BR-035 | A rejected challenge may be escalated only once by the business area. | P1 | Escalation is a bilateral process between DSI Director and BA Manager. |
| BR-036 | If DSI accepts a challenge (full or partial), the corrected statement must be re-approved by the DSI Director before being re-sent. | P1 | Avoids unchecked corrections being sent. |
| BR-037 | Withdrawal of a challenge by the business area does not affect the original cost line amount. | P1 | Withdrawal ≠ acceptance of a different amount. |

---

## Category 5 — Allocation Keys

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-040 | Each allocation key must have a defined type: Usage-based, Headcount-based, Fixed rate, or Negotiated share. | P1 | Ensures the method is documented. |
| BR-041 | Allocation keys must be validated and agreed upon between DSI and business areas at the start of each fiscal year (or prior to an ad hoc billing period). | P2 | Agreement is documented outside the system (contract or signed memo). |
| BR-042 | Any change to an allocation key mid-period must be approved by the DSI Director and notified to affected business areas. | P1 | Change takes effect in the next billing period, not retroactively. |
| BR-043 | The historical allocation key used for a given cost line must be preserved at the time of statement creation (snapshot). | P1 | Ensures auditability even if keys change later. |

---

## Category 6 — Audit & Traceability

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-050 | All state transitions must be logged with: actor, timestamp, previous state, new state, and optional comment. | P1 | Immutable audit log. |
| BR-051 | All approval actions must capture the actor's identity and timestamp. | P1 | Electronic signature equivalent. |
| BR-052 | All supporting documents attached to a statement must be retained for the duration of the legal archiving period (minimum 10 years). | P1 | Compliance requirement. |
| BR-053 | Auto-acceptance events must be logged as system-generated actions and must be distinguishable from explicit approvals by a human actor. | P1 | Audit clarity. |
| BR-054 | No records may be permanently deleted. Cancellation marks records as inactive; archiving freezes them. | P1 | Data immutability policy. |

---

## Category 7 — Financial & ERP Rules

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-060 | ERP posting can only be initiated once all statements for a billing period are in `APPROVED` status. | P2 | DSI Controller may choose to post per statement; this is a recommended practice. |
| BR-061 | The ERP posting file format must comply with the target accounting system's import specification. | P1 | Format TBD based on the ERP in use. |
| BR-062 | Each posted statement must reference its ERP posting reference (journal entry number or batch ID). | P1 | Required for reconciliation. |
| BR-063 | No financial amount may be modified after posting. Corrections require a reversal + new statement. | P1 | Accounting integrity. |

---

## Category 8 — Cost Classification (Corporate vs. Chargeback)

> Rules derived from the official policy *"Regras de imputação de custos IT"* (SBG/DSI, 13/02/2026).

| ID | Rule | Priority | Notes |
|---|---|---|---|
| BR-070 | Every service in the Service Catalog must be classified as either `CORPORATE` (cost borne by DSI, never charged to business areas) or `CHARGEBACK` (cost transferred to the consuming business area). | P1 | Funding model is a mandatory attribute of the Service Catalog. |
| BR-071 | A service classified as `CORPORATE` must **never** appear as a cost line in a chargeback statement. The system must prevent DSI Controllers from adding CORPORATE services to a statement. | P1 | Prevents accidental double-charging. Example: SAP, Salesforce, MPLS network, SBG Data Centers. |
| BR-072 | The `fundingModel` classification (`CORPORATE` vs `CHARGEBACK`) of a service is set and maintained exclusively by the DSI Director. Changes to this classification require DSI Director approval and take effect only from the next billing period. | P1 | Classification changes are not retroactive. |
| BR-073 | Regardless of whether a service is classified as `CORPORATE` or `CHARGEBACK`, **technical ownership and decision authority always remain with DSI**. A business area may not unilaterally adopt, substitute, or discontinue a DSI-managed service. | P1 | Per policy: "a decisão e responsabilidade do hardware/software é da DSI". |
| BR-074 | A challenge or rejection of a cost line by a business area is a **financial dispute only**. It does not constitute an opt-out from the service, nor does it grant the area the right to substitute the service with an alternative. | P1 | Derived from BR-073. |
| BR-075 | The allocation basis for a cost line must be consistent with the service's nature: `PER_UNIT` for workstation-type services where the area controls quantity; `USAGE_VOLUME` for services billed by IT consumption metrics (documents, API calls, GB); `BUSINESS_ACTIVITY` for costs that fluctuate with a business KPI (e.g., number of invoices issued); `AREA_SPECIFIC` for solutions fully attributed to one area with a fixed or negotiated cost. | P1 | Allocation basis is defined in the Service Catalog and cannot be overridden at the cost line level without DSI Director approval. |

---

## Business Rules Summary Table

| Category | Rules | P1 Count | P2 Count |
|---|---|---|---|
| Authorization & Access Control | BR-001 to BR-007 | 7 | 0 |
| Statement Integrity | BR-010 to BR-017 | 8 | 0 |
| Billing Period & Timing | BR-020 to BR-025 | 3 | 3 |
| Challenge Rules | BR-030 to BR-037 | 7 | 1 |
| Allocation Keys | BR-040 to BR-043 | 3 | 1 |
| Audit & Traceability | BR-050 to BR-054 | 5 | 0 |
| Financial & ERP Rules | BR-060 to BR-063 | 3 | 1 |
| Cost Classification | BR-070 to BR-075 | 6 | 0 |
| **Total** | **42** | **42** | **6** |
