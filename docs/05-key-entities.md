# 05 — Key Entities

> This document defines the core domain entities, their attributes, relationships, and invariants. This is a **conceptual data model** — not a database schema. Implementation details (column types, indices, ORM specifics) are deferred to the technical design phase.

---

## Entity Map

```
BillingPeriod ──────────────── 1:N ──────────────── Statement
                                                         │
                                                     1:N │
                                                         ▼
ServiceCatalog ──── 1:N ──── CostLine ◄──── AllocationKey
                                │
                            1:N │
                                ▼
                            Challenge ────── 1:N ──── ChallengeMessage
                                │
                            1:N │
                                ▼
                            Approval ◄──── User (via role)
                                │
                            1:N │
                                ▼
                            AuditLog

BusinessArea ────── 1:N ──── Statement
User ─────────────── N:M ──── BusinessArea (via membership)
User ─────────────── has ──── Role
```

---

## Entity 1 — BillingPeriod

Represents a defined time window for which cost transfers are prepared. All statements are anchored to a billing period.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `code` | String | Human-readable code (e.g., `Q1-2026`, `AD-HOC-2026-03`) |
| `label` | String | Display name (e.g., "Q1 2026", "March IT Audit") |
| `type` | Enum | `QUARTERLY` \| `AD_HOC` |
| `startDate` | Date | First day of the billing period |
| `endDate` | Date | Last day of the billing period |
| `status` | Enum | `OPEN` \| `IN_PROGRESS` \| `CLOSED` |
| `createdBy` | User ref | DSI Controller who created the period |
| `createdAt` | Timestamp | |

**Invariants:**
- `endDate` > `startDate`
- A period in `CLOSED` status cannot have new statements created
- Only one `OPEN` or `IN_PROGRESS` quarterly period at a time

---

## Entity 2 — Statement

The central entity. Represents a cost transfer statement addressed to one specific business area for one billing period.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `reference` | String | Human-readable reference (e.g., `STMT-2026-Q1-IT-RH`) |
| `billingPeriodId` | BillingPeriod ref | The period this statement covers |
| `businessAreaId` | BusinessArea ref | The receiving business area |
| `status` | Enum | See workflow states (doc 03) |
| `totalAmount` | Decimal | Sum of all accepted cost lines |
| `currency` | String | ISO 4217 (e.g., `EUR`) |
| `reviewDeadline` | Date | Deadline for business area response |
| `dispatchedAt` | Timestamp | When the statement was sent |
| `approvedAt` | Timestamp | When the BA Controller signed off |
| `postedAt` | Timestamp | When ERP posting was confirmed |
| `erpPostingRef` | String | Journal entry or batch ID from ERP |
| `notes` | Text | Internal notes from DSI |
| `createdBy` | User ref | DSI Controller |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

**Invariants:**
- Unique per (`billingPeriodId`, `businessAreaId`)
- `totalAmount` = sum of non-challenged or resolved cost line amounts
- `status` transitions are governed by the state machine (see doc 03)

---

## Entity 3 — CostLine

A single line item within a statement. Represents one IT service charge for the billing period.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `statementId` | Statement ref | Parent statement |
| `serviceId` | ServiceCatalog ref | The IT service being charged |
| `allocationKeyId` | AllocationKey ref | The allocation method used |
| `allocationKeySnapshot` | JSON | Snapshot of the key at time of statement creation (immutable) |
| `quantity` | Decimal | Consumed quantity (e.g., number of users, GB, hours) |
| `unitRate` | Decimal | Rate per unit |
| `amount` | Decimal | `quantity × unitRate` |
| `currency` | String | ISO 4217 |
| `description` | Text | Human-readable description of the charge |
| `supportingDocUrl` | String | Link to invoice or usage report |
| `status` | Enum | `ACTIVE` \| `CHALLENGED` \| `CORRECTED` \| `CANCELLED` |
| `correctedAmount` | Decimal | Amount after challenge resolution (if different) |
| `createdAt` | Timestamp | |

**Invariants:**
- `amount` > 0
- `amount` = `quantity × unitRate` (calculated, not free-entered)
- If `status = CORRECTED`, `correctedAmount` must be set
- A `CHALLENGED` line cannot be further challenged until the current challenge is resolved

---

## Entity 4 — ServiceCatalog

Defines all IT services managed by DSI, including both corporate (absorbed by DSI) and chargeback (transferred to business areas) services.

> **Updated 2026-03-10** following validation against the official policy *"Regras de imputação de custos IT"* (SBG/DSI, 13/02/2026). See gap analysis doc 07.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `code` | String | Internal code (e.g., `HW-PC`, `SW-OFFICE365`, `COMM-SMS`) |
| `name` | String | Display name |
| `category` | Enum | Official cost nature category: `HARDWARE_CLOUD` \| `SOFTWARE_DATA` \| `COMMUNICATIONS` |
| `fundingModel` | Enum | `CORPORATE` (DSI absorbs, never charged) \| `CHARGEBACK` (transferred to consuming area). Set and modified exclusively by DSI Director (see BR-072). |
| `allocationBasis` | Enum | How cost is allocated: `PER_UNIT` (area controls quantity, e.g., PC per user) \| `USAGE_VOLUME` (IT consumption metric: documents, API calls, GB) \| `BUSINESS_ACTIVITY` (fluctuates with a business KPI, e.g., invoice volume) \| `AREA_SPECIFIC` (fully attributed to one area, fixed or negotiated). Only relevant when `fundingModel = CHARGEBACK`. |
| `description` | Text | Detailed description of the service |
| `unit` | String | Unit of measure consistent with `allocationBasis` (e.g., `user/month`, `GB`, `invoice`, `month`) |
| `defaultRate` | Decimal | Standard rate per unit (can be overridden per cost line with DSI Director approval) |
| `currency` | String | ISO 4217 |
| `isActive` | Boolean | Whether the service is currently available |
| `validFrom` | Date | Effective start date |
| `validTo` | Date | Effective end date (nullable) |
| `examples` | Text | Illustrative real-world examples (e.g., "Office 365, Teams, PowerBI, Copilot") |

**Invariants:**
- `code` is unique
- A service with `fundingModel = CORPORATE` cannot be added as a cost line to any statement (BR-071)
- `allocationBasis` must be set when `fundingModel = CHARGEBACK`
- An inactive service cannot be used in new cost lines
- Changes to `fundingModel` require DSI Director approval and are not retroactive (BR-072)

**Reference: Corporate vs. Chargeback examples (from official policy)**

| fundingModel | category | Examples |
|---|---|---|
| `CORPORATE` | `HARDWARE_CLOUD` | Data Center infra, corporate MPLS network, central cloud base, centrally-managed multimedia |
| `CORPORATE` | `SOFTWARE_DATA` | SAP, Salesforce, Bizagi, Autentico, IT management tools |
| `CORPORATE` | `COMMUNICATIONS` | Corporate MPLS WAN, central Internet connectivity |
| `CHARGEBACK` | `HARDWARE_CLOUD` | PCs, tablets, peripherals, area-specific hardware, UAD Data Lake |
| `CHARGEBACK` | `SOFTWARE_DATA` | Office 365, Teams, PowerBI, Copilot, eGoi, Thingsboard, Oracle FSM, AutoCAD, RPA agents, GenAI tools, SharePoint/Teams storage above quota |
| `CHARGEBACK` | `COMMUNICATIONS` | EDI, SMS to business partners, mobile/fixed lines (individual or operational) |

---

## Entity 5 — AllocationKey

Defines the method used to attribute a chargeback service cost to a specific business area.
The type must be consistent with the service's `allocationBasis` (see BR-075).

> **Updated 2026-03-10** — added `BUSINESS_ACTIVITY` type following policy validation.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `name` | String | Display name (e.g., "FTE headcount Q1 2026", "Invoice volume Q1 2026") |
| `type` | Enum | Allocation method — see table below |
| `metricDescription` | String | What is being measured (e.g., "Number of active Office 365 users", "Number of e-invoices issued") |
| `description` | Text | Full explanation of how the key is calculated and sourced |
| `referenceValue` | Decimal | Total reference value across all areas (e.g., total FTE, total invoices). Used to compute each area's share. |
| `effectiveFrom` | Date | When this key became effective |
| `effectiveTo` | Date | When this key expires (nullable) |
| `approvedBy` | User ref | DSI Director who validated the key |
| `approvedAt` | Timestamp | |
| `supportingDocUrl` | String | Link to supporting data or agreement |

**Allocation Key Types**

| Type | Description | Typical services |
|---|---|---|
| `PER_UNIT` | Cost × quantity consumed by the area. Area has autonomy over quantity. | PCs, tablets, peripherals, individual software licenses (Office 365, Teams) |
| `USAGE_VOLUME` | Cost proportional to an IT consumption metric (documents processed, API calls, GB used) | RPA agents, GenAI tools, storage above quota, external API usage |
| `BUSINESS_ACTIVITY` | Cost proportional to a business KPI that drives IT usage (e.g., number of invoices, transactions) | E-invoice archiving, EDI messages, SMS to partners |
| `AREA_SPECIFIC` | Full cost attributed to one area; fixed or negotiated for the period | Area-specific software (eGoi, Oracle FSM, AutoCAD), UAD-specific hardware or cloud |

**Invariants:**
- `effectiveTo` > `effectiveFrom` if set
- A key must be approved by the DSI Director before it can be used in cost lines
- The key `type` must match the associated service's `allocationBasis` (enforced at cost line creation)

---

## Entity 6 — BusinessArea

Represents an internal business unit that receives cost transfer statements.

> **Terminology note:** In SBG organisational vocabulary, a BusinessArea corresponds to a **UAD** (*Unidade de Área de Negócio*). The terms are used interchangeably in this documentation. See OQ-13 for clarification on whether UAD maps exactly to an accounting cost centre.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `code` | String | Internal code aligned with SBG UAD codes (e.g., `RH`, `FIN`, `COMERCIAL`) |
| `name` | String | Full name (e.g., "Recursos Humanos") |
| `uadCode` | String | Official UAD code from the SBG org chart (for ERP reconciliation) |
| `parentId` | BusinessArea ref | For hierarchical org structures (nullable) |
| `managerUserId` | User ref | Default BA Manager |
| `controllerUserId` | User ref | Default BA Controller |
| `costCenterCode` | String | Corresponding accounting cost center in the ERP |
| `isActive` | Boolean | |

---

## Entity 7 — Challenge

A formal dispute raised by a business area on one cost line.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `costLineId` | CostLine ref | The challenged cost line |
| `statementId` | Statement ref | Parent statement (denormalized for queries) |
| `status` | Enum | See challenge states (doc 03) |
| `justification` | Text | Written reason for the challenge (min. 20 chars) |
| `suggestedAmount` | Decimal | Business area's proposed correct amount (optional) |
| `dsiResponse` | Text | DSI's written response |
| `resolvedAmount` | Decimal | Final agreed amount after resolution |
| `isEscalated` | Boolean | Whether the challenge was escalated |
| `submittedBy` | User ref | BA Manager |
| `submittedAt` | Timestamp | |
| `respondedBy` | User ref | DSI Controller (draft) / DSI Director (approved) |
| `respondedAt` | Timestamp | |
| `resolvedAt` | Timestamp | |

**Invariants:**
- Only one `CHALLENGE_OPEN` or `CHALLENGE_DSI_REVIEW` challenge per cost line at any time
- `justification` length ≥ 20 characters
- `isEscalated` can only be set to `true` when status is `CHALLENGE_REJECTED`

---

## Entity 8 — Approval

Records a formal approval or sign-off action at a specific workflow step.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `statementId` | Statement ref | The approved statement |
| `type` | Enum | `DSI_DIRECTOR_APPROVAL` \| `BA_CONTROLLER_SIGNOFF` \| `AUTO_ACCEPTANCE` |
| `actorId` | User ref | The user who performed the action (null for auto) |
| `comment` | Text | Optional comment at time of approval |
| `timestamp` | Timestamp | |
| `fromState` | String | State before the approval |
| `toState` | String | State after the approval |

---

## Entity 9 — AuditLog

Immutable record of every significant event in the system.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `entityType` | String | `STATEMENT` \| `COST_LINE` \| `CHALLENGE` \| `ALLOCATION_KEY` etc. |
| `entityId` | UUID | ID of the affected entity |
| `action` | String | Verb describing the action (e.g., `STATUS_CHANGED`, `CHALLENGE_SUBMITTED`) |
| `actorId` | User ref | User who triggered the event (null for system actions) |
| `actorType` | Enum | `USER` \| `SYSTEM` |
| `previousValue` | JSON | State/value before the action |
| `newValue` | JSON | State/value after the action |
| `timestamp` | Timestamp | |
| `ipAddress` | String | For user actions |

**Invariants:**
- Records are append-only; no update or delete operations ever
- Every state transition in the Statement or Challenge must generate an AuditLog entry

---

## Entity 10 — User

Represents a system user, linked to one or more business areas or to the DSI.

| Attribute | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `email` | String | Primary identifier / login |
| `firstName` | String | |
| `lastName` | String | |
| `roles` | Enum[] | Set of roles assigned to this user. Allowed values: `DSI_DIRECTOR`, `DSI_CONTROLLER`, `BA_MANAGER`, `BA_CONTROLLER`. A user may hold multiple roles (see note below). |
| `businessAreaIds` | BusinessArea[] | Business areas this user belongs to (for BA roles) |
| `isActive` | Boolean | Deactivated users cannot log in or take actions |
| `lastLoginAt` | Timestamp | |
| `createdAt` | Timestamp | |

> **Note — Dual-role users (BA_MANAGER + BA_CONTROLLER):**
> A single person may be assigned both `BA_MANAGER` and `BA_CONTROLLER` for the same business area. This is common in smaller business units. When this is the case, completing the Manager review (accept all lines or resolve all challenges) **automatically triggers the Controller sign-off** — no second action is required from the user. The audit log records both events as distinct entries, each tagged with the respective role (`BA_MANAGER` then `BA_CONTROLLER`), preserving logical traceability in the data layer.

**Invariants:**
- A user assigned any DSI role (`DSI_DIRECTOR`, `DSI_CONTROLLER`) must not simultaneously hold a BA role
- A user with a BA role must have at least one `businessAreaId`
- The combination (`BA_MANAGER` + `BA_CONTROLLER`) on the same user is the only permitted dual-role combination
- `email` is unique
- `roles` must contain at least one value

---

## Entity Relationship Summary

| Relationship | Cardinality | Description |
|---|---|---|
| BillingPeriod → Statement | 1:N | One period has many statements (one per business area) |
| BusinessArea → Statement | 1:N | One business area receives many statements over time |
| Statement → CostLine | 1:N | One statement has one or more cost lines |
| CostLine → Challenge | 1:0..1 | One cost line can have at most one active challenge |
| CostLine → ServiceCatalog | N:1 | Many cost lines reference one service |
| CostLine → AllocationKey | N:1 | Many cost lines reference one key |
| Statement → Approval | 1:N | A statement may have multiple approvals (DSI + BA) |
| Statement → AuditLog | 1:N | Every action on a statement is logged |
| Challenge → AuditLog | 1:N | Every action on a challenge is logged |
| User → BusinessArea | N:M | BA users can belong to multiple areas |
