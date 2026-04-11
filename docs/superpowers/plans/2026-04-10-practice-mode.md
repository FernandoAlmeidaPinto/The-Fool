# Practice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "practice mode" path to the new-reading wizard where users receive a suggested question, write their own interpretation, and receive qualitative feedback.

**Architecture:** New `PracticeQuestion` entity as a pool of editable suggestions (never referenced by id after submission — text is snapshotted). `UserInterpretation` gains a `mode` discriminator with `userAnswer`/`feedback` for the practice branch. Service layer refactored to share a `getOrCreateCombination` helper between normal and practice flows. New wizard steps: a "choice" step (always shown) and a "practice" step (used when the practice path is picked). New admin CRUD under `/admin/practice-questions` gated by a new permission.

**Tech Stack:** Next.js 16 (App Router, async params), React 19, TypeScript, Mongoose, Tailwind CSS 4, shadcn/ui, lucide-react, yarn.

**Spec:** `docs/superpowers/specs/2026-04-10-practice-mode-design.md`

**Testing note:** This project has no test framework (confirmed in CLAUDE.md and the spec). Each task verifies via `yarn lint`, `yarn build`, and targeted manual smoke-tests where behavior is observable. This replaces TDD steps. Do not introduce a test framework as part of this plan.

**Important Next.js 16 reminders (from AGENTS.md):**
- `params` and `searchParams` are **async** — always `await` them in page components.
- `buttonVariants()` is client-only — use Tailwind classes directly in Server Components.
- Use `<img>` for MinIO URLs, never `next/image`.
- Before using any Next.js API you are unsure about, check `node_modules/next/dist/docs/`.
- Server Components cannot pass functions as children to Client Components — keep the Server/Client split crisp.

**Commit discipline:** Each task is one commit. Do not batch tasks.

---

### Task 1: Add PRACTICE_QUESTIONS_MANAGE permission and seed it

**Files:**
- Modify: `lib/permissions/constants.ts`

Note: `lib/db/seed.ts` is **not** modified — the `admin` profile already uses `ALL_PERMISSIONS`, so the new permission propagates automatically on next seed run.

- [ ] **Step 1: Add the permission constant**

In `lib/permissions/constants.ts`, add the new entry in the Admin block:

```typescript
export const PERMISSIONS = {
  // Readings
  READINGS_VIEW: "readings:view",
  READINGS_CREATE: "readings:create",

  // AI Interpretation
  AI_USE: "ai:use",

  // Courses/Content
  COURSES_ACCESS: "courses:access",

  // Admin
  ADMIN_PROFILES: "admin:profiles",
  ADMIN_PLANS: "admin:plans",
  ADMIN_USERS: "admin:users",
  ADMIN_DECKS: "admin:decks",
  ADMIN_PRACTICE_QUESTIONS: "admin:practice_questions",
} as const;
```

The `admin` seed profile uses `ALL_PERMISSIONS` already, so the new permission automatically flows to admin on next seed run. No change required to `seed.ts` for admin.

- [ ] **Step 2: Run seed to propagate the new permission**

```bash
yarn seed
```

Expected output: `Seed complete.` and `✓ admin profile` line.

- [ ] **Step 3: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/permissions/constants.ts
git commit -m "feat: add admin:practice_questions permission"
```

---

### Task 2: Create PracticeQuestion model

**Files:**
- Create: `lib/readings/practice-question-model.ts`

- [ ] **Step 1: Write the model**

Create `lib/readings/practice-question-model.ts`:

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IPracticeQuestion {
  _id: mongoose.Types.ObjectId;
  text: string;
  deckId: mongoose.Types.ObjectId | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PracticeQuestionSchema = new Schema<IPracticeQuestion>(
  {
    text: { type: String, required: true, trim: true },
    deckId: {
      type: Schema.Types.ObjectId,
      ref: "Deck",
      default: null,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index to speed up eligibility queries for the draw operation
PracticeQuestionSchema.index({ active: 1, deckId: 1 });

export const PracticeQuestion: Model<IPracticeQuestion> =
  models.PracticeQuestion ??
  model<IPracticeQuestion>("PracticeQuestion", PracticeQuestionSchema);
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/readings/practice-question-model.ts
git commit -m "feat: add PracticeQuestion model"
```

---

### Task 3: Create PracticeQuestion service (CRUD + draw)

**Files:**
- Create: `lib/readings/practice-question-service.ts`

- [ ] **Step 1: Write the service**

Create `lib/readings/practice-question-service.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { PracticeQuestion } from "./practice-question-model";
import type { IPracticeQuestion } from "./practice-question-model";
import mongoose from "mongoose";

export interface ListPracticeQuestionsOptions {
  page?: number;
  perPage?: number;
  deckId?: string | null | "global" | "any";
  active?: boolean | "any";
}

export async function listPracticeQuestions(
  options: ListPracticeQuestionsOptions = {}
): Promise<{ items: IPracticeQuestion[]; total: number }> {
  await connectDB();

  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage ?? 20;
  const skip = (page - 1) * perPage;

  const filter: Record<string, unknown> = {};

  if (options.deckId === "global") {
    filter.deckId = null;
  } else if (options.deckId && options.deckId !== "any") {
    filter.deckId = new mongoose.Types.ObjectId(options.deckId);
  }

  if (options.active === true || options.active === false) {
    filter.active = options.active;
  }

  const [items, total] = await Promise.all([
    PracticeQuestion.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(perPage)
      .lean(),
    PracticeQuestion.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getPracticeQuestionById(
  id: string
): Promise<IPracticeQuestion | null> {
  await connectDB();
  return PracticeQuestion.findById(id).lean();
}

export async function createPracticeQuestion(data: {
  text: string;
  deckId: string | null;
  active: boolean;
}): Promise<IPracticeQuestion> {
  await connectDB();

  const text = data.text.trim();
  if (!text) {
    throw new Error("Texto da pergunta é obrigatório");
  }

  return PracticeQuestion.create({
    text,
    deckId: data.deckId ? new mongoose.Types.ObjectId(data.deckId) : null,
    active: data.active,
  });
}

export async function updatePracticeQuestion(
  id: string,
  data: {
    text?: string;
    deckId?: string | null;
    active?: boolean;
  }
): Promise<IPracticeQuestion | null> {
  await connectDB();

  const update: Record<string, unknown> = {};

  if (data.text !== undefined) {
    const text = data.text.trim();
    if (!text) throw new Error("Texto da pergunta é obrigatório");
    update.text = text;
  }

  if (data.deckId !== undefined) {
    update.deckId = data.deckId
      ? new mongoose.Types.ObjectId(data.deckId)
      : null;
  }

  if (data.active !== undefined) {
    update.active = data.active;
  }

  return PracticeQuestion.findByIdAndUpdate(id, update, { new: true }).lean();
}

export async function deletePracticeQuestion(id: string): Promise<void> {
  await connectDB();
  await PracticeQuestion.findByIdAndDelete(id);
}

/**
 * Returns a random active practice question eligible for the given deck.
 * Eligibility: active AND (deckId = provided deckId OR deckId = null).
 * Returns null if no eligible question exists.
 *
 * The optional `excludeId` lets callers (e.g. "Sortear outra") avoid
 * drawing the same question twice in a row when multiple eligible
 * options are available. If excluding would leave the result set
 * empty, the exclusion is ignored.
 */
export async function drawRandomPracticeQuestion(
  deckId: string,
  excludeId?: string
): Promise<IPracticeQuestion | null> {
  await connectDB();

  const baseMatch: Record<string, unknown> = {
    active: true,
    $or: [
      { deckId: new mongoose.Types.ObjectId(deckId) },
      { deckId: null },
    ],
  };

  // Count eligible questions (including the excluded one) — used to decide
  // whether excluding is safe.
  const eligibleTotal = await PracticeQuestion.countDocuments(baseMatch);
  if (eligibleTotal === 0) return null;

  const match: Record<string, unknown> = { ...baseMatch };
  if (excludeId && eligibleTotal > 1) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }

  const [doc] = await PracticeQuestion.aggregate<IPracticeQuestion>([
    { $match: match },
    { $sample: { size: 1 } },
  ]);

  return doc ?? null;
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/readings/practice-question-service.ts
git commit -m "feat: add PracticeQuestion service with CRUD and random draw"
```

---

### Task 4: Extend UserInterpretation model with mode, userAnswer, feedback

**Files:**
- Modify: `lib/readings/interpretation-model.ts`

- [ ] **Step 1: Update the interface and schema**

Replace the current contents of `lib/readings/interpretation-model.ts` with:

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export type InterpretationMode = "normal" | "practice";

export interface IUserInterpretation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  cardIds: mongoose.Types.ObjectId[];
  cardKey: string;
  context: string;
  answer?: string; // optional: not used in practice mode
  combinationId: mongoose.Types.ObjectId;
  mode: InterpretationMode;
  userAnswer?: string; // practice mode only
  feedback?: string;   // practice mode only
  createdAt: Date;
  updatedAt: Date;
}

const UserInterpretationSchema = new Schema<IUserInterpretation>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    deckId: { type: Schema.Types.ObjectId, required: true },
    cardIds: { type: [Schema.Types.ObjectId], required: true },
    cardKey: { type: String, required: true },
    context: { type: String, required: true },
    answer: { type: String, required: false },
    combinationId: {
      type: Schema.Types.ObjectId,
      ref: "CardCombination",
      required: true,
    },
    mode: {
      type: String,
      enum: ["normal", "practice"],
      default: "normal",
      required: true,
    },
    userAnswer: { type: String, required: false },
    feedback: { type: String, required: false },
  },
  { timestamps: true }
);

UserInterpretationSchema.index({ userId: 1, createdAt: -1 });

export const UserInterpretation: Model<IUserInterpretation> =
  models.UserInterpretation ??
  model<IUserInterpretation>("UserInterpretation", UserInterpretationSchema);
```

Note: `answer` is now `required: false`. Existing documents still have the field populated from normal-mode creation; default value for missing `mode` is `"normal"`, so backwards compatibility is automatic.

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/readings/interpretation-model.ts
git commit -m "feat: add mode/userAnswer/feedback to UserInterpretation"
```

---

### Task 5: Extend AIProvider interface with generatePracticeFeedback

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/mock-provider.ts`

- [ ] **Step 1: Add the method to the interface**

In `lib/ai/provider.ts`, add the method signature to `AIProvider`:

```typescript
export interface AIProvider {
  generateCombination(cards: CardData[]): Promise<string>;
  generateInterpretation(
    cards: CardData[],
    combination: string,
    context: string
  ): Promise<string>;
  generatePracticeFeedback(
    cards: CardData[],
    baseCombination: string | null,
    questionText: string,
    userAnswer: string
  ): Promise<string>;
}
```

- [ ] **Step 2: Implement in the mock provider**

In `lib/ai/mock-provider.ts`, append the new method:

```typescript
  async generatePracticeFeedback(
    cards: CardData[],
    baseCombination: string | null,
    questionText: string,
    userAnswer: string
  ): Promise<string> {
    const titles = cards.map((c) => c.title).join(", ");
    const base = baseCombination ? " (considerando a combinação base)" : "";
    return `<p><strong>Feedback sobre sua interpretação</strong>${base}:</p><p>Você trouxe boas conexões entre as cartas <strong>${titles}</strong> ao responder <em>"${questionText}"</em>. Um ponto forte da sua resposta foi o esforço de costurar uma narrativa — ${userAnswer.length} caracteres mostram dedicação. Como sugestão, tente explorar mais os símbolos individuais de cada carta antes de fechar a leitura conjunta.</p>`;
  }
```

This keeps the mock deterministic and uses the real inputs so smoke-testing is meaningful.

**Note on the real prompt (for when a real provider is implemented):**
The prompt template from the spec is:

> Você é um tutor de tarot experiente. O aluno recebeu uma pergunta de treino e escreveu como ele acredita que as cartas a seguir responderiam. Dê um feedback qualitativo, sincero e construtivo sobre a resposta dele — apontando pontos fortes, pontos fracos, omissões importantes e aspectos das cartas que ele poderia explorar melhor. Não dê nota. Não escreva uma "resposta modelo". Seja direto e pedagógico.
>
> Cartas:
> - {title} ({deckName}): {description}
>
> [Se baseCombination existir] Interpretação base das cartas juntas (apenas para seu conhecimento, não mencione ao aluno que isto existe): {baseCombination}
>
> Pergunta de treino: {questionText}
> Resposta do aluno: {userAnswer}
>
> Feedback:

The real provider should implement this, but only the mock is in scope here.

- [ ] **Step 3: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/ai/provider.ts lib/ai/mock-provider.ts
git commit -m "feat: add generatePracticeFeedback to AI provider"
```

---

### Task 6: Refactor createReading to extract getOrCreateCombination helper

**Files:**
- Modify: `lib/readings/service.ts`

**Why first:** both normal and practice flows need this helper. Extracting it up-front keeps Task 7 focused on the practice-specific logic.

- [ ] **Step 1: Extract the helper**

In `lib/readings/service.ts`, add a private helper **before** `createReading`:

```typescript
async function getOrCreateCombination(
  deckId: string,
  cards: CardData[],
  cardIds: string[],
  cardKey: string
): Promise<ICardCombination> {
  const provider = getAIProvider();

  let combination = await CardCombination.findOne({ deckId, cardKey }).lean();

  if (!combination) {
    const answer = await provider.generateCombination(cards);
    combination = await CardCombination.findOneAndUpdate(
      { deckId, cardKey },
      {
        $setOnInsert: {
          deckId,
          cardIds,
          cardKey,
          answer,
          status: "generated",
          source: "ai",
        },
      },
      { upsert: true, new: true }
    ).lean();

    if (!combination) {
      throw new Error("Falha ao criar combinação de cartas");
    }
  }

  return combination;
}
```

- [ ] **Step 2: Replace the inlined logic in `createReading`**

Inside `createReading`, replace the block from `const provider = getAIProvider();` through the combination upsert (roughly lines 56–82 in the current file) with:

```typescript
  const cardKey = buildCardKey(cardIds);
  const combination = await getOrCreateCombination(deckId, cards, cardIds, cardKey);

  const provider = getAIProvider();

  // Generate contextual interpretation (always new)
  const interpretationAnswer = await provider.generateInterpretation(
    cards,
    combination.answer,
    context
  );
```

The rest of `createReading` stays the same. Ensure the `mode: "normal"` is passed when saving:

```typescript
  const interpretation = await UserInterpretation.create({
    userId,
    deckId,
    cardIds,
    cardKey,
    context,
    answer: interpretationAnswer,
    combinationId: combination._id,
    mode: "normal",
  });
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 4: Smoke-test the normal flow**

```bash
yarn dev
```

Open the app, log in, create a new reading (deck → cards → question), confirm the detail page still renders correctly. Stop dev server when done.

- [ ] **Step 5: Commit**

```bash
git add lib/readings/service.ts
git commit -m "refactor: extract getOrCreateCombination helper"
```

---

### Task 7: Add createPracticeAttempt service function

**Files:**
- Modify: `lib/readings/service.ts`

- [ ] **Step 1: Add the function**

At the end of `lib/readings/service.ts` (after `createReading`), add:

```typescript
export async function createPracticeAttempt(data: {
  userId: string;
  deckId: string;
  cardIds: string[];
  questionText: string;
  userAnswer: string;
}): Promise<IUserInterpretation> {
  await connectDB();

  const { userId, deckId, cardIds, questionText, userAnswer } = data;

  // Validate inputs
  if (!questionText.trim()) {
    throw new Error("Pergunta de treino é obrigatória");
  }
  if (!userAnswer.trim()) {
    throw new Error("Resposta é obrigatória");
  }
  if (cardIds.length < 2 || cardIds.length > 5) {
    throw new Error("Selecione entre 2 e 5 cartas");
  }

  // Fetch deck and validate cards exist
  const deck = await Deck.findById(deckId).lean();
  if (!deck) throw new Error("Baralho não encontrado");

  const deckCardIds = new Set(deck.cards.map((c) => c._id.toString()));
  for (const cardId of cardIds) {
    if (!deckCardIds.has(cardId)) {
      throw new Error("Uma ou mais cartas não pertencem a este baralho");
    }
  }

  // Build card data
  const cards: CardData[] = cardIds.map((cardId) => {
    const card = deck.cards.find((c) => c._id.toString() === cardId)!;
    return {
      _id: card._id.toString(),
      title: card.title,
      description: card.description,
    };
  });

  const cardKey = buildCardKey(cardIds);
  const combination = await getOrCreateCombination(deckId, cards, cardIds, cardKey);

  const provider = getAIProvider();
  const feedback = await provider.generatePracticeFeedback(
    cards,
    combination.answer ?? null,
    questionText.trim(),
    userAnswer.trim()
  );

  const interpretation = await UserInterpretation.create({
    userId,
    deckId,
    cardIds,
    cardKey,
    context: questionText.trim(), // snapshot of the practice question
    combinationId: combination._id,
    mode: "practice",
    userAnswer: userAnswer.trim(),
    feedback,
  });

  return interpretation.toObject();
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add lib/readings/service.ts
git commit -m "feat: add createPracticeAttempt service"
```

---

### Task 8: Add server actions for practice flow (draw + submit)

**Files:**
- Modify: `app/(dashboard)/leituras/actions.ts`

- [ ] **Step 1: Add the two new actions**

Add these two imports **at the top** of `app/(dashboard)/leituras/actions.ts`, alongside the existing imports (not at the bottom):

```typescript
import { createPracticeAttempt } from "@/lib/readings/service";
import { drawRandomPracticeQuestion } from "@/lib/readings/practice-question-service";
```

Then append the two new action functions to the end of the file:

```typescript

export async function drawPracticeQuestionAction(data: {
  deckId: string;
  excludeId?: string;
}): Promise<{ id: string; text: string } | { id: null; text: null }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_CREATE)) {
    return { id: null, text: null };
  }

  const question = await drawRandomPracticeQuestion(data.deckId, data.excludeId);
  if (!question) {
    return { id: null, text: null };
  }

  return { id: question._id.toString(), text: question.text };
}

export async function createPracticeAttemptAction(data: {
  deckId: string;
  cardIds: string[];
  questionText: string;
  userAnswer: string;
}): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_CREATE)) {
    return { error: "Sem permissão para criar leituras" };
  }

  const quota = await checkReadingQuota(session.user.id);
  if (!quota.allowed) {
    return { error: "Você atingiu o limite de leituras deste mês" };
  }

  try {
    const interpretation = await createPracticeAttempt({
      userId: session.user.id,
      deckId: data.deckId,
      cardIds: data.cardIds,
      questionText: data.questionText,
      userAnswer: data.userAnswer,
    });

    return { id: interpretation._id.toString() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar treino" };
  }
}
```

Notes:
- `drawPracticeQuestionAction` returns `{ id, text }` (not just text). The `id` is used client-side so "Sortear outra" can pass it as `excludeId` to avoid repeats.
- Both actions require `READINGS_CREATE` (a session + permission check), matching the existing `createReadingAction`.

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add 'app/(dashboard)/leituras/actions.ts'
git commit -m "feat: add draw and submit server actions for practice mode"
```

---

### Task 9: Add admin practice-questions server actions

**Files:**
- Create: `app/(dashboard)/admin/practice-questions/actions.ts`

- [ ] **Step 1: Write the actions file**

Create `app/(dashboard)/admin/practice-questions/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  createPracticeQuestion,
  updatePracticeQuestion,
  deletePracticeQuestion,
} from "@/lib/readings/practice-question-service";
import { redirect } from "next/navigation";

async function requirePermission() {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    throw new Error("Unauthorized");
  }
}

export async function createPracticeQuestionAction(formData: FormData) {
  await requirePermission();

  const text = (formData.get("text") as string | null)?.trim() ?? "";
  const deckIdRaw = (formData.get("deckId") as string | null)?.trim() ?? "";
  const active = formData.get("active") === "on";

  if (!text) throw new Error("Texto da pergunta é obrigatório");

  await createPracticeQuestion({
    text,
    deckId: deckIdRaw === "" || deckIdRaw === "global" ? null : deckIdRaw,
    active,
  });

  redirect("/admin/practice-questions");
}

export async function updatePracticeQuestionAction(formData: FormData) {
  await requirePermission();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID é obrigatório");

  const text = (formData.get("text") as string | null)?.trim() ?? "";
  const deckIdRaw = (formData.get("deckId") as string | null)?.trim() ?? "";
  const active = formData.get("active") === "on";

  if (!text) throw new Error("Texto da pergunta é obrigatório");

  await updatePracticeQuestion(id, {
    text,
    deckId: deckIdRaw === "" || deckIdRaw === "global" ? null : deckIdRaw,
    active,
  });

  redirect("/admin/practice-questions");
}

export async function deletePracticeQuestionAction(formData: FormData) {
  await requirePermission();

  const id = formData.get("id") as string;
  if (!id) throw new Error("ID é obrigatório");

  await deletePracticeQuestion(id);

  redirect("/admin/practice-questions");
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add 'app/(dashboard)/admin/practice-questions/actions.ts'
git commit -m "feat: add admin practice-questions server actions"
```

---

### Task 10: Create admin practice-questions list page

**Files:**
- Create: `app/(dashboard)/admin/practice-questions/page.tsx`

- [ ] **Step 1: Write the list page**

Create `app/(dashboard)/admin/practice-questions/page.tsx`:

```typescript
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listPracticeQuestions } from "@/lib/readings/practice-question-service";
import { listDecks } from "@/lib/decks/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  searchParams: Promise<{
    page?: string;
    deck?: string;
    status?: string;
  }>;
}

const PER_PAGE = 20;

export default async function PracticeQuestionsPage({ searchParams }: Props) {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    redirect("/");
  }

  const { page: pageParam, deck: deckParam, status: statusParam } =
    await searchParams;

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const deckFilter: "any" | "global" | string =
    !deckParam || deckParam === "any"
      ? "any"
      : deckParam === "global"
        ? "global"
        : deckParam;

  const activeFilter: boolean | "any" =
    statusParam === "active"
      ? true
      : statusParam === "inactive"
        ? false
        : "any";

  const [decks, result] = await Promise.all([
    listDecks(),
    listPracticeQuestions({
      page,
      perPage: PER_PAGE,
      deckId: deckFilter,
      active: activeFilter,
    }),
  ]);

  const deckMap = new Map(
    decks.map((d) => [d._id.toString(), d.name])
  );

  const totalPages = Math.max(1, Math.ceil(result.total / PER_PAGE));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Perguntas de Treino
        </h1>
        <Link href="/admin/practice-questions/new">
          <Button>Nova Pergunta</Button>
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Baralho
          </label>
          <select
            name="deck"
            defaultValue={deckParam ?? "any"}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="any">Todos</option>
            <option value="global">Global</option>
            {decks.map((d) => (
              <option key={d._id.toString()} value={d._id.toString()}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Status
          </label>
          <select
            name="status"
            defaultValue={statusParam ?? "any"}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="any">Todos</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pergunta</TableHead>
            <TableHead>Baralho</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                Nenhuma pergunta encontrada.
              </TableCell>
            </TableRow>
          ) : (
            result.items.map((q) => (
              <TableRow key={q._id.toString()}>
                <TableCell className="font-medium max-w-xl">
                  <span className="line-clamp-2">{q.text}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {q.deckId
                    ? (deckMap.get(q.deckId.toString()) ?? "—")
                    : "Global"}
                </TableCell>
                <TableCell>
                  <Badge variant={q.active ? "default" : "secondary"}>
                    {q.active ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/practice-questions/${q._id.toString()}`}>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          {page > 1 && (
            <Link
              href={`/admin/practice-questions?page=${page - 1}${deckParam ? `&deck=${deckParam}` : ""}${statusParam ? `&status=${statusParam}` : ""}`}
              className="text-sm underline"
            >
              Anterior
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/practice-questions?page=${page + 1}${deckParam ? `&deck=${deckParam}` : ""}${statusParam ? `&status=${statusParam}` : ""}`}
              className="text-sm underline"
            >
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add 'app/(dashboard)/admin/practice-questions/page.tsx'
git commit -m "feat: add admin practice-questions list page"
```

---

### Task 11: Create admin practice-questions "new" page

**Files:**
- Create: `app/(dashboard)/admin/practice-questions/new/page.tsx`

- [ ] **Step 1: Write the page**

Create `app/(dashboard)/admin/practice-questions/new/page.tsx`:

```typescript
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listDecks } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createPracticeQuestionAction } from "../actions";

export default async function NewPracticeQuestionPage() {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    redirect("/");
  }

  const decks = await listDecks();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nova Pergunta de Treino</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createPracticeQuestionAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="text">Pergunta</Label>
            <textarea
              id="text"
              name="text"
              rows={4}
              required
              placeholder="Ex: Como essas cartas responderiam alguém em dúvida sobre mudar de carreira?"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deckId">Baralho</Label>
            <select
              id="deckId"
              name="deckId"
              defaultValue="global"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="global">Global (qualquer baralho)</option>
              {decks.map((d) => (
                <option key={d._id.toString()} value={d._id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Escolha um baralho específico, ou mantenha Global para todos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Ativa
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Criar Pergunta</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add 'app/(dashboard)/admin/practice-questions/new/page.tsx'
git commit -m "feat: add admin practice-questions new page"
```

---

### Task 12: Create admin practice-questions edit page

**Files:**
- Create: `app/(dashboard)/admin/practice-questions/[id]/page.tsx`

- [ ] **Step 1: Write the page**

Create `app/(dashboard)/admin/practice-questions/[id]/page.tsx`:

```typescript
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getPracticeQuestionById } from "@/lib/readings/practice-question-service";
import { listDecks } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  updatePracticeQuestionAction,
  deletePracticeQuestionAction,
} from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPracticeQuestionPage({ params }: Props) {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.ADMIN_PRACTICE_QUESTIONS)
  ) {
    redirect("/");
  }

  const { id } = await params;
  const [question, decks] = await Promise.all([
    getPracticeQuestionById(id),
    listDecks(),
  ]);

  if (!question) notFound();

  const deckIdValue = question.deckId ? question.deckId.toString() : "global";

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Editar Pergunta de Treino</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updatePracticeQuestionAction} className="space-y-4">
          <input type="hidden" name="id" value={question._id.toString()} />

          <div className="space-y-2">
            <Label htmlFor="text">Pergunta</Label>
            <textarea
              id="text"
              name="text"
              rows={4}
              required
              defaultValue={question.text}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deckId">Baralho</Label>
            <select
              id="deckId"
              name="deckId"
              defaultValue={deckIdValue}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            >
              <option value="global">Global (qualquer baralho)</option>
              {decks.map((d) => (
                <option key={d._id.toString()} value={d._id.toString()}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              defaultChecked={question.active}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active" className="cursor-pointer">
              Ativa
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
          </div>
        </form>

        <form action={deletePracticeQuestionAction} className="mt-6 border-t border-border pt-4">
          <input type="hidden" name="id" value={question._id.toString()} />
          <Button type="submit" variant="destructive">
            Excluir Pergunta
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add 'app/(dashboard)/admin/practice-questions/[id]/page.tsx'
git commit -m "feat: add admin practice-questions edit page"
```

---

### Task 13: Add sidebar link for practice questions (admin section)

**Files:**
- Modify: `components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add the new permission to admin detection and a sidebar item**

In `components/dashboard/sidebar.tsx`:

Extend `ADMIN_PERMISSIONS`:

```typescript
const ADMIN_PERMISSIONS = [
  "admin:profiles",
  "admin:plans",
  "admin:users",
  "admin:decks",
  "admin:practice_questions",
];
```

Add an import for the `MessageCircleQuestion` icon (or another lucide icon of your choice) at the top:

```typescript
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Layers,
  User,
  Users,
  Settings,
  Shield,
  CreditCard,
  Crown,
  MessageCircleQuestion,
} from "lucide-react";
```

Inside the admin `SidebarSection`, add the new item at the end:

```tsx
<SidebarSection label="Admin" storageKey="sidebar-admin-open" defaultOpen={false}>
  <SidebarItem href="/admin/profiles" label="Perfis" icon={Shield} onNavigate={onNavigate} />
  <SidebarItem href="/admin/plans" label="Planos" icon={CreditCard} onNavigate={onNavigate} />
  <SidebarItem href="/admin/decks" label="Baralhos" icon={Layers} onNavigate={onNavigate} />
  <SidebarItem href="/admin/users" label="Usuários" icon={Users} onNavigate={onNavigate} />
  <SidebarItem
    href="/admin/practice-questions"
    label="Perguntas de Treino"
    icon={MessageCircleQuestion}
    onNavigate={onNavigate}
  />
</SidebarSection>
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke-test admin CRUD**

Log in as admin → open sidebar → Admin → "Perguntas de Treino". Create, edit, toggle active, delete a question. Verify filters work.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat: add practice questions link to admin sidebar"
```

---

### Task 14: Create PathChoice client component

**Files:**
- Create: `components/readings/path-choice.tsx`

- [ ] **Step 1: Write the component**

Create `components/readings/path-choice.tsx`:

```tsx
"use client";

import { GraduationCap, Sparkles } from "lucide-react";

export type ReadingPath = "practice" | "normal";

interface PathChoiceProps {
  onChoose: (path: ReadingPath) => void;
}

export function PathChoice({ onChoose }: PathChoiceProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Como você quer seguir?
      </h3>

      <div className="rounded-lg border border-border overflow-hidden min-h-64 grid grid-cols-1 md:grid-cols-2">
        {/* Left: Practice */}
        <button
          type="button"
          onClick={() => onChoose("practice")}
          className="group flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-muted/40 border-b md:border-b-0 md:border-r border-border appearance-none bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <GraduationCap className="h-10 w-10 text-primary/80 group-hover:text-primary transition-colors" />
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">
              Praticar interpretação
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Receba uma pergunta e interprete como você acredita que as
              cartas responderiam. Não gostou da pergunta? Crie a sua
              própria. Depois, você receberá um feedback sincero sobre sua
              leitura.
            </p>
          </div>
        </button>

        {/* Right: Normal reading */}
        <button
          type="button"
          onClick={() => onChoose("normal")}
          className="group flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-muted/40 appearance-none bg-transparent cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <Sparkles className="h-10 w-10 text-primary/80 group-hover:text-primary transition-colors" />
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground">
              Fazer uma leitura
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Escreva sua própria pergunta e receba a interpretação para as
              cartas selecionadas.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/readings/path-choice.tsx
git commit -m "feat: add PathChoice component for reading wizard"
```

---

### Task 15: Create PracticeStep client component

**Files:**
- Create: `components/readings/practice-step.tsx`
- Verify available: `components/ui/alert-dialog.tsx` (shadcn). If the file does not exist, add the shadcn AlertDialog component first via the project's normal shadcn install method before writing this file.

- [ ] **Step 1: Verify AlertDialog is available**

```bash
ls components/ui/alert-dialog.tsx
```

If missing, run:

```bash
npx shadcn@latest add alert-dialog
```

(Confirm it adds the file and any dependencies. Then commit this as a prerequisite: `git add components/ui/alert-dialog.tsx && git commit -m "chore: add shadcn AlertDialog component"`.)

- [ ] **Step 2: Write the component**

Create `components/readings/practice-step.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shuffle } from "lucide-react";
import {
  drawPracticeQuestionAction,
  createPracticeAttemptAction,
} from "@/app/(dashboard)/leituras/actions";
import { useRouter } from "next/navigation";

interface PracticeStepProps {
  deckId: string;
  cardIds: string[];
  quotaUsed: number;
  quotaLimit: number | null;
  onBack: () => void;
}

export function PracticeStep({
  deckId,
  cardIds,
  quotaUsed,
  quotaLimit,
  onBack,
}: PracticeStepProps) {
  const router = useRouter();
  const [questionText, setQuestionText] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [lastDrawnId, setLastDrawnId] = useState<string | null>(null);
  const [lastDrawnText, setLastDrawnText] = useState<string | null>(null);
  const [hasAnyEligible, setHasAnyEligible] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, startDrawTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();

  const didInitialDraw = useRef(false);

  // Draw an initial suggestion on mount
  useEffect(() => {
    if (didInitialDraw.current) return;
    didInitialDraw.current = true;

    (async () => {
      const result = await drawPracticeQuestionAction({ deckId });
      if (result.text) {
        setQuestionText(result.text);
        setLastDrawnId(result.id);
        setLastDrawnText(result.text);
        setHasAnyEligible(true);
      } else {
        setHasAnyEligible(false);
      }
    })();
  }, [deckId]);

  const performDraw = () => {
    startDrawTransition(async () => {
      const result = await drawPracticeQuestionAction({
        deckId,
        excludeId: lastDrawnId ?? undefined,
      });
      if (result.text) {
        setQuestionText(result.text);
        setLastDrawnId(result.id);
        setLastDrawnText(result.text);
        setHasAnyEligible(true);
      }
    });
  };

  const handleDrawClick = () => {
    // If user has edited the field since the last draw, confirm first.
    const userEdited =
      lastDrawnText === null || questionText !== lastDrawnText;
    if (userEdited && questionText.trim().length > 0) {
      setConfirmOpen(true);
      return;
    }
    performDraw();
  };

  const handleConfirmDraw = () => {
    setConfirmOpen(false);
    performDraw();
  };

  const handleSubmit = () => {
    if (!questionText.trim() || !userAnswer.trim()) return;

    startSubmitTransition(async () => {
      setError(null);
      const result = await createPracticeAttemptAction({
        deckId,
        cardIds,
        questionText: questionText.trim(),
        userAnswer: userAnswer.trim(),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/leituras/${result.id}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button variant="ghost" onClick={onBack}>
        ← Voltar
      </Button>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="question-text">Pergunta de treino</Label>
            {hasAnyEligible && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDrawClick}
                disabled={isDrawing || isSubmitting}
                className="gap-1.5"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Sortear outra
              </Button>
            )}
          </div>
          <textarea
            id="question-text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            placeholder="Escreva uma pergunta para treinar sua interpretação"
            disabled={isSubmitting}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-answer">Sua resposta</Label>
          <textarea
            id="user-answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            rows={8}
            placeholder="Escreva como você acredita que as cartas responderiam essa pergunta..."
            disabled={isSubmitting}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          />
        </div>

        {quotaLimit !== null && (
          <p className="text-sm text-muted-foreground">
            Esta será sua {quotaUsed + 1}ª de {quotaLimit} leituras este mês
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting || !questionText.trim() || !userAnswer.trim()
          }
          className="w-full"
        >
          {isSubmitting ? "Enviando resposta..." : "Enviar resposta"}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sortear outra pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você perderá o texto que digitou.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDraw}>
              Sortear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/readings/practice-step.tsx
git commit -m "feat: add PracticeStep component"
```

---

### Task 16: Integrate choice + practice steps into NewReadingWizard

**Files:**
- Modify: `components/readings/new-reading-wizard.tsx`

- [ ] **Step 1: Extend the step state and add the two new steps**

Replace the contents of `components/readings/new-reading-wizard.tsx` with:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createReadingAction } from "@/app/(dashboard)/leituras/actions";
import { PathChoice } from "./path-choice";
import type { ReadingPath } from "./path-choice";
import { PracticeStep } from "./practice-step";

export interface DeckForWizard {
  _id: string;
  name: string;
  type: string;
  coverImage: string | null;
  cardAspectRatio: string;
  cards: {
    _id: string;
    title: string;
    image: string;
  }[];
}

interface NewReadingWizardProps {
  decks: DeckForWizard[];
  quotaUsed: number;
  quotaLimit: number | null;
}

type WizardStep = "deck" | "cards" | "choice" | "practice" | "normal";

export function NewReadingWizard({
  decks,
  quotaUsed,
  quotaLimit,
}: NewReadingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("deck");
  const [selectedDeck, setSelectedDeck] = useState<DeckForWizard | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectDeck = (deck: DeckForWizard) => {
    setSelectedDeck(deck);
    setSelectedCardIds([]);
    setStep("cards");
  };

  const handleToggleCard = (cardId: string) => {
    setSelectedCardIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, cardId];
    });
  };

  const handleChoose = (path: ReadingPath) => {
    setStep(path === "practice" ? "practice" : "normal");
  };

  const handleSubmitNormal = () => {
    if (!selectedDeck || selectedCardIds.length < 2 || !context.trim()) return;

    startTransition(async () => {
      setError(null);
      const result = await createReadingAction({
        deckId: selectedDeck._id,
        cardIds: selectedCardIds,
        context: context.trim(),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/leituras/${result.id}`);
      }
    });
  };

  // Shared summary of selected cards (shown above choice/practice/normal steps)
  const selectedCardsSummary = selectedDeck && (
    <div>
      <p className="text-sm font-medium mb-2">Cartas selecionadas:</p>
      <div className="flex gap-2 flex-wrap">
        {selectedCardIds.map((cardId, i) => {
          const card = selectedDeck.cards.find((c) => c._id === cardId);
          return card ? (
            <span
              key={cardId}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              {card.title}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step: Select Deck */}
      {step === "deck" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha o baralho para sua leitura:
          </p>
          {decks.length === 0 ? (
            <p className="text-muted-foreground">Nenhum baralho disponível.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {decks.map((deck) => (
                <button
                  key={deck._id}
                  type="button"
                  onClick={() => handleSelectDeck(deck)}
                  className="group rounded-lg border border-border bg-card text-left shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative w-full aspect-[3/2] bg-muted flex items-center justify-center">
                    {deck.coverImage ? (
                      <img
                        src={deck.coverImage}
                        alt={deck.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Sem imagem
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold group-hover:underline">
                      {deck.name}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {deck.cards.length}{" "}
                      {deck.cards.length === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Select Cards */}
      {step === "cards" && selectedDeck && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Selecione de 2 a 5 cartas de{" "}
                <strong>{selectedDeck.name}</strong>:
              </p>
              <p className="text-sm font-medium mt-1">
                {selectedCardIds.length} de 5 selecionadas
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setStep("deck");
                setSelectedCardIds([]);
              }}
            >
              Trocar baralho
            </Button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedDeck.cards.map((card) => {
              const isSelected = selectedCardIds.includes(card._id);
              const selectionIndex = selectedCardIds.indexOf(card._id);
              return (
                <button
                  key={card._id}
                  type="button"
                  onClick={() => handleToggleCard(card._id)}
                  className={`group relative flex flex-col gap-1.5 rounded-md border-2 p-1 transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  <div
                    className="relative overflow-hidden rounded"
                    style={{ aspectRatio: selectedDeck.cardAspectRatio }}
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      className={`object-contain w-full h-full transition-opacity ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-70 group-hover:opacity-100"
                      }`}
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {selectionIndex + 1}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight truncate">
                    {card.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep("choice")}
              disabled={selectedCardIds.length < 2}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step: Choice */}
      {step === "choice" && selectedDeck && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("cards")}>
            ← Voltar para seleção
          </Button>
          <div className="rounded-lg border border-border p-4">
            {selectedCardsSummary}
          </div>
          <PathChoice onChoose={handleChoose} />
        </div>
      )}

      {/* Step: Practice */}
      {step === "practice" && selectedDeck && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            {selectedCardsSummary}
          </div>
          <PracticeStep
            deckId={selectedDeck._id}
            cardIds={selectedCardIds}
            quotaUsed={quotaUsed}
            quotaLimit={quotaLimit}
            onBack={() => setStep("choice")}
          />
        </div>
      )}

      {/* Step: Normal (write question + submit) */}
      {step === "normal" && selectedDeck && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep("choice")}>
            ← Voltar
          </Button>

          <div className="space-y-3 rounded-lg border border-border p-4">
            {selectedCardsSummary}

            <div className="space-y-1.5">
              <Label htmlFor="context">Sua pergunta ou contexto</Label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex: O que essas cartas significam para minha vida profissional?"
                rows={4}
                required
                disabled={isPending}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              />
            </div>

            {quotaLimit !== null && (
              <p className="text-sm text-muted-foreground">
                Esta será sua {quotaUsed + 1}ª de {quotaLimit} leituras este mês
              </p>
            )}

            <Button
              onClick={handleSubmitNormal}
              disabled={
                isPending || !context.trim() || selectedCardIds.length < 2
              }
              className="w-full"
            >
              {isPending ? "Gerando interpretação..." : "Gerar Leitura"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke-test the full wizard**

Start dev server, log in, go to `/leituras/nova`:
1. Select a deck, then 2-5 cards, then **Continuar**.
2. The choice screen appears with two halves (desktop) or stacked (mobile).
3. Click **Praticar interpretação** → practice step shows. If you created a practice question for the deck or global in Task 11 it should appear pre-filled; otherwise the field is empty.
4. Click **Sortear outra** if eligible — text changes.
5. Edit the question text, click **Sortear outra** again → `AlertDialog` appears. Cancel, then confirm.
6. Fill the answer, click **Enviar resposta** → redirects to `/leituras/[id]`.
7. Repeat but pick **Fazer uma leitura** on the choice screen → confirm the old normal flow still works.

- [ ] **Step 4: Commit**

```bash
git add components/readings/new-reading-wizard.tsx
git commit -m "feat: integrate choice and practice steps into new reading wizard"
```

---

### Task 17: Render practice-mode layout on reading detail page

**Files:**
- Modify: `app/(dashboard)/leituras/[id]/page.tsx`

- [ ] **Step 1: Branch the render on `mode`**

Update `app/(dashboard)/leituras/[id]/page.tsx` to handle both modes. Replace the final JSX (from `return (` onwards) with:

```tsx
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/leituras"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para Leituras
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {interpretation.mode === "practice" ? "Seu Treino" : "Sua Leitura"}
          </h2>
          {interpretation.mode === "practice" && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Treino
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{deck.name}</p>
      </div>

      {/* Selected cards */}
      <div className="flex gap-3 flex-wrap">
        {cards.map((card, i) => (
          <div key={card._id} className="flex flex-col items-center gap-1 w-20">
            <div className="relative">
              <div
                className="overflow-hidden rounded-md bg-muted"
                style={{ aspectRatio, width: "80px" }}
              >
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    ?
                  </div>
                )}
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            </div>
            <span className="text-xs text-center font-medium leading-tight">
              {card.title}
            </span>
          </div>
        ))}
      </div>

      {interpretation.mode === "practice" ? (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">Pergunta de treino:</p>
            <p className="text-sm text-muted-foreground italic">
              &quot;{interpretation.context}&quot;
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Sua resposta</h3>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm whitespace-pre-wrap">
                {interpretation.userAnswer}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Feedback</h3>
            <div className="rounded-lg border border-border p-4">
              <RichTextViewer
                content={interpretation.feedback ?? ""}
                className="text-sm"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-1">Sua pergunta:</p>
            <p className="text-sm text-muted-foreground italic">
              &quot;{interpretation.context}&quot;
            </p>
          </div>

          {combination && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Relação entre as cartas</h3>
              <div className="rounded-lg border border-border p-4">
                <RichTextViewer
                  content={combination.answer}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Interpretação para você</h3>
            <div className="rounded-lg border border-border p-4">
              <RichTextViewer
                content={interpretation.answer ?? ""}
                className="text-sm"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
```

Note: `interpretation.answer` is now optional. The normal branch uses `?? ""` defensively, but in practice all normal-mode documents have an `answer`.

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke-test both detail layouts**

Open a previously-created normal reading → layout unchanged. Open a practice attempt created in Task 16 smoke test → shows "Treino" badge, "Pergunta de treino", "Sua resposta", "Feedback" sections.

- [ ] **Step 4: Commit**

```bash
git add 'app/(dashboard)/leituras/[id]/page.tsx'
git commit -m "feat: branch reading detail page by mode (practice vs normal)"
```

---

### Task 18: Add Treino badge and practice-aware preview to history list

**Files:**
- Modify: `app/(dashboard)/leituras/page.tsx`

- [ ] **Step 1: Update the list item rendering**

In the `readings.map(...)` block of `app/(dashboard)/leituras/page.tsx`, replace the reading info section (inside `<Link>`) with:

```tsx
                {/* Reading info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {deck?.name ?? "Baralho removido"}
                    </span>
                    {reading.mode === "practice" && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        Treino
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(reading.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {reading.mode === "practice"
                      ? `Pergunta: ${reading.context.slice(0, 90)}${reading.context.length > 90 ? "..." : ""}`
                      : reading.context.length > 100
                        ? reading.context.slice(0, 100) + "..."
                        : reading.context}
                  </p>
                </div>
```

The badge uses the same styling as the detail page badge (Task 17) for consistency. Practice items show a prefixed "Pergunta:" to make the semantic clear in the list.

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: build succeeds.

- [ ] **Step 3: Smoke-test history list**

Visit `/leituras` with both normal and practice entries in the history. Confirm:
- Practice items show the "Treino" badge.
- Practice items show the "Pergunta:" prefix in the preview.
- Normal items are unchanged.
- Clicking either type lands on the correct detail layout.

- [ ] **Step 4: Commit**

```bash
git add 'app/(dashboard)/leituras/page.tsx'
git commit -m "feat: show Treino badge and practice preview in readings list"
```

---

### Task 19: Final lint pass and end-to-end smoke test

**Files:** (none modified)

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Expected: no errors. Fix any new warnings introduced by the feature before proceeding.

- [ ] **Step 2: Run build**

```bash
yarn build
```

Expected: build succeeds, no type errors.

- [ ] **Step 3: Full end-to-end smoke test**

With `yarn dev` running, validate as the admin user:

1. `/admin/practice-questions` → create 2 global questions and 1 deck-specific question, all active.
2. Toggle one to inactive; verify filters show it only with status=Inativa or Todos.
3. `/leituras/nova`:
   - Pick a deck that has a matching question. Select 2 cards. **Continuar**.
   - Choice screen renders with both halves.
   - Choose **Praticar**. Field pre-fills with a question. "Sortear outra" should cycle (rarely repeat same). Editing the field and re-sorting triggers the confirm dialog.
   - Submit an answer → redirects to detail page → "Treino" badge, "Pergunta de treino", "Sua resposta", "Feedback".
   - Back to `/leituras`, the new item has a "Treino" badge.
4. `/leituras/nova` again: this time choose **Fazer uma leitura** → old flow works, detail page looks exactly like before.
5. Pick a deck with no eligible question and no globals:
   - **Praticar** → question field empty, placeholder visible, no "Sortear outra" button, can type a custom question and submit successfully.

- [ ] **Step 4: Commit (only if lint/build fixes were needed)**

If any changes were needed in steps 1–2:

```bash
git add -A
git commit -m "chore: final lint/build fixes for practice mode"
```

Otherwise skip this step — this task is verification only.

---

## Summary of deliverables

After all tasks complete, this feature adds:

- A new `PracticeQuestion` admin CRUD (`/admin/practice-questions`) gated by `admin:practice_questions`.
- A **choice step** inserted between card selection and final submission in `/leituras/nova`.
- A **practice flow** that draws/edits a practice question, collects a user interpretation, and produces qualitative feedback — stored as `UserInterpretation` with `mode: "practice"`.
- Mode-aware rendering on the reading detail page and in the history list (with a "Treino" badge).
- A shared `getOrCreateCombination` helper between normal and practice flows.
- A new `generatePracticeFeedback` method on the AI provider interface, implemented in the mock provider.

No data migration needed. Existing readings continue to work unchanged.
