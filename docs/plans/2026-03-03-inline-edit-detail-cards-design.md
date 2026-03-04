# Inline-Editable Detail Cards — Design

**Date:** 2026-03-03
**Goal:** Make all detail card form rows actually editable inline (Apple Contacts pattern) instead of read-only with misleading hover states.

## Problem

All 5 detail views have Apple-style form rows with hover highlights and `⌃` chevrons that suggest editability, but clicking does nothing. Users must navigate to separate form pages via Edit buttons. This breaks the promise of the UI.

## Solution

Build a shared `EditableFormRow` component that handles all field types, then replace the local read-only `FormRow` implementations in all 5 detail views.

### Editor Types

| Field Type | Editor | Trigger |
|-----------|--------|---------|
| text (single) | Inline text input | Click value → input, blur/Enter → save |
| text (multi) | Expandable textarea | Click value → textarea, blur → save |
| number/currency | Number input with optional $ | Click → input, blur/Enter → save |
| singleSelect | Native `<select>` | Click → dropdown, select → save |
| multiSelect | Checkbox popover | Click → popover, close → save |
| checkbox | Toggle | Click → immediate toggle + save |
| date | Native date input | Click → date picker |
| readonly/collaborator | No editor | Display only, no hover, no chevron |

### Save Flow

1. User clicks field value
2. Value transforms into appropriate editor
3. User makes change
4. On blur/Enter/selection: call `window.electronAPI.{entity}.update(id, { field: newValue })`
5. Brief "Saved" indicator appears
6. Editor reverts to display mode with updated value

### Select Options

Reuse existing Airtable metadata fetching (already implemented for form pages) to populate dropdown options.

## Scope

### Views to Update

1. **Contact360Page** — text (name, email, phone, etc.), singleSelect (categorization, industry, etc.), multiSelect (tags), checkbox, notes
2. **Company360Page** — text (name, website, etc.), singleSelect (type, industry, size), notes
3. **TaskDetail** (TasksPage) — singleSelect (priority, status, type), date (due date), textarea (notes)
4. **DealDetail** — singleSelect (stage, probability, quals type), number (deal value), date (close date), multiSelect (engagement type), checkbox (quals sent)
5. **ProjectDetail** — singleSelect (status), multiSelect (engagement type), number (contract value), dates

### Not in Scope

- Linked record fields (remain navigational links)
- Attachment fields (have separate management popovers)
- Collaborator fields (Airtable collaborators are read-only via API)
- Creating new records (existing form pages handle creation)
