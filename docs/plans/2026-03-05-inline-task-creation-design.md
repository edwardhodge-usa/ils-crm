# Inline Task Creation + UX Improvements

**Date:** 2026-03-05
**Goal:** Rewrite task creation and detail pane to match Apple Reminders UX — instant creation, inline editing, smart date suggestions.

## Changes

### 1. Instant task creation in detail pane

- "+ New Task" creates a task immediately in DB with defaults:
  - status: "To Do", assigned_to: logged-in user, task: "" (empty title)
- New task appears selected in task list, detail pane shows it with title auto-focused
- Remove navigation to /tasks/new full-page form
- Auto-save all fields on blur (existing EditableFormRow pattern)

### 2. Detail pane layout reorder

New order (top to bottom):
1. Title — 17px editable input, placeholder "New Task", auto-focused on creation
2. Notes — textarea directly below title, placeholder "Add notes"
3. Details — Due Date (smart picker), Priority, Status, Type, Assigned To
4. Linked Records — Opportunities, Contacts, Projects, Proposals

### 3. Assigned To defaults to logged-in user

Read user name from settings (user_email → derive name, or store user_name on onboarding).
Pre-fill on task creation.

### 4. Apple Reminders-style date picker

When Due Date field is clicked:
- Show inline suggestions dropdown (not a raw date input)
- Suggestions: Today (date), Tomorrow (date), This Weekend (Sat date), Next Week (Mon date), Custom...
- Each row: calendar icon + label + date string
- Selecting a suggestion sets the date and closes
- "Custom..." expands to native date input
- When date is already set: same menu appears, plus "Remove Date" option at bottom
- When unset: field shows "Add Date" instead of empty/dash

### 5. Auto-save

All fields auto-save on blur. Title saves on blur or Enter.
Empty title stays as "(Untitled task)".
