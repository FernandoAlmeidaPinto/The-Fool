# Admin Review de Combinações

**Date:** 2026-04-05
**Status:** Approved

## Overview

Add an admin page to review and edit AI-generated card combinations. Combinations start as "generated" (pending) and become "reviewed" when an admin saves them — even without changes. Editing happens inline in the list via an expandable RichTextEditor.

## Page: `/admin/decks/[id]/combinacoes`

- Permission-gated: `admin:decks`
- Lists all `card_combinations` for the deck, sorted by status (`generated` first), then `createdAt` desc
- Each item expandable inline for review/edit

### Entry point

Add a link in `/admin/decks/[id]/edit/page.tsx` below the cards section: "Gerenciar Combinações (X pendentes)" where X is the count of `status: "generated"` combinations for this deck.

## List item (collapsed)

- **Status badge** — "Pendente" (yellow, for `generated`) or "Revisada" (green, for `reviewed`)
- **Card titles** — resolved from deck subdocuments, in order, separated by " → "
- **Preview** — first ~80 chars of `answer`, stripped of HTML
- **Expand button** — toggles inline editor

## List item (expanded)

- **Card titles** — same as collapsed
- **RichTextEditor** — pre-filled with current `answer`, using `onChange` to track edits
- **"Salvar" button** — saves and marks as reviewed

### Save behavior

- If text was edited: update `answer`, set `status: "reviewed"`, set `source: "manual"`
- If text was NOT edited: set `status: "reviewed"`, keep `source: "ai"`
- Both cases: the combination is now considered reviewed by a human

## Service functions

Add to `lib/readings/service.ts`:

- `listCombinationsByDeck(deckId: string)` — returns all combinations for a deck
- `countPendingCombinations(deckId: string)` — count where `status: "generated"`
- `reviewCombination(id: string, answer?: string)` — updates status to reviewed, optionally updates answer and source

## Files

### New
- `app/(dashboard)/admin/decks/[id]/combinacoes/page.tsx` — server component page
- `app/(dashboard)/admin/decks/[id]/combinacoes/actions.ts` — server actions
- `components/admin/combination-review-list.tsx` — client component with expand/collapse + inline RichTextEditor

### Modified
- `lib/readings/service.ts` — add `listCombinationsByDeck`, `countPendingCombinations`, `reviewCombination`
- `app/(dashboard)/admin/decks/[id]/edit/page.tsx` — add link to combinações page with pending count

## Out of Scope

- Filtering by status in the list
- Deleting combinations
- Bulk review (mark all as reviewed)
- Regenerating a combination
