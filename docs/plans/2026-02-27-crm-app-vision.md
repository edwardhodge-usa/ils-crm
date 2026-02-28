# ILS CRM Desktop App — Vision Document
**Date**: 2026-02-27
**Status**: Research / Vision (not implementation-ready)

## Core Insight

Airtable is the engine. The CRM app is the steering wheel, dashboard, and GPS.

Airtable excels as a database: schema flexibility, sharing, automations, forms. But it fails as a workflow tool: no unified views, no cross-table search, slow interaction logging, no AI integration, no offline access.

## Consolidation Plan

The CRM app absorbs ContactEnricher + CompanyEnricher into a single app:
- Contact enrichment → button on Contact 360 view
- Company enrichment → button on Company 360 view
- Apple Contacts import → built-in feature
- Two-base sync (Cleanup + CRM) → background feature
- Result: One app replaces three

## Key Screens

1. **Dashboard** — Pipeline snapshot, today's tasks, follow-up alerts, activity feed
2. **Contacts** — List + 360 view (everything about a person on one screen)
3. **Companies** — List + company 360 view with linked contacts/opportunities
4. **Pipeline** — Drag-and-drop Kanban for opportunities
5. **Tasks** — Cross-entity task list, sortable by due/priority/status
6. **Reports** — Pipeline value, win rate, interaction frequency
7. **Settings** — API keys, sync config, AI preferences

## Killer Features (vs Airtable)

- **Contact 360 view** — company, opportunities, interactions, tasks, proposals on one screen
- **Global search (Cmd+K)** — fuzzy search across ALL tables simultaneously
- **Quick interaction logger (Cmd+L)** — 15 seconds vs 60+ in Airtable
- **AI meeting prep briefs** — Claude generates one-page summary before meetings
- **AI follow-up suggestions** — "No interaction in 12 days, suggest follow-up email"
- **Offline access** — local SQLite cache, syncs when reconnected
- **Keyboard-driven speed** — native app responsiveness

## Architecture

```
Electron App UI ←→ Local SQLite Cache ←→ Airtable ILS CRM Base
                         ↑
                   Sync Engine
                   - Poll every 60s
                   - Push on save
                   - Conflict: Airtable wins
```

## Phased Build

- **MVP (Phase 2 of ils-crm project)**: Dashboard, Contact list + 360, Company list, Pipeline Kanban (read-only), Quick interaction logger, Global search, Airtable sync, Apple Contacts import
- **Phase 3**: AI briefs, follow-up suggestions, email drafts, auto-categorization, company enrichment
- **Phase 4**: Full reporting, bulk operations, offline mode, proposal tracking

## What Stays in Airtable

- Schema changes (no code needed)
- Portal integration (imaginelab-portal reads/writes directly)
- Sharing data with collaborators
- Ad-hoc queries and one-off views
- Simple automations
