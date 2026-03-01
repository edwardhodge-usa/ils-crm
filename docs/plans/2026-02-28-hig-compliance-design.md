# HIG Compliance Fix — Design Document

**Date:** 2026-02-28
**Scope:** Fix all 23 Apple HIG violations identified in UI audit
**Strategy:** Foundation-first (Approach A) — 3 layers

## Decisions

- **Token system:** CSS custom properties (`tokens.css`) — not Tailwind theme-only
- **Light/dark mode:** Full support via `prefers-color-scheme` — auto-follows system
- **Accent color:** Read from `systemPreferences.getAccentColor()`, pipe to renderer via IPC

## Layer 1: Foundation (Critical #1-4)

### 1a. `src/styles/tokens.css` — New file
Full CSS custom property system. `:root` = light mode values. `@media (prefers-color-scheme: dark)` = dark overrides. Covers: backgrounds (window, sidebar, toolbar, secondary, tertiary, hover, selected), text (primary, secondary, tertiary, placeholder, on-accent), separators, accent colors, semantic colors, shadows, radii, spacing (4pt grid), typography scale, timing curves, z-index layers.

### 1b. `src/styles/reset.css` — New file
Global reset: box-sizing, system font stack at 13px, antialiased, global `user-select: none`, restore `user-select: text` on inputs, `focus-visible` ring (3px accent, 2px offset), native scrollbars using tokens, button reset with `cursor: default`, `prefers-reduced-motion` override.

### 1c. `src/styles/globals.css` — Rewrite
Import order: reset.css, tokens.css, then Tailwind directives. Remove all hardcoded hex. Keep only `.window-drag`, `.spinner` (updated for reduced-motion).

### 1d. `electron/menu.ts` — New file
Native menu bar via `Menu.buildFromTemplate()`. Menus: App (About, Preferences ⌘,, Services, Hide, Quit), File (New ⌘N, Close), Edit (undo, redo, cut, copy, paste, selectAll), View, Window, Help.

### 1e. `electron/main.ts` — Updated BrowserWindow config
Add: `vibrancy: 'sidebar'`, `visualEffectState: 'active'`, `backgroundColor: '#00000000'`, `roundedCorners: true`, `hasShadow: true`, `tabbingIdentifier: 'main'`. Add `nativeTheme.on('updated')` for vibrancy sync. Add accent color IPC.

### 1f. `electron/preload.ts` — Add accent color IPC bridge

### 1g. `src/main.tsx` — Update import order, add accent color listener

## Layer 2: Component Sweep (#5, #8, #10, #15-19, #21)

Replace all hardcoded hex Tailwind classes with `var()` token references across every component file (~20 files). Key mappings:

| Old | New |
|-----|-----|
| `bg-[#1C1C1E]` | `bg-[var(--bg-window)]` |
| `bg-[#2C2C2E]` | `bg-[var(--bg-secondary)]` / `bg-[var(--bg-sidebar)]` |
| `text-white` | `text-[var(--text-primary)]` |
| `text-[#98989D]` | `text-[var(--text-secondary)]` |
| `text-[#636366]` | `text-[var(--text-tertiary)]` |
| `border-[#3A3A3C]` | `border-[var(--separator-opaque)]` |
| `bg-[#0A84FF]` | `bg-[var(--color-accent)]` |
| All semantic colors | `var(--color-red)`, `var(--color-green)`, etc. |

### Specific component fixes:
- **Sidebar.tsx:** Solid accent bg on active, 18px icons, 13px text, window-unfocused gray state
- **TopBar.tsx:** Center title
- **DataTable/KanbanBoard/LinkedList/Dashboard:** `cursor-default` replacing `cursor-pointer`
- **tailwind.config.js:** Remove unused `mac-*` theme tokens

## Layer 3: Polish (#6, #7, #9, #11-14, #20, #22-23)

- **Antialiased (#6):** In reset.css
- **Reduced-motion (#7):** In reset.css — `@media (prefers-reduced-motion)` zeroes all durations
- **Focus rings (#9):** In reset.css — `:focus-visible` with accent ring. Remove inline `focus:outline-none` from components
- **User-select on inputs (#11):** In reset.css
- **ConfirmDialog (#12):** Add `role="dialog"`, `aria-modal`, Escape handler, scale-in animation
- **CommandPalette (#13):** Add `role="dialog"`, `aria-modal`
- **ARIA labels (#14):** All sidebar buttons, icon buttons, SVG icons, sort headers
- **Scrollbar tokens (#20):** In reset.css
- **Spinner reduced-motion (#22):** Covered by #7
- **Transparent bg (#23):** Covered in Layer 1e
