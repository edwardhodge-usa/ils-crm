# Tasks "By Assigned" Filter

**Date:** 2026-03-05
**Goal:** Add assignee filtering to the Tasks categories sidebar so users can scope tasks to themselves (replacing Apple Reminders for personal to-do tracking).

## Use Case

Users need to filter tasks by assignee to see their own tasks for the day. Example flow: open Tasks, auto-scoped to "Edward Hodge" from last session, click "Today" in Smart Lists — see exactly what needs doing today.

## Design

### Sidebar Layout (top to bottom)

1. **By Assigned** (new — top section, acts as scope selector)
2. **Smart Lists** (existing — All, Overdue, Today, Scheduled, No Date, Waiting, Completed)
3. **By Type** (existing — 12 task types)

### By Assigned Section Contents

- **All** — default on first visit, no pill, label + total count
- **One row per assignee** — initials pill + full name + task count, sorted alphabetically
- **Unassigned** — grey pill with dash, label "Unassigned", count of tasks with null assigned_to. Always last.

### Pill Design

- 20x20px rounded-full with 2-letter initials (10px font, semi-bold, white text)
- Deterministic color from existing specialty palette (hash of name)
- Active state: solid accent bg on row, pill keeps its color, text goes white
- Unassigned pill: --bg-tertiary background, --text-secondary initials

### Compound Filtering

- Assignee selection AND-ed with Smart List and Type filters
- Counts in Smart Lists and By Type update to reflect active assignee scope
- Example: "Edward Hodge" + "Today" = Edward's tasks due today

### State Persistence

- Store last-selected assignee alongside existing filter state per tab
- Default to "All" on first visit, restore last state on subsequent visits

### Scalability

- Assignee list built dynamically from task data (no hardcoded names)
- Works as new Airtable collaborators are added
- Section scrolls if list grows
