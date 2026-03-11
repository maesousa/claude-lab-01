# 03 — Workflow States

> This document defines the complete lifecycle of a **Cost Transfer Statement**, including all states, transitions, guards (conditions), and the actors who trigger each transition.

---

## Statement Lifecycle Overview

A Cost Transfer Statement goes through two parallel tracks:
1. **Main statement lifecycle** — from preparation to archiving
2. **Challenge sub-workflow** — triggered when a business area disputes one or more cost lines

---

## Statement States

| State | Code | Description |
|---|---|---|
| Draft | `DRAFT` | Statement is being prepared by DSI Controller. Not yet visible to business areas. |
| Pending DSI Review | `PENDING_DSI_REVIEW` | Statement has been submitted to DSI Director for internal approval. |
| Pending Correction | `PENDING_CORRECTION` | DSI Director has sent the statement back to DSI Controller with feedback. |
| Sent | `SENT` | Approved by DSI Director and dispatched to the business area. Review window is open. |
| Under Business Review | `UNDER_BA_REVIEW` | Business area (Manager + Controller) is actively reviewing the statement. |
| Challenged | `CHALLENGED` | One or more cost lines are under formal dispute by the business area. |
| Challenge Under DSI Review | `CHALLENGE_PENDING_DSI` | DSI Controller has received the challenge and is preparing a response. |
| Partially Accepted | `PARTIALLY_ACCEPTED` | DSI has accepted some challenges; corrected lines are being reworked. |
| Approved | `APPROVED` | Business Area Controller has formally approved the final statement. |
| Pending Posting | `PENDING_POSTING` | Statement is validated; DSI Controller is generating the ERP posting file. |
| Posted | `POSTED` | Accounting entries have been posted in the ERP. |
| Archived | `ARCHIVED` | Full dossier has been archived. Terminal state. |
| Cancelled | `CANCELLED` | Statement has been cancelled (e.g., billing period error, duplicate). Terminal state. |

---

## State Transition Table

| From State | Transition / Event | Guard (Condition) | To State | Actor |
|---|---|---|---|---|
| — | Create statement | Billing period defined | `DRAFT` | DSI Controller |
| `DRAFT` | Submit for DSI review | At least one cost line exists | `PENDING_DSI_REVIEW` | DSI Controller |
| `PENDING_DSI_REVIEW` | Approve for sending | DSI Director signs off | `SENT` | DSI Director |
| `PENDING_DSI_REVIEW` | Request correction | Issues found | `PENDING_CORRECTION` | DSI Director |
| `PENDING_CORRECTION` | Resubmit | Corrections applied | `PENDING_DSI_REVIEW` | DSI Controller |
| `DRAFT` | Cancel | Error detected before submission | `CANCELLED` | DSI Controller / DSI Director |
| `SENT` | Open for BA review | BA notified and logged in | `UNDER_BA_REVIEW` | System (auto) |
| `UNDER_BA_REVIEW` | Submit challenge | BA raises dispute on ≥1 line | `CHALLENGED` | BA Manager |
| `UNDER_BA_REVIEW` | Approve | BA Controller signs off | `APPROVED` | BA Controller |
| `UNDER_BA_REVIEW` | Auto-accept (timeout) | Deadline exceeded, no action | `APPROVED` | System (auto) |
| `CHALLENGED` | Assign to DSI | Challenge received | `CHALLENGE_PENDING_DSI` | System (auto) |
| `CHALLENGE_PENDING_DSI` | Reject challenge | DSI provides justification | `UNDER_BA_REVIEW` | DSI Director |
| `CHALLENGE_PENDING_DSI` | Accept challenge (full) | DSI corrects all contested lines | `PENDING_DSI_REVIEW` | DSI Controller |
| `CHALLENGE_PENDING_DSI` | Accept challenge (partial) | DSI corrects some lines | `PARTIALLY_ACCEPTED` | DSI Controller |
| `PARTIALLY_ACCEPTED` | Resubmit corrected | Corrections validated by DSI Dir | `SENT` | DSI Director |
| `UNDER_BA_REVIEW` | Escalate | BA escalates rejected challenge | (bilateral resolution → manual) | BA Manager |
| `APPROVED` | Mark for posting | All approvals complete | `PENDING_POSTING` | DSI Controller |
| `PENDING_POSTING` | Confirm posted | ERP entries confirmed | `POSTED` | DSI Controller |
| `POSTED` | Archive | Archiving complete | `ARCHIVED` | System (auto) |
| Any active state | Cancel | Critical error, authorised | `CANCELLED` | DSI Director |

---

## Challenge Sub-Workflow

A challenge is a child entity linked to a specific cost line within a statement.

### Challenge States

| State | Code | Description |
|---|---|---|
| Open | `CHALLENGE_OPEN` | Challenge submitted by BA Manager, awaiting DSI review |
| Under DSI Review | `CHALLENGE_DSI_REVIEW` | DSI Controller analyzing the challenge |
| Accepted | `CHALLENGE_ACCEPTED` | DSI accepts the challenge; cost line will be corrected |
| Rejected | `CHALLENGE_REJECTED` | DSI rejects the challenge with justification |
| Escalated | `CHALLENGE_ESCALATED` | BA has escalated a rejected challenge to DSI Director |
| Resolved | `CHALLENGE_RESOLVED` | Challenge closed (accepted, withdrawn, or escalation resolved) |

### Challenge Transition Table

| From | Event | To | Actor |
|---|---|---|---|
| — | BA submits challenge | `CHALLENGE_OPEN` | BA Manager |
| `CHALLENGE_OPEN` | DSI picks up | `CHALLENGE_DSI_REVIEW` | DSI Controller |
| `CHALLENGE_DSI_REVIEW` | Accept | `CHALLENGE_ACCEPTED` | DSI Controller (+ DSI Director) |
| `CHALLENGE_DSI_REVIEW` | Reject with justification | `CHALLENGE_REJECTED` | DSI Controller (+ DSI Director) |
| `CHALLENGE_REJECTED` | BA escalates | `CHALLENGE_ESCALATED` | BA Manager |
| `CHALLENGE_REJECTED` | BA withdraws | `CHALLENGE_RESOLVED` | BA Manager |
| `CHALLENGE_ACCEPTED` | Correction applied | `CHALLENGE_RESOLVED` | System (auto) |
| `CHALLENGE_ESCALATED` | Bilateral resolution | `CHALLENGE_RESOLVED` | DSI Director + BA Manager |

---

## State Machine Diagram

```
                    ┌─────────┐
                    │  DRAFT  │◄──────────────────────┐
                    └────┬────┘                       │
                         │ submit                     │ resubmit (correction)
                         ▼                            │
               ┌──────────────────┐         ┌────────────────────┐
               │ PENDING_DSI_REVIEW│────────►│ PENDING_CORRECTION │
               └────────┬─────────┘  needs   └────────────────────┘
                        │ approved    fix
                        ▼
                    ┌────────┐
                    │  SENT  │
                    └────┬───┘
                         │ (system: BA opens)
                         ▼
               ┌──────────────────┐
               │ UNDER_BA_REVIEW  │◄─────────────────────────┐
               └──┬───────────┬───┘                          │
                  │ challenge  │ approve                      │
                  ▼           ▼                              │
           ┌──────────┐  ┌──────────┐                        │
           │CHALLENGED│  │ APPROVED │                        │
           └─────┬────┘  └─────┬────┘                        │
                 │ (system)    │                             │ reject
                 ▼             │          ┌───────────────────┴────────┐
      ┌──────────────────────┐ │          │ CHALLENGE_PENDING_DSI       │
      │CHALLENGE_PENDING_DSI │─┼──────────┤ (accept / reject / partial) │
      └──────────────────────┘ │          └────────────────────────────┘
                 │ accept      │                        │ partial accept
                 │ (full)      │                        ▼
                 │         ┌───┴──┐            ┌──────────────────┐
                 └────────►│DRAFT │            │ PARTIALLY_ACCEPTED│
                 (corrected)│     │            └────────┬─────────┘
                            └─────┘                    │ resubmit
                                                       ▼
                                                    ┌──────┐
                                                    │ SENT │
                                                    └──────┘

          ┌──────────┐   mark for posting   ┌─────────────────┐
          │ APPROVED │─────────────────────►│ PENDING_POSTING │
          └──────────┘                      └────────┬────────┘
                                                     │ confirmed
                                                     ▼
                                               ┌────────┐
                                               │ POSTED │
                                               └───┬────┘
                                                   │ auto-archive
                                                   ▼
                                              ┌──────────┐
                                              │ ARCHIVED │
                                              └──────────┘

          Any active state ──── cancel ────► CANCELLED
```

---

## Notifications by State Transition

| Transition | Recipients | Channel |
|---|---|---|
| `DRAFT` → `PENDING_DSI_REVIEW` | DSI Director | In-app + email |
| `PENDING_DSI_REVIEW` → `PENDING_CORRECTION` | DSI Controller | In-app + email |
| `PENDING_DSI_REVIEW` → `SENT` | BA Manager, BA Controller | In-app + email |
| Deadline approaching (T-3 days) | BA Manager, BA Controller | Email reminder |
| `UNDER_BA_REVIEW` → `CHALLENGED` | DSI Controller, DSI Director | In-app + email |
| `CHALLENGE_PENDING_DSI` → accepted/rejected | BA Manager | In-app + email |
| `UNDER_BA_REVIEW` → `APPROVED` | DSI Controller, DSI Director | In-app + email |
| `POSTED` | BA Manager, BA Controller | In-app + email |
