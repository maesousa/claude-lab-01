# IT Chargeback App — Project Documentation

> **Owner:** DSI — Super Bock Group
> **Last updated:** 2026-03-10

---

## What we're building

A simple internal web application for the DSI team to manage IT cost allocation (chargeback) to business areas.

**Replaces:** Excel-based process
**Core calculation:** `allocated cost = assigned quantity × unit price`
**Reports:** chargeback amounts per employee, per direction, per pelouro

---

## Application Design

| # | Document | Description |
|---|---|---|
| 1 | [Functional Scope](./app/01-functional-scope.md) | What the app does — features and boundaries |
| 2 | [Core Entities](./app/02-core-entities.md) | Data model — entities, attributes, relationships |
| 3 | [Main Screens](./app/03-main-screens.md) | UI screens, navigation, key interactions |
| 4 | [Calculation Logic](./app/04-calculation-logic.md) | How chargeback amounts are computed |
| 5 | [Technical Architecture](./app/05-technical-architecture.md) | Tech stack, project structure, deployment |

---

## Business Analysis (Reference)

> The following documents capture the domain analysis and official chargeback policy rules.
> They informed the data model and cost classification logic, but the application itself is intentionally simpler.

| # | Document | Description |
|---|---|---|
| — | [Business Process](./01-business-process.md) | End-to-end process & policy scope |
| — | [Actors & Roles](./02-actors-and-roles.md) | Roles and responsibilities |
| — | [Workflow States](./03-workflow-states.md) | Statement lifecycle (v1 design, not implemented) |
| — | [Business Rules](./04-business-rules.md) | Policy rules and cost classification |
| — | [Key Entities](./05-key-entities.md) | Full domain model (v1) |
| — | [MVP Scope](./06-mvp-scope.md) | V1 scope and open questions |
| — | [Gap Analysis](./07-gap-analysis.md) | Design vs. official policy comparison |
