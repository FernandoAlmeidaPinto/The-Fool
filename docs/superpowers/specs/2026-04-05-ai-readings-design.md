# AI Readings — Leituras com Interpretação por IA

**Date:** 2026-04-05
**Status:** Approved

## Overview

Add a reading system where users select 2-5 cards from a deck, provide a question/context, and receive AI-generated interpretations. The system separates reusable card combination knowledge from personal contextual interpretations. A MockProvider enables development without real AI integration.

## User Flow

1. User navigates to `/leituras`
2. Clicks "Nova Leitura"
3. **Wizard Step 1:** Select a deck from available decks
4. **Wizard Step 2:** Select 2-5 cards from the deck's card grid
5. **Wizard Step 3:** Write a question/context (required)
6. System generates interpretation → redirects to `/leituras/[id]`
7. **Result page:** displays selected cards, generic combination, and contextual interpretation

## Data Model (MongoDB)

### Collection: `card_combinations`

Reusable, user-independent interpretation of a card combination.

```typescript
interface ICardCombination {
  _id: ObjectId;
  deckId: ObjectId;
  cardIds: ObjectId[];       // sorted (normalized)
  cardKey: string;           // normalized join: "id1_id2_id3"
  answer: string;            // generated interpretation
  status: "generated" | "reviewed";
  source: "ai" | "manual";
  createdAt: Date;
  updatedAt: Date;
}
```

- Unique index on `deckId + cardKey`
- `cardIds` always sorted before saving (normalization)
- `cardKey` generated from sorted cardIds joined with `_`
- `status: "generated"` when created by AI, `"reviewed"` when admin approves (future)
- `source: "ai"` from provider, `"manual"` if admin writes it (future)

### Collection: `user_interpretations`

Personal, contextual interpretation tied to a user.

```typescript
interface IUserInterpretation {
  _id: ObjectId;
  userId: ObjectId;
  deckId: ObjectId;
  cardIds: ObjectId[];       // sorted (normalized)
  cardKey: string;
  context: string;           // user's question/context (required)
  answer: string;            // contextual AI interpretation
  combinationId: ObjectId;   // ref to card_combinations used as base
  createdAt: Date;
  updatedAt: Date;
}
```

- Index on `userId + createdAt` (for history queries)
- `context` is required — the user's question drives the interpretation
- `combinationId` links to the generic combination used as base for the contextual answer

### Normalization

Before saving or querying, always:

```typescript
const normalizedCardIds = [...cardIds].sort();
const cardKey = normalizedCardIds.join("_");
```

This ensures `[x, y]` and `[y, x]` resolve to the same combination.

## AI Provider (Adapter Pattern)

### Interface

```typescript
interface CardData {
  _id: string;
  title: string;
  description: string;
}

interface AIProvider {
  generateCombination(cards: CardData[]): Promise<string>;
  generateInterpretation(cards: CardData[], combination: string, context: string): Promise<string>;
}
```

- `generateCombination`: generates a generic relationship analysis between the cards
- `generateInterpretation`: generates a personal, contextual interpretation using the combination as base + user's question

### Implementations

**MockProvider (MVP):**
- `generateCombination` → returns a fixed template string mentioning the card titles
- `generateInterpretation` → returns a fixed template string mentioning the card titles and the user's context
- No external API calls, no cost, instant response

**Future providers (out of scope):**
- `ClaudeProvider`, `OpenAIProvider`, etc.
- Will use card data (title, description, annotations) to build rich prompts

### Configuration

- Provider selected via environment variable: `AI_PROVIDER=mock` (default)
- Factory function: `getAIProvider(): AIProvider`
- Located at `lib/ai/provider.ts` (interface + factory) and `lib/ai/mock-provider.ts`

## Permissions & Limits

### Permission

- New permission: `PERMISSIONS.READINGS_CREATE` (`readings:create`)
- Added to the `PERMISSIONS` enum in `lib/permissions/constants.ts`
- Users without this permission cannot access the reading feature

### Monthly Limit

- New field on Profile schema: `readingsMonthlyLimit: Number | null`
  - `null` = unlimited
  - `5`, `10`, `15`, etc. = monthly cap
- Quota check: count `user_interpretations` where `userId` matches and `createdAt` is in current month (day 1 to end of month)
- When billing is implemented, the reset date will change from day 1 to the subscription renewal date

### Quota Display

- **On `/leituras` page:** next to "Nova Leitura" button, show "X de Y leituras disponíveis este mês". If quota is exhausted, disable the button with a message. If limit is `null` (unlimited), hide the counter.
- **On wizard step 3** (before confirming): reminder "Esta será sua Xª de Y leituras este mês"

## Pages

### `/leituras` — Readings hub

- Permission-gated: requires `readings:create`
- "Nova Leitura" button with quota counter
- Future: list of past readings (history) — out of scope for now
- Placeholder text for history section: "Em breve"

### `/leituras/nova` — New reading wizard

- Permission-gated: requires `readings:create`
- Client component with wizard state management
- **Step 1:** List available decks (cards from deck grid layout). Select one.
- **Step 2:** Card grid for selected deck. Select 2-5 cards. Visual indicator for selected cards and count. Validation: minimum 2, maximum 5.
- **Step 3:** Textarea for context/question (required). Quota reminder. Submit button.
- On submit: calls server action that runs the generation flow
- Loading state during generation
- On success: redirect to `/leituras/[id]`

### `/leituras/[id]` — Reading result

- Displays: selected cards (images + titles), deck name, user's context/question
- Section 1: Generic combination interpretation (from `card_combinations`)
- Section 2: Contextual interpretation (from `user_interpretations`)
- Both sections use `RichTextViewer` for rendering (future-proof for when AI returns formatted text)

## Generation Flow (Server Action)

```
createReadingAction(deckId, cardIds, context):
  1. Verify permission (readings:create)
  2. Verify quota (count this month < readingsMonthlyLimit)
  3. Normalize cardIds → sort, generate cardKey
  4. Validate: 2 ≤ cardIds.length ≤ 5, all cards belong to deck
  5. Fetch card data (title, description) for prompt building
  6. Look up card_combinations by deckId + cardKey
     - If exists → use cached answer
     - If not → aiProvider.generateCombination(cards) → save to card_combinations
  7. aiProvider.generateInterpretation(cards, combination, context)
  8. Save to user_interpretations (with combinationId ref)
  9. Return the new interpretation ID
```

## Seed Updates

- Add `readings:create` to admin profile permissions
- Add `readings:create` to free_tier profile permissions
- Set `readingsMonthlyLimit: null` on admin profile (unlimited)
- Set `readingsMonthlyLimit: 5` on free_tier profile

## Files

### New models
- `lib/readings/combination-model.ts` — CardCombination schema
- `lib/readings/interpretation-model.ts` — UserInterpretation schema

### New services
- `lib/readings/service.ts` — CRUD + generation flow logic
- `lib/readings/quota.ts` — quota checking + counting

### AI layer
- `lib/ai/provider.ts` — AIProvider interface + factory
- `lib/ai/mock-provider.ts` — MockProvider implementation

### Pages
- `app/(dashboard)/leituras/page.tsx` — readings hub (replace stub)
- `app/(dashboard)/leituras/nova/page.tsx` — new reading wizard (or client component)
- `app/(dashboard)/leituras/[id]/page.tsx` — reading result

### Server actions
- `app/(dashboard)/leituras/actions.ts` — createReadingAction

### Modified files
- `lib/permissions/constants.ts` — add READINGS_CREATE
- `lib/profiles/model.ts` — add readingsMonthlyLimit field
- `lib/db/seed.ts` — add permission + limits to seed profiles

## Out of Scope

- Reading history list on `/leituras`
- Favorites, user notes on readings
- Admin panel for reviewing/editing combinations
- Real AI providers (Claude, OpenAI) — MockProvider only
- Billing integration / renewal-date-based quota reset
- Multiple AI answer versions for the same combination
