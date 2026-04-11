# Carta do Dia (Daily Card)

**Date:** 2026-04-11
**Status:** Approved
**Roadmap reference:** `docs/roadmap-plataforma-tarot-ia.md` item #20 — Phase 2 "Validate retention"

## Overview

Add a **daily card** feature: once per day each authenticated user sees one card, drawn from a single admin-configured deck, together with a short AI-generated reflection about that card. The same user sees the same card for the whole day, history is kept indefinitely, and the feature is free for every plan.

The goal is to create a daily retention loop — a reason to open the app every day, not only when the user wants a full reading or to practice. This is the piece missing between the current ad-hoc, episodic flows (readings, practice) and future retention features (streaks, notifications, spiritual diary).

Scope is intentionally small: widget on the dashboard home + dedicated page + paginated history. No personal reflection field (that belongs to the future "Diário Espiritual", roadmap item #21). No streak counter, no notifications, no sharing — those build on top of this.

## What Changes

### New domain: `lib/daily-card/`

- `model.ts` — Mongoose model `DailyCard`
- `service.ts` — `getOrCreateToday`, `getHistory`, `markRevealed`, and helper `dateInSaoPaulo`

### Extensions to `lib/decks/`

- New field `availableForDailyCard: boolean` on the `Deck` schema (default `false`)
- New field `dailyReflection: string | null` on the `Card` subdocument (default `null`) — lazy cache for the AI-generated reflection, one per card, shared across all users
- Deck service gains `getActiveDailyDeck()` and enforces the invariant **"at most one deck with `availableForDailyCard = true`"** on update

### Extension to `lib/ai/provider.ts`

- New method `generateDailyCardReflection(card)` following the same pattern as the existing `generateInterpretation`. Returns a short reflective text about a single card, not tied to any user or date.

### New routes

- **Widget** on `app/(dashboard)/page.tsx` (dashboard home — currently almost empty)
- **Dedicated page** `app/(dashboard)/carta-do-dia/page.tsx`
- **History list** `app/(dashboard)/carta-do-dia/historico/page.tsx`
- **History detail** `app/(dashboard)/carta-do-dia/historico/[date]/page.tsx`

### Admin UI

- Toggle **"Usar como baralho do dia"** in the deck edit form under `app/(dashboard)/admin/decks/...`
- Badge on the admin deck listing showing which deck is currently the active daily deck

### Sidebar

- New entry "Carta do Dia" in the main nav, placed **after** "Leituras"

### Permissions

- New permission `daily-card:read`, added to both the `admin` and `free_tier` profile seeds — every authenticated user can use the feature regardless of plan

## Data Model

### New model: `DailyCard`

File: `lib/daily-card/model.ts`.

```ts
{
  userId: ObjectId;            // ref User
  date: string;                // "YYYY-MM-DD", always computed in America/Sao_Paulo
  deckId: ObjectId;            // ref Deck at the moment of drawing
  cardId: ObjectId;            // ref to the _id of the Card subdoc inside the deck
  cardSnapshot: {
    name: string;
    imageUrl: string;
  };
  revealedAt: Date | null;     // null until the user opens the dedicated page
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes:

- `{ userId: 1, date: 1 }` **unique** — guarantees one draw per user per day, and protects against race conditions (concurrent requests on the first visit of the day)
- `{ userId: 1, date: -1 }` — feeds the paginated history

The `cardSnapshot` is a **fallback-only** structure. Renderers always prefer the live card resolved via `deckId + cardId`; the snapshot is used only when the card no longer resolves (deck or card deleted). This keeps the historical list visually intact without freezing corrections admins may have made to card names/images.

### `Deck` schema extension

- New field `availableForDailyCard: boolean` (default `false`)
- Service invariant: setting a deck's `availableForDailyCard` to `true` **must** unset the flag on every other deck in a single atomic operation (transaction or `updateMany` followed by `updateOne`). The goal is that at most one deck has the flag set at any time.

### `Card` subdocument extension

- New field `dailyReflection: string | null` (default `null`)
- Populated lazily the first time any user draws that card as their daily card. Once set, it is reused forever (one AI call per card in the active deck, ever).

## Core Flow: `getOrCreateToday(userId)`

This function is the single entry point called by both the dashboard widget (Server Component) and the dedicated page (Server Component).

```
1. today = dateInSaoPaulo()                              // "YYYY-MM-DD"
2. existing = DailyCard.findOne({ userId, date: today })
3. if existing: return existing
4. activeDeck = Deck.findOne({ availableForDailyCard: true })
5. if !activeDeck: return null                           // widget: "em breve" state
6. card = pickRandomCard(activeDeck.cards)               // simple Math.random
7. if !card: return null                                 // edge case: empty deck
8. if !card.dailyReflection:
     try:
       card.dailyReflection = await aiProvider.generateDailyCardReflection(card)
       deck.save()                                       // cache persisted on the subdoc
     catch:
       // swallow — DailyCard is still created below, reflection stays null
9. try:
     dailyCard = DailyCard.create({
       userId,
       date: today,
       deckId: activeDeck._id,
       cardId: card._id,
       cardSnapshot: { name: card.name, imageUrl: card.imageUrl },
       revealedAt: null,
     })
   catch DuplicateKeyError:
     dailyCard = DailyCard.findOne({ userId, date: today })   // lost the race, re-read
10. return dailyCard
```

Notes:

- **Idempotent.** Called by both the widget and the dedicated page, any number of times per day. Step 3 short-circuits after the first draw.
- **Lazy only.** No cron job pre-generates cards at midnight. We have no such infra, and lazy draws are sufficient.
- **AI failure is non-fatal.** The daily card is still created; the reflection is empty until the next time any user draws that same card (step 8 retries naturally because `dailyReflection` is still null).
- **Race condition covered by the unique index.** Two concurrent first-visits of the day will race on step 9; the second `create` throws a duplicate-key error, we re-read and return the winner.
- **Randomness.** `pickRandomCard` uses `Math.random()`. We do **not** need determinism (`hash(userId + date)`) because the `DailyCard` record is the source of truth once created.

### `markRevealed(userId, date)`

Called server-side on the dedicated page render when `revealedAt` is still `null`. Sets it to `new Date()`. Used by the dashboard widget to switch between "não visitada" and "visitada hoje" states.

### `getHistory(userId, { page, pageSize })`

Read-only. Queries `DailyCard` with the `(userId, date -1)` index, paginated (default `pageSize = 30`). Returns the records as-is; the renderer resolves live cards and falls back to snapshot.

### `dateInSaoPaulo()`

Utility that returns `"YYYY-MM-DD"` for the current moment in the `America/Sao_Paulo` timezone. The entire user base shares the same "day line", regardless of the requester's browser timezone. This is a pragmatic choice for a pt-BR product. If the product goes international later, this can become a per-user preference.

## UI / Rendering

### Dashboard widget (`app/(dashboard)/page.tsx`)

Server Component. Calls `getOrCreateToday(userId)` directly. Three visual states:

1. **No active deck** (`getOrCreateToday` returned `null` because no deck has the flag)
   - Discreet card: "Carta do dia — em breve"
   - No CTA
2. **Not visited today** (`dailyCard.revealedAt === null`)
   - Card back / placeholder image
   - Title: "Sua carta do dia te espera"
   - CTA "Revelar" → links to `/carta-do-dia`
3. **Visited today** (`dailyCard.revealedAt !== null`)
   - Small open card thumbnail with the card image
   - Card name
   - Secondary CTA "Ver novamente" → links to `/carta-do-dia`

### Dedicated page (`app/(dashboard)/carta-do-dia/page.tsx`)

Server Component. Calls `getOrCreateToday(userId)`. If it returns a `DailyCard` whose `revealedAt` is null, calls `markRevealed` before rendering (so a refresh keeps showing the revealed state).

Layout:

- Large centered card image
- Card name below the image
- The `dailyReflection` text under the name
- If `dailyReflection` is null (AI failed earlier and nobody retried yet): discreet line "Reflexão em preparação, volte daqui a pouco"
- Link "Ver histórico" → `/carta-do-dia/historico`

Empty state (no active deck): friendly message "Nenhum baralho do dia configurado. Volte em breve." + link back to dashboard.

### History list (`app/(dashboard)/carta-do-dia/historico/page.tsx`)

- Grid of thumbnails ordered by `date` descending
- ~30 items per page, `?page=N` query param
- Each item: formatted date + card name + thumbnail
- Thumbnail renders live card image when `deckId + cardId` resolves; otherwise falls back to `cardSnapshot.imageUrl`
- Each item links to `/carta-do-dia/historico/[date]`

### History detail (`app/(dashboard)/carta-do-dia/historico/[date]/page.tsx`)

- Deep-linkable by date (URL format `YYYY-MM-DD`)
- Renders the same shape as the dedicated page (large card, name, reflection)
- Uses the live card + `dailyReflection` if resolvable, otherwise the snapshot (and hides the reflection block if the card no longer exists)

### Admin — deck toggle

In the existing deck edit form, add a shadcn `Switch` labeled **"Usar como baralho do dia"**. On save, the deck service enforces the "only one active" invariant.

On the admin deck listing, decks with `availableForDailyCard === true` get a small badge "Baralho do dia" next to the name. The invariant guarantees only one row shows the badge.

### Sidebar

New nav item "Carta do Dia" in the main section, **after** "Leituras". Icon: a lucide sun / sparkle (exact icon a detail for implementation).

## AI Prompt

`generateDailyCardReflection(card)` follows the existing `generateInterpretation` pattern (same provider, same error contract, same language — pt-BR output).

Rough prompt shape (final wording is an implementation detail, but it must satisfy these constraints):

- Short — a few sentences, not a full interpretation
- About the card **in isolation** — not tied to a question, spread, or user context
- Reflective / contemplative tone, consistent with the ritualistic framing of the feature
- **Never mentions "AI"** — user-facing copy rule the product already follows

The result is cached on the subdoc forever; we are not paying for personalization at this stage (that belongs to the future Diário/Chat feature).

## Error Handling & Edge Cases

1. **AI provider fails.** The `DailyCard` is still created, `dailyReflection` stays `null`, UI shows a discreet "Reflexão em preparação" message. Any future draw of the same card retries.
2. **Active deck is unflagged mid-day.** Users who already drew today keep their `DailyCard` (it points to the old `deckId`, which still exists). Users who haven't drawn yet fall into the "no active deck" state until admin flags another one.
3. **Card gets deleted after being drawn.** `deckId + cardId` no longer resolves → renderer uses `cardSnapshot` for name/image. `dailyReflection` is unavailable (it lived on the subdoc) — detail page hides the reflection block.
4. **Active deck has no cards.** `pickRandomCard` returns null → service returns null → UI enters "no active deck" state. Safer than crashing.
5. **Concurrent first visits of the day.** Covered by the unique `(userId, date)` index and the try/catch in step 9.
6. **Day boundary in São Paulo timezone.** A user visiting at 23:59 BR and again at 00:00 BR sees two different cards — this is intentional and consistent for every user.
7. **New deck flagged while another was already flagged.** Deck service performs both updates atomically. A mid-operation failure rolls back (no "two active decks" state).
8. **Fresh install — no deck flagged yet.** The schema default is `false` for every deck. No data migration needed. The feature renders its "em breve" state until admin flips the switch.

### Explicitly out of scope

- Cron / scheduled midnight generation (no infra, lazy is sufficient)
- Push notifications
- Streak counter (next feature on top of this one)
- Sharing
- Multiple simultaneous daily decks, per-user preferences
- Personalized per-user daily reflection (belongs to the Diário feature)

## Permissions

- New permission constant `DAILY_CARD_READ = "daily-card:read"` in `lib/permissions/constants.ts`
- Seed updated so both `admin` and `free_tier` profiles include it
- Dashboard widget, dedicated page, history list and history detail all check `hasPermission(session, "daily-card:read")`

The admin toggle reuses the existing `decks:*` permissions — no new admin permission needed.

## Verification Plan (manual — no test framework yet)

1. **Admin invariant.** Mark deck A as daily deck; verify the UI and DB show only A flagged. Mark deck B; verify A is now unflagged.
2. **First visit of the day.** Fresh user, no prior `DailyCard`. Visit dashboard → widget shows "Sua carta do dia te espera". Click Revelar → dedicated page opens with card + reflection. Return to dashboard → widget is in "visitada hoje" state.
3. **Idempotency.** Reload the dedicated page multiple times — always the same card and reflection. Reload the dashboard — still "visitada".
4. **AI cache.** First draw of a given card: observe an AI call in logs. Second user drawing the same card later: instantaneous, no new AI call. Verify `dailyReflection` persisted on the subdoc.
5. **AI failure.** Force the AI provider to throw on a fresh card. The `DailyCard` is still created, UI shows "Reflexão em preparação". Retry by forcing another user to draw the same card; reflection is now stored.
6. **Snapshot fallback.** Create a `DailyCard`, then delete the card via admin. Open the history detail for that date — renders via `cardSnapshot` without crashing, reflection block hidden.
7. **No active deck.** Unflag all decks → widget shows "em breve" state, dedicated page shows empty state with link back to dashboard.
8. **Day boundary.** Artificially advance the clock (or wait) across 00:00 BR → widget resets to "não visitada", a new card is drawn.
9. **History pagination.** Seed ~50 `DailyCard` records for a user → open history → paginate with `?page=2` → verify ordering and thumbnails (live where cards exist, snapshot where not).
10. **Deep link.** Visit `/carta-do-dia/historico/2026-04-10` directly → detail page renders → back button returns to history list.
11. **Race condition.** Open two browser tabs on a fresh day, submit the dedicated page near-simultaneously → only one `DailyCard` exists in the DB for that `(userId, date)`.

### Notes for future automated tests

- `getOrCreateToday` is the critical path — cover every branch (no existing → creates, existing → returns, no active deck → null, AI fails → persists without reflection, race → duplicate key recovered)
- Deck service invariant "only one active daily deck" deserves a regression test
- `dateInSaoPaulo()` unit test (Brazil has no DST, but keep a test anyway against future changes)

E2E coverage is explicitly deferred — planned as a separate initiative.
