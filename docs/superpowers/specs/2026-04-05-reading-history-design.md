# Reading History

**Date:** 2026-04-05
**Status:** Approved

## Overview

Replace the "Em breve" placeholder on `/leituras` with a paginated list of the user's past readings. Each item shows the date, deck name, card thumbnails, and a truncated preview of the user's question.

## What Changes

### `/leituras` page

The existing hub page already has:
- Permission check (`readings:view`)
- Quota counter + "Nova Leitura" button

Below that section, replace the placeholder with a paginated list of readings.

### Query

- Collection: `user_interpretations`
- Filter: `userId` matches current user
- Sort: `createdAt` descending (most recent first)
- Pagination: 10 items per page, server-side
- URL param: `/leituras?page=2`
- The index on `userId + createdAt` already exists

### Reading card (list item)

Each card displays:
- **Date** — `createdAt` formatted in pt-BR (e.g. "5 de abril de 2026")
- **Deck name** — resolved from deck by `deckId`
- **Card thumbnails** — small images in selection order, with numbered badges (1, 2, 3...)
- **Context preview** — first ~100 characters of `context`, truncated with ellipsis
- **Click** — links to `/leituras/[id]`

### Resolving deck data

`user_interpretations` stores `deckId` and `cardIds` (subdocument IDs). To display deck names and card images:
1. Collect distinct `deckId` values from the current page's interpretations
2. Fetch those decks in a single query
3. Build a map of `deckId → deck` for lookup
4. For each interpretation, find the deck and resolve card images from `deck.cards`

### Pagination component

- "Anterior" / "Próxima" navigation links
- "Página X de Y" indicator
- Total pages calculated via `countDocuments`
- Page 1 shown by default (no `?page` param needed)
- Invalid page numbers redirect to page 1

### Empty state

If the user has no readings: "Nenhuma leitura realizada ainda."

## Files

### Modified
- `app/(dashboard)/leituras/page.tsx` — add history list with pagination below the existing header/quota section

### New service functions
- `lib/readings/service.ts` — add `listUserInterpretations(userId, page, perPage)` returning `{ items, total }`

### No new files needed
- No new models, components, or actions

## Out of Scope

- Filtering by deck or date range
- Search
- Delete readings
- Infinite scroll or "load more"
