# AI Readings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reading system where users select 2-5 cards from a deck, provide a question/context, and receive AI-generated interpretations (MockProvider for MVP).

**Architecture:** Two new Mongoose models (CardCombination + UserInterpretation), an AI provider adapter layer (interface + MockProvider), a quota system on Profile, a 3-step wizard client component, and a result page. Server action orchestrates the generation flow.

**Tech Stack:** Next.js 16, Mongoose, shadcn/ui, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-05-ai-readings-design.md`

---

### Task 1: AI Provider interface + MockProvider

**Files:**
- Create: `lib/ai/provider.ts`
- Create: `lib/ai/mock-provider.ts`

- [ ] **Step 1: Create provider interface and factory**

Create `lib/ai/provider.ts`:

```typescript
export interface CardData {
  _id: string;
  title: string;
  description: string;
}

export interface AIProvider {
  generateCombination(cards: CardData[]): Promise<string>;
  generateInterpretation(cards: CardData[], combination: string, context: string): Promise<string>;
}

import { MockProvider } from "./mock-provider";

export function getAIProvider(): AIProvider {
  const providerName = process.env.AI_PROVIDER ?? "mock";

  switch (providerName) {
    case "mock":
      return new MockProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerName}`);
  }
}
```

- [ ] **Step 2: Create MockProvider**

Create `lib/ai/mock-provider.ts`:

```typescript
import type { AIProvider, CardData } from "./provider";

export class MockProvider implements AIProvider {
  async generateCombination(cards: CardData[]): Promise<string> {
    const titles = cards.map((c) => c.title).join(", ");
    return `<p>Esta é uma análise da combinação entre as cartas: <strong>${titles}</strong>.</p><p>Juntas, essas cartas sugerem um caminho de transformação e descoberta interior. A energia combinada aponta para um momento de reflexão e crescimento pessoal.</p>`;
  }

  async generateInterpretation(
    cards: CardData[],
    combination: string,
    context: string
  ): Promise<string> {
    const titles = cards.map((c) => c.title).join(", ");
    return `<p>Considerando sua pergunta: <em>"${context}"</em></p><p>As cartas <strong>${titles}</strong> indicam que este é um momento propício para confiar na sua intuição. O contexto que você trouxe ressoa com a energia dessa combinação, sugerindo que as respostas que busca já estão dentro de você.</p>`;
  }
}
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

- [ ] **Step 4: Commit**

```bash
git add lib/ai/provider.ts lib/ai/mock-provider.ts
git commit -m "feat: add AI provider interface and MockProvider"
```

---

### Task 2: CardCombination model

**Files:**
- Create: `lib/readings/combination-model.ts`

- [ ] **Step 1: Create the model**

Create `lib/readings/combination-model.ts`:

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface ICardCombination {
  _id: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  cardIds: mongoose.Types.ObjectId[];
  cardKey: string;
  answer: string;
  status: "generated" | "reviewed";
  source: "ai" | "manual";
  createdAt: Date;
  updatedAt: Date;
}

const CardCombinationSchema = new Schema<ICardCombination>(
  {
    deckId: { type: Schema.Types.ObjectId, required: true },
    cardIds: { type: [Schema.Types.ObjectId], required: true },
    cardKey: { type: String, required: true },
    answer: { type: String, required: true },
    status: {
      type: String,
      enum: ["generated", "reviewed"],
      default: "generated",
    },
    source: {
      type: String,
      enum: ["ai", "manual"],
      default: "ai",
    },
  },
  { timestamps: true }
);

CardCombinationSchema.index({ deckId: 1, cardKey: 1 }, { unique: true });

export const CardCombination: Model<ICardCombination> =
  models.CardCombination ?? model<ICardCombination>("CardCombination", CardCombinationSchema);
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/readings/combination-model.ts
git commit -m "feat: add CardCombination model"
```

---

### Task 3: UserInterpretation model

**Files:**
- Create: `lib/readings/interpretation-model.ts`

- [ ] **Step 1: Create the model**

Create `lib/readings/interpretation-model.ts`:

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IUserInterpretation {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  deckId: mongoose.Types.ObjectId;
  cardIds: mongoose.Types.ObjectId[];
  cardKey: string;
  context: string;
  answer: string;
  combinationId: mongoose.Types.ObjectId;
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
    answer: { type: String, required: true },
    combinationId: { type: Schema.Types.ObjectId, ref: "CardCombination", required: true },
  },
  { timestamps: true }
);

UserInterpretationSchema.index({ userId: 1, createdAt: -1 });

export const UserInterpretation: Model<IUserInterpretation> =
  models.UserInterpretation ?? model<IUserInterpretation>("UserInterpretation", UserInterpretationSchema);
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/readings/interpretation-model.ts
git commit -m "feat: add UserInterpretation model"
```

---

### Task 4: Profile schema update + seed

**Files:**
- Modify: `lib/profiles/model.ts`
- Modify: `lib/db/seed.ts`

- [ ] **Step 1: Add readingsMonthlyLimit to Profile**

In `lib/profiles/model.ts`, add to the `IProfile` interface:

```typescript
// Add after line 9 (permissions field):
readingsMonthlyLimit: number | null;
```

Add to the `ProfileSchema` definition, after the `permissions` field:

```typescript
readingsMonthlyLimit: { type: Number, default: null },
```

- [ ] **Step 2: Update seed**

In `lib/db/seed.ts`, update the admin profile seed (add `readingsMonthlyLimit`):

```typescript
// In the admin findOneAndUpdate, add to the update object:
readingsMonthlyLimit: null,
```

Update the free_tier profile seed:

```typescript
// In the free_tier findOneAndUpdate, add to the update object:
readingsMonthlyLimit: 5,
```

- [ ] **Step 3: Verify build and run seed**

```bash
yarn build
yarn seed
```

Expected: Both profiles updated with `readingsMonthlyLimit`.

- [ ] **Step 4: Commit**

```bash
git add lib/profiles/model.ts lib/db/seed.ts
git commit -m "feat: add readingsMonthlyLimit to Profile schema and seed"
```

---

### Task 5: Quota service

**Files:**
- Create: `lib/readings/quota.ts`

- [ ] **Step 1: Create quota service**

Create `lib/readings/quota.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { UserInterpretation } from "./interpretation-model";

/**
 * Count user interpretations created in the current month (day 1 to now).
 */
export async function countReadingsThisMonth(userId: string): Promise<number> {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return UserInterpretation.countDocuments({
    userId,
    createdAt: { $gte: startOfMonth },
  });
}

/**
 * Check if user can create a new reading.
 * Returns { allowed, used, limit } for quota display.
 */
export async function checkReadingQuota(
  userId: string,
  readingsMonthlyLimit: number | null
): Promise<{ allowed: boolean; used: number; limit: number | null }> {
  if (readingsMonthlyLimit === null) {
    return { allowed: true, used: 0, limit: null };
  }

  const used = await countReadingsThisMonth(userId);
  return {
    allowed: used < readingsMonthlyLimit,
    used,
    limit: readingsMonthlyLimit,
  };
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/readings/quota.ts
git commit -m "feat: add reading quota service"
```

---

### Task 6: Readings service (generation flow)

**Files:**
- Create: `lib/readings/service.ts`

- [ ] **Step 1: Create readings service**

Create `lib/readings/service.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { Deck } from "@/lib/decks/model";
import { CardCombination } from "./combination-model";
import type { ICardCombination } from "./combination-model";
import { UserInterpretation } from "./interpretation-model";
import { getAIProvider } from "@/lib/ai/provider";
import type { CardData } from "@/lib/ai/provider";
import type { IUserInterpretation } from "./interpretation-model";

function buildCardKey(cardIds: string[]): string {
  return cardIds.map((id) => id.toString()).join("_");
}

export async function createReading(data: {
  userId: string;
  deckId: string;
  cardIds: string[];
  context: string;
}): Promise<IUserInterpretation> {
  await connectDB();

  const { userId, deckId, cardIds, context } = data;

  // Validate card count
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

  // Build card data for AI provider
  const cards: CardData[] = cardIds.map((cardId) => {
    const card = deck.cards.find((c) => c._id.toString() === cardId)!;
    return {
      _id: card._id.toString(),
      title: card.title,
      description: card.description,
    };
  });

  const cardKey = buildCardKey(cardIds);
  const provider = getAIProvider();

  // Find or create card combination
  let combination = await CardCombination.findOne({ deckId, cardKey }).lean();

  if (!combination) {
    const answer = await provider.generateCombination(cards);
    // Upsert to handle concurrent requests for same combination
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

  // Generate contextual interpretation (always new)
  const interpretationAnswer = await provider.generateInterpretation(
    cards,
    combination.answer,
    context
  );

  // Save user interpretation
  const interpretation = await UserInterpretation.create({
    userId,
    deckId,
    cardIds,
    cardKey,
    context,
    answer: interpretationAnswer,
    combinationId: combination._id,
  });

  return interpretation.toObject();
}

export async function getInterpretationById(
  id: string
): Promise<IUserInterpretation | null> {
  await connectDB();
  return UserInterpretation.findById(id).lean();
}

export async function getCombinationById(
  id: string
): Promise<ICardCombination | null> {
  await connectDB();
  return CardCombination.findById(id).lean();
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/readings/service.ts
git commit -m "feat: add readings service with generation flow"
```

---

### Task 7: Server action

**Files:**
- Create: `app/(dashboard)/leituras/actions.ts`

- [ ] **Step 1: Create the server action**

Create `app/(dashboard)/leituras/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { checkReadingQuota } from "@/lib/readings/quota";
import { createReading } from "@/lib/readings/service";
import { getProfileBySlug } from "@/lib/profiles/service";

export async function createReadingAction(data: {
  deckId: string;
  cardIds: string[];
  context: string;
}): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_CREATE)) {
    return { error: "Sem permissão para criar leituras" };
  }

  // Check quota
  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;

  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;

  const quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);
  if (!quota.allowed) {
    return { error: "Você atingiu o limite de leituras deste mês" };
  }

  try {
    const interpretation = await createReading({
      userId: session.user.id,
      deckId: data.deckId,
      cardIds: data.cardIds,
      context: data.context,
    });

    return { id: interpretation._id.toString() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar leitura" };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/leituras/actions.ts"
git commit -m "feat: add createReadingAction server action"
```

---

### Task 8: Readings hub page (`/leituras`)

**Files:**
- Modify: `app/(dashboard)/leituras/page.tsx`

- [ ] **Step 1: Replace the stub page**

Replace the contents of `app/(dashboard)/leituras/page.tsx`:

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { getProfileBySlug } from "@/lib/profiles/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { Button } from "@/components/ui/button";

export default async function LeiturasPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_VIEW)) {
    redirect("/");
  }

  const canCreate = hasPermission(session, PERMISSIONS.READINGS_CREATE);

  let quota: { allowed: boolean; used: number; limit: number | null } | null = null;
  if (canCreate) {
    const profile = session.user.profileSlug
      ? await getProfileBySlug(session.user.profileSlug)
      : null;
    const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
    quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Leituras</h2>
        {canCreate && (
          <div className="flex items-center gap-3">
            {quota && quota.limit !== null && (
              <span className="text-sm text-muted-foreground">
                {quota.limit - quota.used} de {quota.limit} disponíveis este mês
              </span>
            )}
            {quota && !quota.allowed ? (
              <Button disabled>Limite atingido</Button>
            ) : (
              <Link
                href="/leituras/nova"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Nova Leitura
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-muted-foreground py-12">
        <p>Histórico de leituras — Em breve</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/leituras/page.tsx"
git commit -m "feat: replace leituras stub with readings hub page"
```

---

### Task 9: New reading wizard (`/leituras/nova`)

**Files:**
- Create: `app/(dashboard)/leituras/nova/page.tsx`
- Create: `components/readings/new-reading-wizard.tsx`

This is the largest task — a client component with 3 wizard steps.

- [ ] **Step 1: Create the page wrapper (Server Component)**

Create `app/(dashboard)/leituras/nova/page.tsx`:

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listDecks } from "@/lib/decks/service";
import { getProfileBySlug } from "@/lib/profiles/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { parseAspectRatio } from "@/lib/decks/constants";
import { NewReadingWizard } from "@/components/readings/new-reading-wizard";
import type { DeckForWizard } from "@/components/readings/new-reading-wizard";

export default async function NovaLeituraPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_CREATE)) {
    redirect("/");
  }

  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;
  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
  const quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);

  if (!quota.allowed) {
    redirect("/leituras");
  }

  const allDecks = await listDecks();

  // Serialize deck data for client component
  const decks: DeckForWizard[] = allDecks.map((deck) => ({
    _id: deck._id.toString(),
    name: deck.name,
    type: deck.type,
    coverImage: deck.coverImage ?? deck.cards[0]?.image ?? null,
    cardAspectRatio: parseAspectRatio(deck.cardAspectRatio).cssValue,
    cards: [...deck.cards]
      .sort((a, b) => a.order - b.order)
      .map((card) => ({
        _id: card._id.toString(),
        title: card.title,
        image: card.image,
      })),
  }));

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Nova Leitura</h2>
      <NewReadingWizard
        decks={decks}
        quotaUsed={quota.used}
        quotaLimit={quota.limit}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the wizard client component**

Create `components/readings/new-reading-wizard.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createReadingAction } from "@/app/(dashboard)/leituras/actions";

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

export function NewReadingWizard({
  decks,
  quotaUsed,
  quotaLimit,
}: NewReadingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedDeck, setSelectedDeck] = useState<DeckForWizard | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelectDeck = (deck: DeckForWizard) => {
    setSelectedDeck(deck);
    setSelectedCardIds([]);
    setStep(2);
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

  const handleSubmit = () => {
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

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Select Deck */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Escolha o baralho para sua leitura:</p>
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
                      <img src={deck.coverImage} alt={deck.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem imagem</span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold group-hover:underline">{deck.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {deck.cards.length} {deck.cards.length === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Cards */}
      {step === 2 && selectedDeck && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Selecione de 2 a 5 cartas de <strong>{selectedDeck.name}</strong>:
              </p>
              <p className="text-sm font-medium mt-1">
                {selectedCardIds.length} de 5 selecionadas
              </p>
            </div>
            <Button variant="ghost" onClick={() => { setStep(1); setSelectedCardIds([]); }}>
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
                        isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"
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
              onClick={() => setStep(3)}
              disabled={selectedCardIds.length < 2}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Context + Submit */}
      {step === 3 && selectedDeck && (
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => setStep(2)}>
            ← Voltar para seleção
          </Button>

          <div className="space-y-3 rounded-lg border border-border p-4">
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
              onClick={handleSubmit}
              disabled={isPending || !context.trim() || selectedCardIds.length < 2}
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

- [ ] **Step 3: Verify build**

```bash
yarn build
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/leituras/nova/page.tsx" components/readings/new-reading-wizard.tsx
git commit -m "feat: add new reading wizard with 3-step flow"
```

---

### Task 10: Reading result page (`/leituras/[id]`)

**Files:**
- Create: `app/(dashboard)/leituras/[id]/page.tsx`

- [ ] **Step 1: Create the result page**

Create `app/(dashboard)/leituras/[id]/page.tsx`:

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getInterpretationById, getCombinationById } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";
import { parseAspectRatio } from "@/lib/decks/constants";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReadingResultPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.READINGS_VIEW)) {
    redirect("/");
  }

  const { id } = await params;
  const interpretation = await getInterpretationById(id);
  if (!interpretation) notFound();

  // Verify ownership
  if (interpretation.userId.toString() !== session.user.id) {
    notFound();
  }

  const [combination, deck] = await Promise.all([
    getCombinationById(interpretation.combinationId.toString()),
    getDeckById(interpretation.deckId.toString()),
  ]);

  if (!deck) notFound();

  // Resolve card data from deck subdocuments
  const cards = interpretation.cardIds.map((cardId) => {
    const card = deck.cards.find((c) => c._id.toString() === cardId.toString());
    return card
      ? { _id: card._id.toString(), title: card.title, image: card.image }
      : { _id: cardId.toString(), title: "Carta removida", image: "" };
  });

  const aspectRatio = parseAspectRatio(deck.cardAspectRatio).cssValue;

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
        <h2 className="text-2xl font-semibold text-foreground">Sua Leitura</h2>
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
                  <img src={card.image} alt={card.title} className="object-contain w-full h-full" />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">?</div>
                )}
              </div>
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {i + 1}
              </span>
            </div>
            <span className="text-xs text-center font-medium leading-tight">{card.title}</span>
          </div>
        ))}
      </div>

      {/* User's question */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-1">Sua pergunta:</p>
        <p className="text-sm text-muted-foreground italic">"{interpretation.context}"</p>
      </div>

      {/* Generic combination */}
      {combination && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Relação entre as cartas</h3>
          <div className="rounded-lg border border-border p-4">
            <RichTextViewer content={combination.answer} className="text-sm" />
          </div>
        </div>
      )}

      {/* Contextual interpretation */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Interpretação para você</h3>
        <div className="rounded-lg border border-border p-4">
          <RichTextViewer content={interpretation.answer} className="text-sm" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/leituras/[id]/page.tsx"
git commit -m "feat: add reading result page"
```

---

### Task 11: Lint and final verification

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Fix any issues found.

- [ ] **Step 2: Run full build**

```bash
yarn build
```

- [ ] **Step 3: Manual smoke test**

Start dev server (`yarn dev`) and verify:
1. `/leituras` shows hub with "Nova Leitura" button and quota counter
2. `/leituras/nova` — Step 1: decks are listed, can select one
3. Step 2: cards are shown, can select 2-5 with numbered indicators
4. Step 3: context textarea required, quota reminder shown, submit works
5. Redirects to `/leituras/[id]` with cards, question, combination, and interpretation displayed
6. Revisiting the same card combination does not regenerate (uses cached combination)

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "fix: resolve lint issues from readings integration"
```
