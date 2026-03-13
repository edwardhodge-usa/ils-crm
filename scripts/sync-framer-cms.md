# Framer CMS Sync Workflow

## Overview

The ILS CRM Electron app monitors the health of client pages hosted on Framer (imaginelabstudios.com). However, Electron cannot talk to Framer's CMS directly — there is no public API for accessing CMS collection data.

Claude Code bridges this gap using the **Framer MCP plugin** (unframer). When triggered, Claude Code queries Framer's CMS for all client page items and writes the results to a local cache file that the Electron app reads.

**Flow:** Framer Desktop -> MCP Plugin -> Claude Code -> Cache JSON -> Electron App

## Prerequisites

All four must be true before syncing:

1. **Framer desktop app** is open
2. **ImagineLab Front Page project** is the active/open project in Framer
3. **MCP plugin is connected** — In Framer, press Cmd+K, search "MCP", and open it. The plugin must show a connected state
4. **Claude Code session** is running in the ils-crm project directory

If any prerequisite is missing, the MCP tools will fail or return stale/empty data.

## Sync Steps

These are the steps Claude Code performs when you trigger a sync:

### Step 1: Discover CMS Collections

Call `mcp__unframer__getCMSCollections` to list all CMS collections in the active Framer project. Identify the collection that powers `/ils-clients/` pages (likely named "ILS Clients" or similar). Note its collection ID.

### Step 2: Fetch All CMS Items

Call `mcp__unframer__getCMSItems` with the collection ID from Step 1. This returns all items in the collection. Each item includes:

- `id` — Framer's internal item identifier
- `slug` — URL slug (used in `/ils-clients/{slug}`)
- `draft` — Boolean indicating whether the item is in draft mode
- `fieldData` — Object containing the item's CMS fields (name, etc.)

### Step 3: Build the Cache Object

Transform the CMS response into the cache format, mapping each item by its slug:

```json
{
  "lastSynced": "2026-03-12T20:00:00.000Z",
  "collectionId": "<collection-id>",
  "collectionName": "<collection-name>",
  "items": {
    "<slug>": {
      "draft": false,
      "name": "<display name from fieldData>",
      "framerItemId": "<item-id>"
    }
  }
}
```

### Step 4: Write the Cache File

Write the JSON to:

```
~/Library/Application Support/ILS CRM/framer-cms-cache.json
```

Create the directory if it does not exist.

### Step 5: Verify

Read the file back and confirm it contains valid JSON with the expected structure and item count.

## How to Trigger

Tell Claude Code any of the following while the prerequisites are met:

- "sync framer CMS"
- "update framer cache"
- "refresh framer page data"

Claude Code will execute Steps 1-5 automatically.

## What the Electron App Does with the Cache

The app reads `framer-cms-cache.json` on launch and during page health checks. It cross-references the cached CMS data with live HTTP HEAD requests to each client URL to produce five distinct statuses:

| Status | Color | Condition |
|---|---|---|
| **Live** | Green | In CMS, not draft, URL returns 200 |
| **Draft** | Yellow | In CMS, marked as draft |
| **Not in Framer** | Gray | Slug not found in CMS at all |
| **Needs Publish** | Orange | In CMS, not draft, but URL returns 404 (Framer site needs republishing) |
| **Error** | Red | Network or timeout error when checking URL |

If no cache file exists, the app falls back to simple live/not-found behavior based on URL checks alone (no draft or needs-publish detection).

## Cache Freshness

- The app displays when the cache was last synced (from the `lastSynced` timestamp)
- **Re-sync whenever you** add, remove, rename, or publish/unpublish pages in Framer
- There is no auto-refresh — syncing is manual and requires Framer + MCP to be open
- Stale cache data will not break the app; it just means draft/publish statuses may be inaccurate until the next sync
