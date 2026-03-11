# 02 — Actors & Roles

> This document defines all human actors in the IT Cost Transfer process, their organizational position, responsibilities, and system permissions.

---

## Actor Overview

| Actor | Org. Side | Primary Concern | System Role |
|---|---|---|---|
| DSI Director | DSI | Governance, oversight, final DSI authority | `dsi_director` |
| DSI Controller | DSI | Process execution, data accuracy, ERP posting | `dsi_controller` |
| Business Area Manager | Business | Operational review of IT charges | `ba_manager` |
| Business Area Controller | Business | Financial validation and formal approval | `ba_controller` |
| System (automated) | N/A | Notifications, deadlines, audit logging | — |

> **Dual-role users — Decision 2026-03-10:**
> A single person may hold both `ba_manager` and `ba_controller` roles for the same business area. When this is the case, the Controller sign-off is **automatically applied** by the system as soon as the Manager review is complete — no second explicit gesture is required from the user. The audit log nevertheless records both actions as distinct entries (one per role), preserving logical separation at the data level.

---

## Actor 1 — DSI Director

### Profile
The DSI Director is the head of the IT department. They have full visibility over all cost transfers and hold the final decision-making authority on the DSI side, including challenge responses and process governance.

### Responsibilities
- Review and formally approve all cost transfer statements before dispatch
- Validate DSI's position in response to business area challenges
- Monitor the global status of all ongoing cost transfer cycles
- Resolve escalated disputes bilaterally with Business Area Managers
- Define or authorize changes to allocation keys and service rates

### Permissions

| Action | Permitted |
|---|---|
| View all statements (all business areas) | ✅ |
| Approve a statement for sending | ✅ |
| Return a statement to DSI Controller for correction | ✅ |
| Validate challenge response before sending to BA | ✅ |
| Override a challenge decision | ✅ |
| Create / edit cost lines | ❌ (delegated to DSI Controller) |
| Post to ERP | ❌ (delegated to DSI Controller) |

---

## Actor 2 — DSI Controller / Finance

### Profile
The DSI Controller is the operational owner of the cost transfer process. They prepare all statements, manage the data, handle the challenge back-and-forth, and generate the final posting file for ERP.

### Responsibilities
- Collect raw cost data from accounting / ERP systems
- Build cost transfer statements using allocation keys
- Attach supporting documents (invoices, usage reports)
- Submit statements to DSI Director for approval
- Correct statements following DSI Director feedback
- Communicate with business areas (via the application)
- Analyze incoming challenges and prepare DSI's response
- Generate the final posting file for the ERP once all statements are approved
- Archive completed dossiers

### Permissions

| Action | Permitted |
|---|---|
| Create and edit draft statements | ✅ |
| Submit for DSI Director review | ✅ |
| View all statements | ✅ |
| Respond to challenges (draft response) | ✅ |
| Generate ERP posting file | ✅ |
| Archive completed statements | ✅ |
| Approve statements (requires DSI Director) | ❌ |
| Approve challenge responses (requires DSI Director) | ❌ |

---

## Actor 3 — Business Area Manager

### Profile
The Business Area Manager is the operational leader of a given business unit. They have the most context on what IT services their area actually consumed and whether the charges seem accurate and proportional.

> If this person also holds the `ba_controller` role, completing the Manager review automatically triggers the Controller sign-off. No second step is required.

### Responsibilities
- Review all cost lines in their area's statement
- Challenge individual cost lines if they believe there is an error
- Provide justification and supporting documents for challenges
- Accept DSI's response to a challenge (or escalate)
- Coordinate with their Business Area Controller before formal approval

### Permissions

| Action | Permitted |
|---|---|
| View their own business area's statements | ✅ |
| View cost line detail and supporting documents | ✅ |
| Submit a challenge on one or more cost lines | ✅ |
| Accept DSI's challenge response | ✅ |
| Escalate a rejected challenge to DSI Director | ✅ |
| Formally approve a statement | ❌ (reserved for BA Controller role — even if same person) |
| View other business areas' statements | ❌ |

---

## Actor 4 — Business Area Controller

### Profile
The Business Area Controller is the finance counterpart in the business unit. They work closely with the BA Manager and are responsible for the formal financial validation and approval of the cost transfer statement.

> If this person also holds the `ba_manager` role, the system automatically performs the sign-off once the Manager review is complete. The sign-off is recorded in the audit log under the `ba_controller` role, but requires no additional action from the user.

### Responsibilities
- Review the financial impact of the cost transfer on their area's budget
- Verify that all challenges have been resolved satisfactorily
- Formally approve (sign off) the statement so it can proceed to ERP posting
- Coordinate with central Finance for budget adjustments if needed

### Permissions

| Action | Permitted |
|---|---|
| View their own business area's statements | ✅ |
| View cost line detail and challenge history | ✅ |
| Formally approve a statement | ✅ |
| Return a statement for additional challenge | ✅ (only before approval) |
| View other business areas' statements | ❌ |
| Edit cost lines or challenge outcomes | ❌ |

---

## Actor 5 — System (Automated)

The system acts as an automated actor for the following tasks:

| Responsibility | Trigger |
|---|---|
| Send email notification when a statement is dispatched | On status → `SENT` |
| Send reminder when a review deadline is approaching | X days before deadline |
| Auto-accept a statement if no response by the deadline | On deadline expiry |
| Log all state transitions and actor actions | On every action |
| Send notification when a challenge is raised | On challenge creation |
| Send notification when DSI responds to a challenge | On challenge response |
| Send notification when a statement is fully approved | On status → `APPROVED` |
| Send notification when a statement is posted | On status → `POSTED` |

---

## RACI Matrix

> R = Responsible | A = Accountable | C = Consulted | I = Informed

| Activity | DSI Director | DSI Controller | BA Manager | BA Controller |
|---|---|---|---|---|
| Define allocation keys | A | R | C | C |
| Collect cost data | I | R/A | — | — |
| Prepare draft statement | I | R/A | — | — |
| Approve statement for sending | R/A | C | — | — |
| Dispatch statement to business area | I | R/A | I | I |
| Review cost lines | — | I | R/A | C |
| Submit challenge | — | I | R/A | C |
| Respond to challenge | A | R | I | I |
| Formally approve statement | I | I | C | R/A |
| Post to ERP | I | R/A | — | — |
| Archive dossier | I | R/A | I | I |
