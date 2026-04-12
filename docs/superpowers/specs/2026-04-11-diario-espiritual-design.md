# Diário Espiritual (Spiritual Diary)

**Date:** 2026-04-11
**Status:** Approved
**Roadmap reference:** `docs/roadmap-plataforma-tarot-ia.md` item #21 — "Diário Espiritual / Diário de Tiragens"

## Overview

Add a **spiritual diary** where authenticated users write personal reflections linked to three possible sources: their daily card, a past reading, or a free-form entry (dreams, insights, meditations). The diary is a single unified timeline — entries of all types live together, ordered chronologically.

The goal is to give the ritualistic, introspective side of tarot a permanent home. The Carta do Dia creates a daily touchpoint; readings create deeper sessions — the diary captures what the user *feels* about both, plus anything else in their spiritual life. This is the first step toward the emotional/pattern layer described in the roadmap (tags, sentiment analysis, calendar view), but the first version is intentionally simple: write, read, archive.

Entries are **immutable** once created (no editing) but can be **archived** (soft-hide) and unarchived. No AI involvement — the diary is a purely human space.

**Access is restricted.** The feature ships with its own permissions (`diary:read`, `diary:write`), granted only to the `admin` profile in the seed. It is **not** available to `free_tier` until a future decision to open it.

## What Changes

### New domain: `lib/diary/`

- `model.ts` — Mongoose model `DiaryEntry`
- `service.ts` — `createEntry`, `listEntries`, `getEntryById`, `archiveEntry`, `unarchiveEntry`, `findEntryFor`

### New routes

- **Diary list** `app/(dashboard)/diario/page.tsx`
- **New entry** `app/(dashboard)/diario/nova/page.tsx`
- **Entry detail** `app/(dashboard)/diario/[id]/page.tsx`
- **Archived entries** `app/(dashboard)/diario/arquivadas/page.tsx`

### Extensions to existing pages

- **Carta do Dia** (`app/(dashboard)/carta-do-dia/page.tsx`) — contextual CTA: "Escrever no diário" or "Ver minha reflexão"
- **Reading detail** (`app/(dashboard)/leituras/[id]/page.tsx`) — contextual CTA: "Escrever no diário" or "Ver minha reflexão"

### Sidebar

- New entry "Diário" in the main nav, placed **after** "Carta do Dia". Icon: `BookOpen` or `NotebookPen` from Lucide.

### Permissions

- New constants `DIARY_READ = "diary:read"` and `DIARY_WRITE = "diary:write"` in `lib/permissions/constants.ts`
- `diary:write` covers both entry creation and archive/unarchive — a single permission for all write operations, since splitting these into separate permissions adds no practical value for this feature
- Seed updated so only the `admin` profile includes both. `free_tier` does **not** get them.

## Data Model

### New model: `DiaryEntry`

File: `lib/diary/model.ts`.

```ts
{
  userId: ObjectId;                // ref User
  type: "daily-card" | "reading" | "free";
  title: string | null;            // optional, user's choice (max 200 chars)
  body: string;                    // reflection text (required, non-empty, max 10000 chars)
  dailyCardId: ObjectId | null;    // ref DailyCard, only when type = "daily-card"
  interpretationId: ObjectId | null; // ref UserInterpretation, only when type = "reading"
  archivedAt: Date | null;         // null = active, Date = archived
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes:

- `{ userId: 1, archivedAt: 1, createdAt: -1 }` — paginated timeline filtered by archive status (covers both active and archived queries)
- `{ userId: 1, dailyCardId: 1 }` — fast lookup "did I already reflect on this daily card?"
- `{ userId: 1, interpretationId: 1 }` — same for readings

Invariants:

- `dailyCardId` may only be set when `type = "daily-card"`
- `interpretationId` may only be set when `type = "reading"`
- `body` must be a non-empty string, max 10,000 characters
- `title` max 200 characters when provided
- Entries are immutable after creation — `title` and `body` are never updated
- The only mutable field is `archivedAt` (archive / unarchive)

## Domain Service

File: `lib/diary/service.ts`.

### `createEntry({ userId, type, title?, body, dailyCardId?, interpretationId? })`

1. Validate `body` is non-empty
2. Validate type ↔ reference coherence:
   - `type = "daily-card"` requires `dailyCardId`, rejects `interpretationId`
   - `type = "reading"` requires `interpretationId`, rejects `dailyCardId`
   - `type = "free"` rejects both references
3. When `dailyCardId` provided: verify the `DailyCard` exists and belongs to `userId`
4. When `interpretationId` provided: verify the `UserInterpretation` exists and belongs to `userId`
5. Create and return the `DiaryEntry`

### `listEntries(userId, { page, pageSize, archived? })`

- Defaults: `pageSize = 20`, `archived = false`
- Filters by `archivedAt: null` (active) or `archivedAt: { $ne: null }` (archived)
- Ordered by `createdAt` descending
- Returns `{ entries, total, page, pageSize }`

### `getEntryById(userId, entryId)`

- Queries by `_id` + `userId` (user can only see their own)
- Returns the entry or `null`

### `archiveEntry(userId, entryId)`

- Sets `archivedAt = new Date()` if not already archived
- Returns the updated entry

### `unarchiveEntry(userId, entryId)`

- Sets `archivedAt = null`
- Returns the updated entry

### `findEntryFor(userId, { dailyCardId?, interpretationId? })`

- Returns `DiaryEntry | null` — finds the existing diary entry for a given daily card or reading
- Used by the Carta do Dia and Leituras pages to toggle between "Escrever no diário" and "Ver minha reflexão" CTAs — the returned `_id` is needed to construct the link to `/diario/[id]`

No AI involvement anywhere. The service is pure CRUD + validation.

## UI / Rendering

### Diary list (`app/(dashboard)/diario/page.tsx`)

Server Component. Checks `diary:read`.

- Paginated list (20 per page, `?page=N`), ordered by `createdAt` descending
- Each item shows: formatted date, type badge ("Carta do Dia" / "Leitura" / "Livre"), title (if present), truncated body preview, link to detail
- "Nova entrada" button at the top → `/diario/nova`
- "Ver arquivadas" link → `/diario/arquivadas`
- Empty state: friendly message + CTA "Escrever primeira entrada"

### New entry (`app/(dashboard)/diario/nova/page.tsx`)

Checks `diary:write`.

**Step 1 — Type selection:**
Three visual options (cards or buttons): "Carta do Dia", "Leitura", "Livre".

If the page receives query params, the type is pre-selected and the reference pre-linked:
- `?tipo=carta-do-dia&ref=YYYY-MM-DD` — resolves the `DailyCard` for that user+date
- `?tipo=leitura&ref=<interpretationId>` — resolves the `UserInterpretation`

**Step 2 — Reference selection (conditional):**
- "Carta do Dia" selected: shows recent daily cards that don't yet have a diary entry. If `ref` param provided, the card is already selected.
- "Leitura" selected: shows recent readings that don't yet have a diary entry. If `ref` param provided, the reading is already selected.
- "Livre" selected: skips to the form directly.

**Step 3 — Form:**
- Title field (optional)
- Body field (required), with fixed placeholder text by type:
  - Carta do Dia: *"O que essa carta te diz sobre o momento que você está vivendo?"*
  - Leitura: *"O que mudou desde essa leitura?"*
  - Livre: *"O que está no seu coração agora?"*
- "Salvar" button → creates entry via Server Action → redirects to `/diario`

### Entry detail (`app/(dashboard)/diario/[id]/page.tsx`)

Checks `diary:read`.

- Date, type badge, title (if present), full body text
- If type "daily-card": mini-card showing the linked card's image + name (resolved from `dailyCardId` → `DailyCard` → live card or snapshot), with link to `/carta-do-dia/historico/[date]`
- If type "reading": summary of the linked reading (cards + context), with link to `/leituras/[id]`
- If the linked resource no longer resolves (deleted deck/card/reading): the user's text remains intact, the context section is hidden or shows a discreet fallback
- "Arquivar" button (checks `diary:write`) → archives entry → redirects to `/diario`

### Archived entries (`app/(dashboard)/diario/arquivadas/page.tsx`)

Same structure as the main list, but queries `archived = true`.

- Each item has a "Desarquivar" action instead of "Arquivar"
- "Voltar ao diário" link → `/diario`

### Contextual CTAs on existing pages

**Carta do Dia** (`app/(dashboard)/carta-do-dia/page.tsx`):
- Discreet link below the daily reflection text
- If no diary entry exists for this `dailyCardId`: "Escrever no diário" → `/diario/nova?tipo=carta-do-dia&ref=YYYY-MM-DD`
- If entry exists: "Ver minha reflexão" → `/diario/[id]`
- Only shown if user has `diary:write` permission

**Reading detail** (`app/(dashboard)/leituras/[id]/page.tsx`):
- Link after the interpretation block
- If no diary entry exists for this `interpretationId`: "Escrever no diário" → `/diario/nova?tipo=leitura&ref=<interpretationId>`
- If entry exists: "Ver minha reflexão" → `/diario/[id]`
- Only shown if user has `diary:write` permission

### Sidebar

New nav item "Diário" in the main section, **after** "Carta do Dia". Icon: `BookOpen` or `NotebookPen` from Lucide. Visible only to users with `diary:read`.

## Error Handling & Edge Cases

1. **Daily card deleted / not resolvable.** The diary entry keeps `dailyCardId` as reference. On the detail page, if the `DailyCard` doesn't resolve (or the deck/card was removed), the user's text is shown intact — the card context section is hidden. Badge still shows "Carta do Dia".

2. **Reading deleted.** Same principle — if the `UserInterpretation` no longer exists, the diary entry shows the user's text without the reading summary. Badge still shows "Leitura".

3. **Attempt to create entry for a reference that doesn't belong to the user.** Service rejects with error. The UI never allows this (lists filter by `userId`), but the service validates as a safety layer.

4. **Attempt to create entry with empty body.** Service rejects. Form also validates client-side.

5. **User without permission accesses diary route.** Pages check `diary:read` / `diary:write` and redirect or show 403, following the existing app pattern.

6. **Invalid query params on `/diario/nova`.** Unrecognized type or `ref` that doesn't resolve → params ignored, type selector shown normally.

7. **Archive/unarchive entry that doesn't exist or doesn't belong to user.** Service returns null, action shows generic error.

### Explicitly out of scope (first version)

- Calendar visualization (future evolution)
- Emotion/theme tags and pattern analysis
- AI involvement (personalized prompts, sentiment analysis)
- Entry editing
- Search/filter by type or text
- Notifications/reminders to write
- Entry sharing
- Diary export
- Diary widget on dashboard home

## Permissions

- New permission constant `DIARY_READ = "diary:read"` in `lib/permissions/constants.ts`
- New permission constant `DIARY_WRITE = "diary:write"` in `lib/permissions/constants.ts`
- Seed updated so only the `admin` profile includes both
- `free_tier` does **not** receive these permissions
- All diary pages check `diary:read`; write actions check `diary:write`
- Contextual CTAs on Carta do Dia and Leituras pages check `diary:write` before rendering

## Verification Plan (manual — no test framework yet)

1. **Permission.** Log in as admin → diary accessible. Log in as free_tier → route redirects/blocks.
2. **Create free entry.** `/diario/nova` → select "Livre" → write title + body → save → appears in diary list with "Livre" badge.
3. **Create daily card entry via CTA.** Visit `/carta-do-dia` → click "Escrever no diário" → arrives at `/diario/nova` with type pre-selected and card linked → write → save → entry created with `dailyCardId` populated.
4. **Create reading entry via CTA.** Visit `/leituras/[id]` → click "Escrever no diário" → type pre-selected, reading linked → save → entry created with `interpretationId` populated.
5. **CTA toggles after entry exists.** After creating entry for a daily card, revisit `/carta-do-dia` → link now says "Ver minha reflexão" and navigates to the entry detail. Same for readings.
6. **Detail with context.** Open detail of "Carta do Dia" entry → shows mini-card with image/name and link to card history. "Leitura" entry → shows reading summary with link.
7. **Immutability.** Detail page does not offer an edit button. No update route exists.
8. **Archive.** On detail, click "Arquivar" → entry disappears from main list. Visit `/diario/arquivadas` → entry is there.
9. **Unarchive.** On archived list, click "Desarquivar" → entry returns to main list.
10. **Broken reference.** Create daily card entry → delete the deck/card via admin → open entry detail → user text intact, card section hidden or without image.
11. **Pagination.** Create ~25 entries → list shows 20 → navigate `?page=2` → shows the rest.
12. **Empty body validation.** Try saving without body → form rejects client-side. Force via direct request → service rejects.
13. **Sidebar.** "Diário" item appears after "Carta do Dia" for users with `diary:read`.
