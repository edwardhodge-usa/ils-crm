# HIG Compliance Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all 23 Apple HIG violations across the ILS CRM Electron app — token system, light/dark mode, native menu bar, vibrancy, component migration, and polish.

**Architecture:** Foundation-first approach. Layer 1 creates tokens.css, reset.css, menu.ts, and updates BrowserWindow config. Layer 2 sweeps all ~20 component files to replace hardcoded hex with token references. Layer 3 adds ARIA, focus rings, and reduced-motion support.

**Tech Stack:** Electron + React + TypeScript + Vite + Tailwind CSS, CSS custom properties

---

### Task 1: Create tokens.css

**Files:**
- Create: `src/styles/tokens.css`

**Step 1: Create the token file with full light + dark mode values**

This is the complete design token system from the HIG spec. Light mode `:root`, dark mode via `@media (prefers-color-scheme: dark)`.

**Step 2: Verify file exists**

Run: `cat src/styles/tokens.css | head -5`
Expected: `:root {` visible

**Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(hig): add CSS custom property design token system"
```

---

### Task 2: Create reset.css

**Files:**
- Create: `src/styles/reset.css`

**Step 1: Create the global CSS reset**

Includes: box-sizing, system font at 13px, antialiased, global user-select: none, user-select: text on inputs, focus-visible ring, native scrollbars, button reset with cursor: default, prefers-reduced-motion override, reduced-motion spinner fix.

**Step 2: Commit**

```bash
git add src/styles/reset.css
git commit -m "feat(hig): add global CSS reset with native macOS defaults"
```

---

### Task 3: Rewrite globals.css

**Files:**
- Modify: `src/styles/globals.css`

**Step 1: Rewrite globals.css**

New content: import reset.css and tokens.css BEFORE tailwind directives. Keep .window-drag utility. Remove all hardcoded hex values. Keep .spinner with reduced-motion awareness (handled by reset).

**Step 2: Commit**

```bash
git add src/styles/globals.css
git commit -m "feat(hig): rewrite globals.css to use token imports"
```

---

### Task 4: Create native menu bar

**Files:**
- Create: `electron/menu.ts`
- Modify: `electron/main.ts`

**Step 1: Create electron/menu.ts**

Full native menu: App menu (About, Preferences ⌘,, Services, Hide/HideOthers/Unhide, Quit), File (New ⌘N, Close), Edit (undo, redo, sep, cut, copy, paste, selectAll), View (reload, devtools, sep, zoom controls, sep, fullscreen), Window (minimize, zoom, sep, front), Help.

**Step 2: Import and call from main.ts**

Add `import { buildMenu } from './menu'` and call `buildMenu(mainWindow)` after window creation.

**Step 3: Commit**

```bash
git add electron/menu.ts electron/main.ts
git commit -m "feat(hig): add native macOS menu bar"
```

---

### Task 5: Update BrowserWindow config + accent color IPC

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Modify: `src/main.tsx`

**Step 1: Update BrowserWindow config in main.ts**

Add to createWindow(): `vibrancy: 'sidebar'`, `visualEffectState: 'active'`, `backgroundColor: '#00000000'`, `roundedCorners: true`, `hasShadow: true`, `tabbingIdentifier: 'main'`. Add nativeTheme listener. Add accent color IPC: read systemPreferences.getAccentColor(), send to renderer on load and on change via AppleColorPreferencesChangedNotification subscription. Import nativeTheme and systemPreferences.

**Step 2: Add accent color bridge in preload.ts**

Add `onAccentColor` callback registration to the electronAPI bridge.

**Step 3: Update src/main.tsx import order + accent color listener**

Import: reset.css, tokens.css, globals.css (in that order). Add accent color listener that sets `--color-accent` on documentElement.

**Step 4: Commit**

```bash
git add electron/main.ts electron/preload.ts src/main.tsx
git commit -m "feat(hig): add vibrancy, accent color IPC, and window config"
```

---

### Task 6: Migrate Layout, Sidebar, TopBar

**Files:**
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/TopBar.tsx`

**Step 1: Migrate Layout.tsx**

Replace `bg-[#1C1C1E]` with `bg-[var(--bg-window)]`.

**Step 2: Migrate Sidebar.tsx**

- Replace all hardcoded hex with token vars
- Active item: solid accent bg + white text (not translucent)
- Unfocused window: gray selected state
- Icons: w-[18px] h-[18px] (was w-4 h-4 = 16px)
- Text: text-[13px] (was 14px)
- Add aria-label to each nav button

**Step 3: Migrate TopBar.tsx**

- Replace all hardcoded hex with token vars
- Center the title
- Add aria-label to search button

**Step 4: Commit**

```bash
git add src/components/layout/Layout.tsx src/components/layout/Sidebar.tsx src/components/layout/TopBar.tsx
git commit -m "feat(hig): migrate layout components to design tokens"
```

---

### Task 7: Migrate shared components

**Files:**
- Modify: `src/components/shared/DataTable.tsx`
- Modify: `src/components/shared/EntityForm.tsx`
- Modify: `src/components/shared/PrimaryButton.tsx`
- Modify: `src/components/shared/ConfirmDialog.tsx`
- Modify: `src/components/shared/KanbanBoard.tsx`
- Modify: `src/components/shared/LinkedList.tsx`
- Modify: `src/components/shared/StatusBadge.tsx`
- Modify: `src/components/shared/FilterTabs.tsx`
- Modify: `src/components/shared/LoadingSpinner.tsx`

**Step 1: Migrate DataTable.tsx**

- Replace all hex → tokens
- Replace `cursor-pointer` with `cursor-default` on rows and column headers

**Step 2: Migrate EntityForm.tsx**

- Replace all hex → tokens
- Replace `focus:outline-none focus:border-[#0A84FF]` with token focus style
- Replace `disabled:opacity-50` with `disabled:opacity-40` (HIG spec)

**Step 3: Migrate PrimaryButton.tsx**

- Replace hex → tokens

**Step 4: Migrate ConfirmDialog.tsx**

- Replace hex → tokens
- Add `role="dialog"` and `aria-modal="true"` to overlay
- Add Escape key handler
- Add scale-in animation classes

**Step 5: Migrate KanbanBoard.tsx**

- Replace hex → tokens
- Replace `cursor-pointer` with `cursor-default`

**Step 6: Migrate LinkedList.tsx**

- Replace hex → tokens
- Replace `cursor-pointer` with `cursor-default`

**Step 7: Migrate StatusBadge.tsx**

- Replace all hardcoded hex with token vars

**Step 8: Migrate FilterTabs.tsx**

- Replace hex → tokens

**Step 9: Migrate LoadingSpinner.tsx**

- Replace hex → token

**Step 10: Commit**

```bash
git add src/components/shared/
git commit -m "feat(hig): migrate all shared components to design tokens"
```

---

### Task 8: Migrate CommandPalette

**Files:**
- Modify: `src/components/layout/CommandPalette.tsx`

**Step 1: Migrate CommandPalette.tsx**

- Replace all hex → tokens
- Add `role="dialog"` and `aria-modal="true"` to overlay div

**Step 2: Commit**

```bash
git add src/components/layout/CommandPalette.tsx
git commit -m "feat(hig): migrate CommandPalette to design tokens"
```

---

### Task 9: Migrate page components

**Files:**
- Modify: `src/components/dashboard/DashboardPage.tsx`
- Modify: `src/components/contacts/ContactListPage.tsx`
- Modify: `src/components/contacts/Contact360Page.tsx`
- Modify: `src/components/companies/CompanyListPage.tsx`
- Modify: `src/components/companies/Company360Page.tsx`
- Modify: `src/components/pipeline/PipelinePage.tsx`
- Modify: `src/components/imported-contacts/ImportedContactsPage.tsx`
- Modify: `src/components/settings/SettingsPage.tsx`

**Step 1: Migrate DashboardPage.tsx**

- Replace all hex → tokens
- Replace `cursor-pointer` with `cursor-default` on task/follow-up rows

**Step 2: Migrate ContactListPage.tsx**

- Replace hex → tokens in specialty colors and tag colors

**Step 3: Migrate Contact360Page.tsx**

- Replace all hex → tokens (~30+ instances)
- All back button, header, tab, overview card colors

**Step 4: Migrate CompanyListPage.tsx**

- Replace hex → tokens

**Step 5: Migrate Company360Page.tsx**

- Replace all hex → tokens (~25+ instances)

**Step 6: Migrate PipelinePage.tsx**

- Replace hex → tokens

**Step 7: Migrate ImportedContactsPage.tsx**

- Replace hex → tokens

**Step 8: Migrate SettingsPage.tsx**

- Replace all hex → tokens (~20+ instances)

**Step 9: Commit**

```bash
git add src/components/dashboard/ src/components/contacts/ src/components/companies/ src/components/pipeline/ src/components/imported-contacts/ src/components/settings/
git commit -m "feat(hig): migrate all page components to design tokens"
```

---

### Task 10: Clean up tailwind config

**Files:**
- Modify: `tailwind.config.js`

**Step 1: Remove unused mac-* theme tokens**

The `mac-blue`, `mac-green`, `mac-red`, `mac-orange`, `mac-yellow`, `mac-purple`, `mac-gray`, `font-sf`, `shadow-mac`, `shadow-mac-lg`, `rounded-macos` are all unused (replaced by CSS tokens). Remove them.

**Step 2: Commit**

```bash
git add tailwind.config.js
git commit -m "chore(hig): remove unused Tailwind mac-* theme tokens"
```

---

### Task 11: Update index.html

**Files:**
- Modify: `index.html`

**Step 1: Update inline styles to use token-compatible approach**

Replace hardcoded `background-color: #1C1C1E` with a color-scheme-aware approach so the flash-prevention still works in both light and dark mode.

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat(hig): update index.html for light/dark mode flash prevention"
```

---

### Task 12: Verify build and visual test

**Step 1: Run TypeScript check**

Run: `cd "/Users/EdwardHodge_1/Library/Mobile Documents/com~apple~CloudDocs/03_Custom Apps/ils-crm" && npx tsc --noEmit`
Expected: No errors

**Step 2: Run dev server**

Run: `npm run dev`
Expected: App launches, sidebar shows vibrancy, tokens adapt to system appearance

**Step 3: Commit any fixes**

If TypeScript errors found, fix and commit.
