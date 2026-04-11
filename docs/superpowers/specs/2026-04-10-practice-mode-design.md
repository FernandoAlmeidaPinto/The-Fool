# Practice Mode for Readings

**Date:** 2026-04-10
**Status:** Approved

## Overview

Add a **practice mode** to the new-reading wizard. After selecting cards, the user chooses between two paths: the existing "reading" flow (write your own question, receive an interpretation), or a new "practice" flow where the user receives a suggested question, writes their own interpretation of how the selected cards would answer it, and receives qualitative feedback on their answer.

The goal is to turn reading creation into a learning exercise, not just a consumption flow.

## What Changes

### Wizard flow

Current: `deck → cards → context (write question) → generate reading`.

New: `deck → cards → choice → either (context → generate reading) or (practice step → submit practice attempt)`.

The choice step is **always shown** after card selection. Both paths terminate by redirecting to `/leituras/[id]`, which renders differently depending on the stored `mode`.

### Path choice screen (step 3)

New component `components/readings/path-choice.tsx`.

- Container centered in the wizard, medium height (~`min-h-64`), with a subtle outer border.
- Desktop (`md+`): two halves side-by-side (`grid-cols-2`), separated by a thin vertical line (`border-r` on the left half).
- Mobile: stacked (`grid-cols-1`), horizontal divider between the two.
- Each half is a `<button>` stripped of default button styling (`appearance-none`, no background or border of its own), with hover `bg-muted/40` only on the hovered side. Keyboard accessible (Enter/Space).
- Each half contains: a lucide icon (top), a bold title, and a short description.

Copy (pt-BR):

- **Left — Practice**
  Title: "Praticar interpretação"
  Description: "Receba uma pergunta e interprete como você acredita que as cartas responderiam. Não gostou da pergunta? Crie a sua própria. Depois, você receberá um feedback sincero sobre sua leitura."
- **Right — Reading**
  Title: "Fazer uma leitura"
  Description: "Escreva sua própria pergunta e receba a interpretação para as cartas selecionadas."

The selected-cards summary from the previous step stays visible above the choice screen, so the user keeps context while deciding.

User-facing copy must **never mention "AI"**. The platform (not an AI) gives the feedback from the user's perspective.

### Practice step (step 4 when mode = practice)

New component `components/readings/practice-step.tsx`.

Layout:

- Top: the same selected-cards summary used elsewhere in the wizard.
- **"Pergunta de treino" field** — a short editable `textarea` (2–3 rows). Pre-filled with a suggestion drawn from the server when the step first mounts, if any eligible suggestion exists for the chosen deck (or a global one). If no suggestion is available, the field starts empty with a placeholder (e.g. "Escreva uma pergunta para treinar sua interpretação").
- **"Sortear outra" button** — only rendered if at least one eligible suggestion exists. Clicking it draws a new suggestion via a server action and replaces the field's value.
  - If the current value still equals the last suggestion received from the server (user hasn't edited), replacing happens immediately.
  - If the user has edited the value (or typed from scratch), clicking shows a shadcn `AlertDialog` with title "Sortear outra pergunta?", description "Você perderá o texto que digitou.", and buttons "Cancelar" / "Sortear". Tracked by comparing the current value against the last server-returned suggestion held in a ref.
- **"Sua resposta" textarea** — larger (~8 rows) than the `context` textarea used in normal mode, because practice answers are meant to be more elaborate.
- **"Enviar resposta" button** — disabled until both the question field and the answer field are non-empty. Calls `createPracticeAttemptAction`.
- **"Voltar" link** — returns to step 3.

### Practice questions as suggestions only

The `PracticeQuestion` entity is a **pool of suggestions**. It is used only to pre-fill and re-draw the question field. It is **not** referenced from `UserInterpretation` — the question text is snapshotted into `UserInterpretation.context` at submission time, so editing or deleting a `PracticeQuestion` later does not affect historical attempts.

## Data Model

### New model: `PracticeQuestion`

File: `lib/readings/practice-question-model.ts`.

```ts
{
  text: string;                // required
  deckId: ObjectId | null;     // null = global (applies to any deck)
  active: boolean;             // default true
  createdAt, updatedAt;
}
```

Index: `{ active: 1, deckId: 1 }` to keep the suggestion draw query fast.

Eligibility for a given deck: `active: true` AND (`deckId: <the deck>` OR `deckId: null`).

### Modified model: `UserInterpretation`

File: `lib/readings/interpretation-model.ts`. Add:

```ts
mode: "normal" | "practice";   // default "normal" for backwards compatibility
userAnswer?: string;           // present only for practice: the user's interpretation
feedback?: string;             // present only for practice: the feedback text
```

Field semantics per mode:

| Field            | `normal`                                | `practice`                                           |
| ---------------- | --------------------------------------- | ---------------------------------------------------- |
| `context`        | user's question                         | snapshot of the practice question text              |
| `answer`         | generated interpretation                | not used (stays required — store empty string or reuse for feedback? see below) |
| `userAnswer`     | —                                       | what the user wrote                                  |
| `feedback`       | —                                       | qualitative feedback from the model                  |
| `combinationId`  | required                                | required                                             |

**Resolution for `answer` in practice mode:** keep the existing `answer` field `required`, and store the `feedback` text in both `feedback` and `answer` to avoid schema churn, OR make `answer` optional. The design chooses **making `answer` optional** (`required: false`) — it is cleaner, `feedback` remains the sole source of truth for practice attempts, and normal-mode documents are unaffected. Reads that previously assumed `answer` is non-null must branch on `mode`.

Existing documents do not have a `mode` field. The Mongoose schema default of `"normal"` resolves this at read time — no migration needed.

### `combinationId` in practice mode

Practice attempts follow the **same combination logic** as normal readings: look up `CardCombination` by `(deckId, cardKey)`, generate and upsert if missing, attach the `combinationId` to the saved `UserInterpretation`. This keeps combinations consistently cached regardless of which path created them.

## Service Layer

File: `lib/readings/service.ts`.

### Refactor: extract `getOrCreateCombination`

Pull the existing combination-lookup / generate / upsert logic out of `createReading` into a private helper `getOrCreateCombination(deckId, cards, cardIds, cardKey)`. Both `createReading` and the new `createPracticeAttempt` will call it.

This refactor is in scope because it removes duplication the new feature would otherwise introduce. It is not a general cleanup.

### New: `createPracticeAttempt`

```ts
createPracticeAttempt(data: {
  userId: string;
  deckId: string;
  cardIds: string[];
  questionText: string;   // already snapshotted from the suggestion or user-typed
  userAnswer: string;
}): Promise<IUserInterpretation>
```

Flow:

1. `checkReadingQuota` (same as normal mode — practice consumes quota).
2. Validate `questionText` and `userAnswer` are non-empty.
3. Validate `cardIds.length` is 2–5.
4. Load deck, validate all cards belong to it (reuse existing logic).
5. Build `CardData[]` from deck cards.
6. Call `getOrCreateCombination` to fetch-or-create the combination.
7. Call `provider.generatePracticeFeedback(cards, combination.answer, questionText, userAnswer)`.
8. Save `UserInterpretation` with `mode: "practice"`, `context: questionText`, `userAnswer`, `feedback`, `combinationId`, `cardKey`.
9. Return the saved document.

### New service file: `lib/readings/practice-question-service.ts`

- `listPracticeQuestions({ page, perPage, deckId?, active? })` — paginated, filterable.
- `getPracticeQuestionById(id)`.
- `createPracticeQuestion({ text, deckId, active })`.
- `updatePracticeQuestion(id, { text?, deckId?, active? })`.
- `deletePracticeQuestion(id)`.
- `drawRandomPracticeQuestion(deckId)` — returns one random active question eligible for `deckId` (matching deck or global), or `null` if none exist. Uses MongoDB `$sample` for simplicity.

## AI Provider

File: `lib/ai/provider.ts` (and the concrete implementation).

### New method

```ts
generatePracticeFeedback(
  cards: CardData[],
  baseCombination: string | null,   // CardCombination.answer if available
  questionText: string,
  userAnswer: string
): Promise<string>
```

### Prompt (pt-BR, sketch)

> Você é um tutor de tarot experiente. O aluno recebeu uma pergunta de treino e escreveu como ele acredita que as cartas a seguir responderiam. Dê um feedback qualitativo, sincero e construtivo sobre a resposta dele — apontando pontos fortes, pontos fracos, omissões importantes e aspectos das cartas que ele poderia explorar melhor. Não dê nota. Não escreva uma "resposta modelo". Seja direto e pedagógico.
>
> Cartas:
> - {title} ({deckName}): {description}
> - ...
>
> [Se baseCombination existir] Interpretação base das cartas juntas (apenas para seu conhecimento, não mencione ao aluno que isto existe): {baseCombination}
>
> Pergunta de treino: {questionText}
> Resposta do aluno: {userAnswer}
>
> Feedback:

The base combination is passed only when it already exists (or is generated as part of the attempt via `getOrCreateCombination`). It anchors the feedback to consistent reference material without forcing a separate "model answer" generation just for feedback.

## Server Actions

File: `app/(dashboard)/leituras/actions.ts`.

- `createPracticeAttemptAction(input: { deckId, cardIds, questionText, userAnswer })` — mirrors `createReadingAction`. Permission: `READINGS_CREATE`. On success returns `{ id }` and the wizard redirects to `/leituras/[id]`.
- `drawPracticeQuestionAction(deckId: string)` — returns `{ text: string } | { text: null }`. Cheap server call, no quota, used by the practice step on mount and when "Sortear outra" is clicked.

File: `app/(dashboard)/admin/practice-questions/actions.ts` — standard create/update/delete actions gated by `PRACTICE_QUESTIONS_MANAGE`.

## Detail Page (`/leituras/[id]`)

Render branches on `mode`:

- **`normal`** — current layout (context + answer).
- **`practice`** — layout:
  - Tag "Treino" at the top.
  - Cards (same presentation as normal).
  - Section "Pergunta de treino" — shows `context`.
  - Section "Sua resposta" — shows `userAnswer`.
  - Section "Feedback" — shows `feedback`.

## History List (`/leituras`)

- Adds a "Treino" badge to list items where `mode === "practice"`.
- Preview text on practice items: shows a truncation of the question (from `context`) + a short hint of feedback, rather than an interpretation preview.
- No filters, no separate tab — unified chronological list.

## Admin CRUD

New permission constant: `PRACTICE_QUESTIONS_MANAGE` in `lib/permissions/constants.ts`. Seeded onto the `admin` profile in `lib/db/seed.ts`.

Pages:

- `app/(dashboard)/admin/practice-questions/page.tsx` — paginated list with filters by deck (select, "Global" option, "Todos") and status (active/inactive/all).
- `app/(dashboard)/admin/practice-questions/new/page.tsx` — create form.
- `app/(dashboard)/admin/practice-questions/[id]/page.tsx` — edit form with delete action.

Form fields: `text` (textarea), `deckId` (select including "Global"), `active` (switch). Layout and styling follow the existing admin pages for plans and profiles.

Sidebar: new link "Perguntas de Treino" inside the admin accordion section of `components/dashboard/sidebar.tsx` (or wherever the admin group currently lives).

## Permissions

- **`READINGS_CREATE`** covers both normal and practice modes — practice is conceptually a reading. No new user-facing permission.
- **`PRACTICE_QUESTIONS_MANAGE`** gates the new admin CRUD only.

## Quota

Both modes consume **one unit** of the same monthly reading quota via the existing `checkReadingQuota(userId)`. The wizard's pre-check already redirects when quota is exhausted — both paths inherit that.

## Backwards Compatibility

- Existing `UserInterpretation` documents have no `mode` field. The Mongoose schema default of `"normal"` handles this at read time — no migration required.
- Making `answer` optional does not affect existing documents (they all have an `answer` already from the normal flow).
- Existing `/leituras/[id]` and `/leituras` rendering paths take the `mode === "normal"` branch, so nothing visibly changes for past readings.

## Out of Scope

- Search, categories, or tag filtering on practice questions in the admin UI
- Editing or deleting a `PracticeQuestion` cascading into past attempts (they keep their snapshotted text)
- Filtering the history by mode (only a badge, no filter control)
- Re-playing or re-submitting a practice attempt
- Introducing a test framework — the project currently has none; verification is manual via `yarn lint`, `yarn build`, and smoke testing

## File Inventory

**New files:**

- `lib/readings/practice-question-model.ts`
- `lib/readings/practice-question-service.ts`
- `components/readings/path-choice.tsx`
- `components/readings/practice-step.tsx`
- `app/(dashboard)/admin/practice-questions/page.tsx`
- `app/(dashboard)/admin/practice-questions/new/page.tsx`
- `app/(dashboard)/admin/practice-questions/[id]/page.tsx`
- `app/(dashboard)/admin/practice-questions/actions.ts`

**Modified files:**

- `lib/readings/interpretation-model.ts` — `mode`, `userAnswer`, `feedback`; make `answer` optional
- `lib/readings/service.ts` — extract `getOrCreateCombination`, add `createPracticeAttempt`
- `lib/ai/provider.ts` and concrete implementation — add `generatePracticeFeedback`
- `lib/permissions/constants.ts` — `PRACTICE_QUESTIONS_MANAGE`
- `lib/db/seed.ts` — grant the new permission to `admin` profile
- `components/readings/new-reading-wizard.tsx` — new "choice" and "practice" steps, step renumbering
- `components/dashboard/sidebar.tsx` — admin link "Perguntas de Treino"
- `app/(dashboard)/leituras/actions.ts` — `createPracticeAttemptAction`, `drawPracticeQuestionAction`
- `app/(dashboard)/leituras/[id]/page.tsx` — render branch on `mode`
- `app/(dashboard)/leituras/page.tsx` — "Treino" badge and practice-aware preview in list items
