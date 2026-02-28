# ILS CRM — Architecture Decisions

## Decision Log

### D001: Project as Master CRM Hub (2026-02-27)
**Decision**: This project serves as the single source of truth for all ILS CRM Airtable work — schema design, API integrations, automations, and eventually the Electron CRM app.
**Rationale**: ContactEnricher only touches Contacts sync. A dedicated project prevents CRM schema knowledge from being scattered across multiple apps.
**Impact**: All Airtable schema changes, improvements, and new table designs originate from this project.

### D002: Phased Approach (2026-02-27)
**Decision**: Build in phases:
- Phase 0: Airtable schema audit & improvement (current)
- Phase 1: API scripts & automations
- Phase 2: Electron CRM app (read-only views)
- Phase 3: Full CRUD Electron app with AI features
**Rationale**: Get the data foundation right before building UI. Schema issues cascade into every integration.

### D003: Electron + React + TS Stack (2026-02-27)
**Decision**: Use the same stack as all other Custom Apps (Electron + React + TypeScript + Vite + Tailwind).
**Rationale**: Consistency with existing apps. Shared patterns in `_master/`. Edward is familiar with the build/package workflow.

### D004: Airtable as Backend (2026-02-27)
**Decision**: Airtable serves as the primary database. No separate backend server.
**Rationale**: Edward already has the ILS CRM base with 11 interconnected tables. Airtable provides views, automations, and a web UI for free. API rate limits (5 req/sec) are acceptable for a single-user desktop app.
