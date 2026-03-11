# 06 — MVP Scope

> The MVP (Minimum Viable Product) is the smallest version of the application that delivers real value to users, replaces the current tool's core functions, and can be validated in production.
>
> **Design principle:** Cover the critical path end-to-end, even if some features are simplified. Defer optimizations, integrations, and advanced features to subsequent iterations.

---

## MVP Goals

1. Replace the existing tool with a functional equivalent that supports the full statement lifecycle
2. Formalize the review, challenge, and approval workflow with proper access control
3. Provide a clear audit trail for every action
4. Reduce email/spreadsheet coordination between DSI and business areas
5. Give the DSI Director real-time visibility on all statement statuses

---

## MVP — In Scope

### 1. User & Access Management
- [x] Login (email + password or SSO)
- [x] Four user roles: `DSI_DIRECTOR`, `DSI_CONTROLLER`, `BA_MANAGER`, `BA_CONTROLLER`
- [x] Role-based access control: data scoping by business area for BA roles
- [x] User management by DSI Controller (create, deactivate users, assign to business areas)

### 2. Reference Data Management
- [x] Business Area CRUD (code, name, cost center, manager, controller)
- [x] Service Catalog CRUD (code, name, category, unit, default rate)
- [x] Allocation Key CRUD (name, type, description, approval by DSI Director)
- [x] Billing Period creation and lifecycle management (OPEN → IN_PROGRESS → CLOSED)

### 3. Statement Lifecycle — DSI Side
- [x] Create a draft statement for a billing period × business area
- [x] Add / edit / remove cost lines (service, allocation key, quantity, rate, amount)
- [x] Attach supporting documents (file upload) to a statement or cost line
- [x] Submit a statement for DSI Director review
- [x] DSI Director approve / request correction workflow
- [x] Dispatch approved statement to business area (with email notification)
- [x] Set review deadline at dispatch time

### 4. Statement Lifecycle — Business Area Side
- [x] Business area actors see their own statements (scoped by role)
- [x] View cost lines, amounts, allocation key details, supporting documents
- [x] BA Manager: submit a challenge on a specific cost line with justification
- [x] BA Controller: formally approve a statement (sign-off)
- [x] Auto-acceptance on deadline expiry (system action, logged)

### 5. Challenge Workflow
- [x] Challenge creation by BA Manager (cost line, justification, optional suggested amount)
- [x] DSI Controller receives challenge notification
- [x] DSI Controller drafts a response (accept / reject with justification)
- [x] DSI Director validates DSI's response before it is sent
- [x] BA Manager receives response; can accept or escalate (once)
- [x] Escalation is flagged in the system; resolution tracked manually and closed by DSI Director

### 6. Status Dashboard
- [x] DSI Director & DSI Controller: overview of all statements across all billing periods (status, business area, total amount, days until deadline)
- [x] BA Manager & BA Controller: overview of their business area's statements
- [x] Filter by billing period, business area, status
- [x] Visual indicator for overdue statements and pending actions

### 7. Audit Trail
- [x] Complete audit log per statement: all state transitions with actor, timestamp, and comment
- [x] Challenge history per cost line (all messages and responses)
- [x] Accessible to DSI Director and DSI Controller

### 8. Notifications
- [x] Email notification on statement dispatch
- [x] Email reminder 3 business days before review deadline
- [x] Email notification on challenge submission (to DSI)
- [x] Email notification on challenge response (to BA)
- [x] Email notification on statement approval (to DSI)

### 9. Document Export
- [x] Export a statement as PDF (printable format with all cost lines, allocation keys, and amounts)
- [x] Export the audit log for a statement as PDF or CSV

### 10. ERP Posting Support (lightweight)
- [x] DSI Controller can manually mark a statement as "Posted" and enter the ERP posting reference
- [x] Export a summary CSV of all approved statements in a billing period (for manual ERP import)

---

## MVP — Out of Scope (Post-MVP)

| Feature | Rationale |
|---|---|
| Direct ERP integration (API) | Complex, ERP-specific; high implementation cost for MVP |
| Automated cost data import from ERP | Requires ERP connector; manual entry acceptable for MVP |
| Automatic allocation key calculation | Allocation keys entered manually in MVP |
| Hierarchical org structure navigation | Flat business area list sufficient for MVP |
| Multi-currency management | Single currency (EUR) for MVP |
| Mobile app / native application | Web browser access sufficient |
| Advanced analytics / BI dashboards | Basic status dashboard sufficient |
| Document management (versioning, DMS integration) | File upload to the application sufficient |
| Bulk challenge operations | Challenges raised individually per cost line |
| Public API / integrations with other systems | Not required for MVP |
| Self-registration / user onboarding flow | Users created by DSI Controller |

---

## MVP Success Criteria

| Criterion | Measure |
|---|---|
| All 4 actors can perform their core workflow actions | Validated by user acceptance testing (UAT) |
| End-to-end statement lifecycle works without email/Excel | Demonstrated in a dry run with real data |
| No data loss compared to the existing tool | Migration or parallel run verified |
| Audit trail captures all workflow actions | Verified by DSI Director review |
| At least one quarterly billing cycle completed in production | Go-live milestone |

---

## Open Questions / Decisions Required

| # | Question | Impact | Owner |
|---|---|---|---|
| OQ-1 | What is the current tool being replaced? What data needs to be migrated? | Migration complexity, go-live risk | DSI Director + DSI Controller |
| OQ-2 | What ERP/accounting system is used? What is the expected posting format? | BR-061, Entity `erpPostingRef` | DSI Controller + Finance |
| OQ-3 | What is the authentication mechanism? (internal SSO, Azure AD, local accounts?) | User management, security | DSI Director + IT Security |
| OQ-4 | Are business areas already defined in a reference system? Can we import them? | Setup effort | DSI Controller |
| OQ-5 | What is the exact legal archiving duration required? (10 years assumed) | Storage and archiving design | Legal / Compliance |
| OQ-6 | Is the review deadline always 15 business days or is it configurable per statement? | BR-022 | DSI Director |
| OQ-7 | What happens if a business area is split or merged mid-year? | Entity design edge case | DSI Director |
| ~~OQ-8~~ | ~~Should the BA Manager and BA Controller always be different people, or can one person hold both roles?~~ | ✅ **Resolved 2026-03-10** — A single person may hold both roles. The system maintains logical separation: two explicit, distinct actions are always required regardless. See BR-006, BR-007. | — |
| OQ-9 | What is the hosting model? (on-premise, private cloud, SaaS) | Architecture, security | DSI Director |
| OQ-10 | Is there a need to manage statement visibility at a finer grain (e.g., some cost lines confidential)? | Data model complexity | DSI Director |
| OQ-11 | Are support/helpdesk costs billed separately to business areas (outside this policy) or fully absorbed by DSI? | Process scope | DSI Director + DSI Controller |
| OQ-12 | Are IT project hours (development, integration) charged to business areas, and if so, under what mechanism and policy? | Process scope | DSI Director |
| OQ-13 | Does "UAD" (Unidade de Área de Negócio) map exactly to an accounting cost centre, or is there a separate organisational mapping required? | `BusinessArea.uadCode` / ERP integration | DSI Controller + Finance |
| OQ-14 | Who is responsible for maintaining the Corporate/Chargeback classification in the Service Catalog — DSI Director exclusively, or can DSI Controller propose with Director approval? | BR-072, access control | DSI Director |
| OQ-15 | For services currently classified as CORPORATE (e.g., SAP), are there any foreseeable exceptions where a specific UAD could be charged? | ServiceCatalog model edge case | DSI Director |

---

## Suggested MVP Delivery Phases

| Phase | Scope | Duration (estimate) |
|---|---|---|
| **Phase 0** | Project setup, data migration plan, UAT planning | 2 weeks |
| **Phase 1** | Auth, reference data, statement CRUD, DSI internal approval | 4 weeks |
| **Phase 2** | Statement dispatch, BA review, auto-acceptance, approvals | 3 weeks |
| **Phase 3** | Challenge workflow, notifications, audit log | 3 weeks |
| **Phase 4** | Dashboard, PDF export, ERP posting support, UAT | 3 weeks |
| **Total MVP** | | **~15 weeks** |

---

## Technology Recommendations (To Be Decided)

> The following are suggestions for discussion. Final choices depend on team skills, hosting constraints, and existing tech landscape.

| Layer | Recommendation | Alternative |
|---|---|---|
| Frontend | React + TypeScript | Vue.js, Next.js |
| Backend | Node.js (Express / Fastify) or Python (FastAPI) | Java (Spring Boot) |
| Database | PostgreSQL | MySQL |
| Auth | OAuth 2.0 / OpenID Connect (Azure AD or Keycloak) | Local JWT auth |
| File storage | S3-compatible object storage | Local filesystem |
| Email | SMTP relay or SendGrid/Mailjet | Internal mail server |
| Hosting | Docker on private cloud or on-premise VM | Managed PaaS |
