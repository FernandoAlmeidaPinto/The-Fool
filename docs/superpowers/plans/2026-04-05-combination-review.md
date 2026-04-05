# Combination Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin page to review/edit AI-generated card combinations inline, marking them as reviewed.

**Architecture:** New service functions for listing/reviewing combinations, a server component page with a client component for the expandable list with inline RichTextEditor, and a link from the deck edit page.

**Tech Stack:** Next.js 16, Mongoose, Tiptap (RichTextEditor), Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-05-combination-review-design.md`

---

### Task 1: Add service functions

**Files:**
- Modify: `lib/readings/service.ts`

- [ ] **Step 1: Add three new functions**

Add to the end of `lib/readings/service.ts`:

```typescript
export async function listCombinationsByDeck(
  deckId: string
): Promise<ICardCombination[]> {
  await connectDB();
  return CardCombination.find({ deckId })
    .sort({ status: 1, createdAt: -1 })
    .lean();
}

export async function countPendingCombinations(
  deckId: string
): Promise<number> {
  await connectDB();
  return CardCombination.countDocuments({ deckId, status: "generated" });
}

export async function reviewCombination(
  id: string,
  answer?: string
): Promise<ICardCombination | null> {
  await connectDB();

  const update: Record<string, unknown> = { status: "reviewed" };
  if (answer !== undefined) {
    update.answer = answer;
    update.source = "manual";
  }

  return CardCombination.findByIdAndUpdate(id, update, { new: true }).lean();
}
```

Note: The sort `{ status: 1 }` puts "generated" before "reviewed" alphabetically, which is the desired order (pending first).

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/readings/service.ts
git commit -m "feat: add combination listing and review service functions"
```

---

### Task 2: Server actions

**Files:**
- Create: `app/(dashboard)/admin/decks/[id]/combinacoes/actions.ts`

- [ ] **Step 1: Create the actions file**

Create `app/(dashboard)/admin/decks/[id]/combinacoes/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { reviewCombination } from "@/lib/readings/service";
import { revalidatePath } from "next/cache";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function reviewCombinationAction(data: {
  combinationId: string;
  answer?: string;
  deckId: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireDecksPermission();

  try {
    const result = await reviewCombination(data.combinationId, data.answer);
    if (!result) {
      return { success: false, error: "Combinação não encontrada" };
    }

    revalidatePath(`/admin/decks/${data.deckId}/combinacoes`);
    revalidatePath(`/admin/decks/${data.deckId}/edit`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/admin/decks/[id]/combinacoes/actions.ts"
git commit -m "feat: add reviewCombinationAction server action"
```

---

### Task 3: Combination review list client component

**Files:**
- Create: `components/admin/combination-review-list.tsx`

- [ ] **Step 1: Create the client component**

Create `components/admin/combination-review-list.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { stripHtml } from "@/lib/html/strip";
import { reviewCombinationAction } from "@/app/(dashboard)/admin/decks/[id]/combinacoes/actions";

interface CombinationData {
  _id: string;
  cardIds: string[];
  cardKey: string;
  answer: string;
  status: "generated" | "reviewed";
  source: "ai" | "manual";
}

interface CardInfo {
  _id: string;
  title: string;
}

export interface CombinationReviewListProps {
  deckId: string;
  combinations: CombinationData[];
  cardMap: Record<string, CardInfo>;
}

export function CombinationReviewList({
  deckId,
  combinations,
  cardMap,
}: CombinationReviewListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<string>("");
  const [originalAnswer, setOriginalAnswer] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExpand = (combination: CombinationData) => {
    if (expandedId === combination._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(combination._id);
    setEditedAnswer(combination.answer);
    setOriginalAnswer(combination.answer);
    setError(null);
  };

  const handleSave = (combinationId: string) => {
    startTransition(async () => {
      setError(null);
      const wasEdited = editedAnswer !== originalAnswer;
      const result = await reviewCombinationAction({
        combinationId,
        answer: wasEdited ? editedAnswer : undefined,
        deckId,
      });

      if (!result.success) {
        setError(result.error ?? "Erro ao salvar");
      } else {
        setExpandedId(null);
      }
    });
  };

  const getCardTitles = (cardIds: string[]) =>
    cardIds
      .map((id) => cardMap[id]?.title ?? "Carta removida")
      .join(" → ");

  if (combinations.length === 0) {
    return (
      <p className="text-muted-foreground">Nenhuma combinação gerada ainda.</p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {combinations.map((combo) => {
        const isExpanded = expandedId === combo._id;
        const isPending_ = combo.status === "generated";

        return (
          <div
            key={combo._id}
            className="rounded-lg border border-border bg-card"
          >
            {/* Collapsed header */}
            <button
              type="button"
              onClick={() => handleExpand(combo)}
              className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span
                className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isPending_
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {isPending_ ? "Pendente" : "Revisada"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{getCardTitles(combo.cardIds)}</p>
                {!isExpanded && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {stripHtml(combo.answer).slice(0, 80)}
                    {stripHtml(combo.answer).length > 80 ? "..." : ""}
                  </p>
                )}
              </div>
            </button>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="border-t border-border p-3 space-y-3">
                <RichTextEditor
                  key={combo._id}
                  content={combo.answer}
                  onChange={setEditedAnswer}
                  placeholder="Resposta da combinação"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSave(combo._id)}
                    disabled={isPending}
                  >
                    {isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(null)}
                    disabled={isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
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
git add components/admin/combination-review-list.tsx
git commit -m "feat: add CombinationReviewList client component"
```

---

### Task 4: Combinações page

**Files:**
- Create: `app/(dashboard)/admin/decks/[id]/combinacoes/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(dashboard)/admin/decks/[id]/combinacoes/page.tsx`:

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { listCombinationsByDeck } from "@/lib/readings/service";
import { CombinationReviewList } from "@/components/admin/combination-review-list";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CombinationsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const combinations = await listCombinationsByDeck(id);

  // Build card ID → title map from deck subdocuments
  const cardMap: Record<string, { _id: string; title: string }> = {};
  for (const card of deck.cards) {
    cardMap[card._id.toString()] = {
      _id: card._id.toString(),
      title: card.title,
    };
  }

  // Serialize for client component
  const serializedCombinations = combinations.map((c) => ({
    _id: c._id.toString(),
    cardIds: c.cardIds.map((id) => id.toString()),
    cardKey: c.cardKey,
    answer: c.answer,
    status: c.status,
    source: c.source,
  }));

  const pendingCount = combinations.filter((c) => c.status === "generated").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/decks/${id}/edit`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para {deck.name}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Combinações — {deck.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {combinations.length} combinaç{combinations.length === 1 ? "ão" : "ões"}
            {pendingCount > 0 && ` · ${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <CombinationReviewList
        deckId={id}
        combinations={serializedCombinations}
        cardMap={cardMap}
      />
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
git add "app/(dashboard)/admin/decks/[id]/combinacoes/page.tsx"
git commit -m "feat: add admin combinations review page"
```

---

### Task 5: Add link in deck edit page

**Files:**
- Modify: `app/(dashboard)/admin/decks/[id]/edit/page.tsx`

- [ ] **Step 1: Add import and link**

In `app/(dashboard)/admin/decks/[id]/edit/page.tsx`:

Add import at the top:
```typescript
import { countPendingCombinations } from "@/lib/readings/service";
```

After line 28 (`if (!deck) notFound();`), add:
```typescript
const pendingCombinations = await countPendingCombinations(id);
```

After the cards section closing `</div>` (line 108), before the closing `</div>` of the page (line 109), add:

```tsx
      {/* Combinations link */}
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/decks/${id}/combinacoes`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Gerenciar Combinações
          {pendingCombinations > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-800">
              {pendingCombinations} pendente{pendingCombinations > 1 ? "s" : ""}
            </span>
          )}
        </Link>
      </div>
```

- [ ] **Step 2: Verify build and lint**

```bash
yarn build && yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/admin/decks/[id]/edit/page.tsx"
git commit -m "feat: add combinations link with pending count in deck edit page"
```
