# Diário Espiritual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a spiritual diary where users write personal reflections linked to daily cards, readings, or free-form entries.

**Architecture:** New `lib/diary/` domain with `DiaryEntry` Mongoose model and CRUD service. Four new pages under `app/(dashboard)/diario/`. Contextual CTAs added to existing Carta do Dia and Leituras detail pages. Server Action for form submission following the `leituras/actions.ts` pattern.

**Tech Stack:** Next.js 16 (App Router), Mongoose, Server Components, Server Actions, shadcn/ui, Tailwind CSS 4, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-11-diario-espiritual-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `lib/diary/model.ts` | `DiaryEntry` Mongoose model + interface + indexes |
| `lib/diary/service.ts` | CRUD: `createEntry`, `listEntries`, `getEntryById`, `archiveEntry`, `unarchiveEntry`, `findEntryFor` |
| `app/(dashboard)/diario/page.tsx` | Diary list (active entries, paginated) |
| `app/(dashboard)/diario/nova/page.tsx` | New entry page (type selection + form) |
| `app/(dashboard)/diario/[id]/page.tsx` | Entry detail page |
| `app/(dashboard)/diario/arquivadas/page.tsx` | Archived entries list |
| `app/(dashboard)/diario/actions.ts` | Server Actions: `createDiaryEntryAction`, `archiveDiaryEntryAction`, `unarchiveDiaryEntryAction` |
| `components/diary/entry-form.tsx` | Client component: type selector + reference picker + title/body form |

### Modified files

| File | Change |
|------|--------|
| `lib/permissions/constants.ts` | Add `DIARY_READ`, `DIARY_WRITE` |
| `lib/db/seed.ts` | No change needed — admin gets `ALL_PERMISSIONS` automatically |
| `components/dashboard/sidebar.tsx` | Add "Diário" nav item after "Carta do Dia" |
| `app/(dashboard)/carta-do-dia/page.tsx` | Add contextual CTA ("Escrever no diário" / "Ver minha reflexão") |
| `app/(dashboard)/leituras/[id]/page.tsx` | Add contextual CTA ("Escrever no diário" / "Ver minha reflexão") |

---

## Task 1: Permissions

**Files:**
- Modify: `lib/permissions/constants.ts`

- [ ] **Step 1: Add diary permission constants**

Open `lib/permissions/constants.ts` and add the two new permissions after the `DAILY_CARD_READ` entry:

```typescript
  // Diary
  DIARY_READ: "diary:read",
  DIARY_WRITE: "diary:write",
```

These go inside the `PERMISSIONS` object, before the closing `} as const`. No seed change needed — admin gets `ALL_PERMISSIONS` via `Object.values(PERMISSIONS)`.

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds. The new constants are picked up by `ALL_PERMISSIONS` automatically.

- [ ] **Step 3: Commit**

```bash
git add lib/permissions/constants.ts
git commit -m "feat(diary): add diary:read and diary:write permissions"
```

---

## Task 2: DiaryEntry Model

**Files:**
- Create: `lib/diary/model.ts`

- [ ] **Step 1: Create the model file**

Create `lib/diary/model.ts` following the exact pattern from `lib/daily-card/model.ts`:

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export type DiaryEntryType = "daily-card" | "reading" | "free";

export interface IDiaryEntry {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: DiaryEntryType;
  title: string | null;
  body: string;
  dailyCardId: mongoose.Types.ObjectId | null;
  interpretationId: mongoose.Types.ObjectId | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DiaryEntrySchema = new Schema<IDiaryEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["daily-card", "reading", "free"],
      required: true,
    },
    title: { type: String, default: null, maxlength: 200 },
    body: { type: String, required: true, maxlength: 10000 },
    dailyCardId: {
      type: Schema.Types.ObjectId,
      ref: "DailyCard",
      default: null,
    },
    interpretationId: {
      type: Schema.Types.ObjectId,
      ref: "UserInterpretation",
      default: null,
    },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Paginated timeline filtered by archive status (covers both active and archived queries)
DiaryEntrySchema.index({ userId: 1, archivedAt: 1, createdAt: -1 });
// Fast lookup: "did I already reflect on this daily card?"
DiaryEntrySchema.index({ userId: 1, dailyCardId: 1 });
// Fast lookup: "did I already reflect on this reading?"
DiaryEntrySchema.index({ userId: 1, interpretationId: 1 });

export const DiaryEntry: Model<IDiaryEntry> =
  models.DiaryEntry ?? model<IDiaryEntry>("DiaryEntry", DiaryEntrySchema);
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds. Model compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add lib/diary/model.ts
git commit -m "feat(diary): add DiaryEntry Mongoose model"
```

---

## Task 3: Diary Service

**Files:**
- Create: `lib/diary/service.ts`

- [ ] **Step 1: Create the service file**

Create `lib/diary/service.ts` following the patterns from `lib/daily-card/service.ts`:

```typescript
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { DiaryEntry, type IDiaryEntry, type DiaryEntryType } from "./model";
import { DailyCard } from "@/lib/daily-card/model";
import { UserInterpretation } from "@/lib/readings/interpretation-model";

export async function createEntry(data: {
  userId: string;
  type: DiaryEntryType;
  title?: string | null;
  body: string;
  dailyCardId?: string | null;
  interpretationId?: string | null;
}): Promise<IDiaryEntry> {
  await connectDB();

  const { userId, type, title, body, dailyCardId, interpretationId } = data;

  // Validate body
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new Error("O texto da reflexão não pode ser vazio");
  }
  if (trimmedBody.length > 10000) {
    throw new Error("O texto da reflexão excede o limite de 10.000 caracteres");
  }

  const trimmedTitle = title?.trim() || null;
  if (trimmedTitle && trimmedTitle.length > 200) {
    throw new Error("O título excede o limite de 200 caracteres");
  }

  // Validate type ↔ reference coherence
  if (type === "daily-card") {
    if (!dailyCardId) throw new Error("dailyCardId é obrigatório para tipo carta-do-dia");
    if (interpretationId) throw new Error("interpretationId não é permitido para tipo carta-do-dia");

    const dc = await DailyCard.findOne({
      _id: dailyCardId,
      userId,
    }).lean();
    if (!dc) throw new Error("Carta do dia não encontrada");
  } else if (type === "reading") {
    if (!interpretationId) throw new Error("interpretationId é obrigatório para tipo leitura");
    if (dailyCardId) throw new Error("dailyCardId não é permitido para tipo leitura");

    const interp = await UserInterpretation.findOne({
      _id: interpretationId,
      userId,
    }).lean();
    if (!interp) throw new Error("Leitura não encontrada");
  } else {
    // type === "free"
    if (dailyCardId) throw new Error("dailyCardId não é permitido para tipo livre");
    if (interpretationId) throw new Error("interpretationId não é permitido para tipo livre");
  }

  const entry = await DiaryEntry.create({
    userId: new mongoose.Types.ObjectId(userId),
    type,
    title: trimmedTitle,
    body: trimmedBody,
    dailyCardId: dailyCardId ? new mongoose.Types.ObjectId(dailyCardId) : null,
    interpretationId: interpretationId
      ? new mongoose.Types.ObjectId(interpretationId)
      : null,
    archivedAt: null,
  });

  return entry.toObject();
}

export async function listEntries(
  userId: string,
  {
    page = 1,
    pageSize = 20,
    archived = false,
  }: { page?: number; pageSize?: number; archived?: boolean } = {}
): Promise<{
  entries: IDiaryEntry[];
  total: number;
  page: number;
  pageSize: number;
}> {
  await connectDB();
  const skip = (page - 1) * pageSize;

  const filter = {
    userId,
    archivedAt: archived ? { $ne: null } : null,
  };

  const [entries, total] = await Promise.all([
    DiaryEntry.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    DiaryEntry.countDocuments(filter),
  ]);

  return { entries, total, page, pageSize };
}

export async function getEntryById(
  userId: string,
  entryId: string
): Promise<IDiaryEntry | null> {
  await connectDB();
  return DiaryEntry.findOne({
    _id: entryId,
    userId,
  }).lean();
}

export async function archiveEntry(
  userId: string,
  entryId: string
): Promise<IDiaryEntry | null> {
  await connectDB();
  return DiaryEntry.findOneAndUpdate(
    { _id: entryId, userId, archivedAt: null },
    { $set: { archivedAt: new Date() } },
    { new: true }
  ).lean();
}

export async function unarchiveEntry(
  userId: string,
  entryId: string
): Promise<IDiaryEntry | null> {
  await connectDB();
  return DiaryEntry.findOneAndUpdate(
    { _id: entryId, userId, archivedAt: { $ne: null } },
    { $set: { archivedAt: null } },
    { new: true }
  ).lean();
}

export async function findEntryFor(
  userId: string,
  ref: { dailyCardId?: string; interpretationId?: string }
): Promise<IDiaryEntry | null> {
  await connectDB();

  if (ref.dailyCardId) {
    return DiaryEntry.findOne({ userId, dailyCardId: ref.dailyCardId }).lean();
  }
  if (ref.interpretationId) {
    return DiaryEntry.findOne({
      userId,
      interpretationId: ref.interpretationId,
    }).lean();
  }

  return null;
}
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds. Service compiles without errors.

- [ ] **Step 3: Commit**

```bash
git add lib/diary/service.ts
git commit -m "feat(diary): add diary CRUD service"
```

---

## Task 4: Server Actions

**Files:**
- Create: `app/(dashboard)/diario/actions.ts`

- [ ] **Step 1: Create the actions file**

Create `app/(dashboard)/diario/actions.ts` following the pattern from `app/(dashboard)/leituras/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  createEntry,
  archiveEntry,
  unarchiveEntry,
} from "@/lib/diary/service";
import type { DiaryEntryType } from "@/lib/diary/model";

export async function createDiaryEntryAction(data: {
  type: DiaryEntryType;
  title?: string;
  body: string;
  dailyCardId?: string;
  interpretationId?: string;
}): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.DIARY_WRITE)
  ) {
    return { error: "Sem permissão para escrever no diário" };
  }

  try {
    const entry = await createEntry({
      userId: session.user.id,
      type: data.type,
      title: data.title || null,
      body: data.body,
      dailyCardId: data.dailyCardId || null,
      interpretationId: data.interpretationId || null,
    });

    return { id: entry._id.toString() };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao salvar entrada",
    };
  }
}

export async function archiveDiaryEntryAction(
  entryId: string
): Promise<{ success: boolean } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.DIARY_WRITE)
  ) {
    return { error: "Sem permissão" };
  }

  const result = await archiveEntry(session.user.id, entryId);
  if (!result) return { error: "Entrada não encontrada" };
  return { success: true };
}

export async function unarchiveDiaryEntryAction(
  entryId: string
): Promise<{ success: boolean } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(session, PERMISSIONS.DIARY_WRITE)
  ) {
    return { error: "Sem permissão" };
  }

  const result = await unarchiveEntry(session.user.id, entryId);
  if (!result) return { error: "Entrada não encontrada" };
  return { success: true };
}
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/diario/actions.ts
git commit -m "feat(diary): add Server Actions for create, archive, unarchive"
```

---

## Task 5: Entry Form Client Component

**Files:**
- Create: `components/diary/entry-form.tsx`

- [ ] **Step 1: Create the entry form component**

This is the main client component for creating diary entries. It handles:
- Type selection (3 cards: Carta do Dia, Leitura, Livre)
- Reference selection (recent daily cards or readings without existing entry)
- Title + body form with fixed placeholder per type
- Submit via Server Action

Create `components/diary/entry-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sun, Sparkles, Feather } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDiaryEntryAction } from "@/app/(dashboard)/diario/actions";

type EntryType = "daily-card" | "reading" | "free";

interface DailyCardOption {
  _id: string;
  date: string;
  cardName: string;
  cardImage: string;
}

interface ReadingOption {
  _id: string;
  context: string;
  createdAt: string;
  deckName: string;
}

interface EntryFormProps {
  preselectedType?: EntryType;
  preselectedDailyCardId?: string;
  preselectedInterpretationId?: string;
  recentDailyCards: DailyCardOption[];
  recentReadings: ReadingOption[];
}

const PLACEHOLDERS: Record<EntryType, string> = {
  "daily-card": "O que essa carta te diz sobre o momento que você está vivendo?",
  reading: "O que mudou desde essa leitura?",
  free: "O que está no seu coração agora?",
};

const TYPE_LABELS: Record<EntryType, { label: string; icon: typeof Sun }> = {
  "daily-card": { label: "Carta do Dia", icon: Sun },
  reading: { label: "Leitura", icon: Sparkles },
  free: { label: "Livre", icon: Feather },
};

export function DiaryEntryForm({
  preselectedType,
  preselectedDailyCardId,
  preselectedInterpretationId,
  recentDailyCards,
  recentReadings,
}: EntryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<EntryType | null>(preselectedType ?? null);
  const [dailyCardId, setDailyCardId] = useState<string | null>(
    preselectedDailyCardId ?? null
  );
  const [interpretationId, setInterpretationId] = useState<string | null>(
    preselectedInterpretationId ?? null
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsRefSelection =
    (type === "daily-card" && !dailyCardId) ||
    (type === "reading" && !interpretationId);

  const canSubmit =
    type !== null &&
    body.trim().length > 0 &&
    !needsRefSelection &&
    !isPending;

  function handleSubmit() {
    if (!canSubmit || !type) return;
    setError(null);

    startTransition(async () => {
      const result = await createDiaryEntryAction({
        type,
        title: title.trim() || undefined,
        body: body.trim(),
        dailyCardId: dailyCardId ?? undefined,
        interpretationId: interpretationId ?? undefined,
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push("/diario");
      }
    });
  }

  // Step 1: Type selection
  if (!type) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Sobre o que você quer escrever?
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.entries(TYPE_LABELS) as [EntryType, typeof TYPE_LABELS[EntryType]][]).map(
            ([key, { label, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-6 text-center transition-colors hover:bg-accent"
              >
                <Icon className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            )
          )}
        </div>
      </div>
    );
  }

  // Step 2: Reference selection (daily card or reading)
  if (type === "daily-card" && !dailyCardId) {
    if (recentDailyCards.length === 0) {
      return (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Você ainda não tem cartas do dia para refletir.
          </p>
          <Button variant="outline" onClick={() => setType(null)}>
            Voltar
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Escolha uma carta do dia para sua reflexão:
        </p>
        <div className="space-y-2">
          {recentDailyCards.map((dc) => (
            <button
              key={dc._id}
              onClick={() => setDailyCardId(dc._id)}
              className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
            >
              <div className="h-12 w-8 overflow-hidden rounded bg-muted">
                {dc.cardImage && (
                  <img
                    src={dc.cardImage}
                    alt={dc.cardName}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{dc.cardName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(`${dc.date}T12:00:00`).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => setType(null)}>
          Voltar
        </Button>
      </div>
    );
  }

  if (type === "reading" && !interpretationId) {
    if (recentReadings.length === 0) {
      return (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Você ainda não tem leituras para refletir.
          </p>
          <Button variant="outline" onClick={() => setType(null)}>
            Voltar
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Escolha uma leitura para sua reflexão:
        </p>
        <div className="space-y-2">
          {recentReadings.map((r) => (
            <button
              key={r._id}
              onClick={() => setInterpretationId(r._id)}
              className="flex w-full flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
            >
              <p className="text-sm font-medium">{r.deckName}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                &quot;{r.context}&quot;
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => setType(null)}>
          Voltar
        </Button>
      </div>
    );
  }

  // Step 3: Form
  const { label, icon: TypeIcon } = TYPE_LABELS[type];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TypeIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
        {type !== "free" && (
          <button
            onClick={() => {
              setType(null);
              setDailyCardId(null);
              setInterpretationId(null);
            }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Trocar
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="diary-title"
            className="mb-1 block text-sm font-medium"
          >
            Título{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </label>
          <Input
            id="diary-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Dê um nome a essa reflexão..."
            disabled={isPending}
          />
        </div>

        <div>
          <label
            htmlFor="diary-body"
            className="mb-1 block text-sm font-medium"
          >
            Reflexão
          </label>
          <Textarea
            id="diary-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            placeholder={PLACEHOLDERS[type]}
            rows={8}
            disabled={isPending}
          />
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {body.length}/10.000
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (type === "free") {
              setType(null);
            } else {
              setDailyCardId(null);
              setInterpretationId(null);
            }
          }}
          disabled={isPending}
        >
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add components/diary/entry-form.tsx
git commit -m "feat(diary): add DiaryEntryForm client component"
```

---

## Task 6: Diary List Page (active entries)

**Files:**
- Create: `app/(dashboard)/diario/page.tsx`

- [ ] **Step 1: Create the diary list page**

Follow the pagination pattern from `app/(dashboard)/carta-do-dia/historico/page.tsx`:

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { listEntries } from "@/lib/diary/service";
import { Button } from "@/components/ui/button";
import { Plus, Archive } from "lucide-react";

const PAGE_SIZE = 20;

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  "daily-card": {
    label: "Carta do Dia",
    className: "bg-amber-100 text-amber-800",
  },
  reading: {
    label: "Leitura",
    className: "bg-violet-100 text-violet-800",
  },
  free: {
    label: "Livre",
    className: "bg-emerald-100 text-emerald-800",
  },
};

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_READ)) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const userId = session.user.id as string;
  const { entries, total, pageSize } = await listEntries(userId, {
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Diário Espiritual
        </h1>
        <div className="flex gap-2">
          <Link href="/diario/arquivadas">
            <Button variant="ghost" size="sm">
              <Archive className="mr-1 h-4 w-4" />
              Arquivadas
            </Button>
          </Link>
          {hasPermission(session, PERMISSIONS.DIARY_WRITE) && (
            <Link href="/diario/nova">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Nova entrada
              </Button>
            </Link>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Seu diário está vazio. Que tal escrever sua primeira reflexão?
          </p>
          {hasPermission(session, PERMISSIONS.DIARY_WRITE) && (
            <Link href="/diario/nova" className="mt-4 inline-block">
              <Button>Escrever primeira entrada</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const badge = TYPE_BADGES[entry.type];
            return (
              <Link
                key={entry._id.toString()}
                href={`/diario/${entry._id.toString()}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {entry.title && (
                  <p className="font-medium text-foreground">{entry.title}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {entry.body}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/diario?page=${page - 1}`}>
              <Button variant="outline" size="sm">
                Anterior
              </Button>
            </Link>
          )}
          <span className="self-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/diario?page=${page + 1}`}>
              <Button variant="outline" size="sm">
                Próxima
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/diario/page.tsx
git commit -m "feat(diary): add diary list page with pagination"
```

---

## Task 7: New Entry Page

**Files:**
- Create: `app/(dashboard)/diario/nova/page.tsx`

- [ ] **Step 1: Create the new entry page**

This Server Component resolves query params, fetches available daily cards and readings without existing diary entries, serializes data for the client component, and renders the form.

```typescript
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getHistory } from "@/lib/daily-card/service";
import { resolveLiveCard } from "@/lib/daily-card/service";
import { findEntryFor } from "@/lib/diary/service";
import { getByDate } from "@/lib/daily-card/service";
import { DiaryEntryForm } from "@/components/diary/entry-form";
import { ChevronLeft } from "lucide-react";

// Lazy import to avoid pulling the full service when not needed
import { listUserInterpretations } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";

import type { DiaryEntryType } from "@/lib/diary/model";

export default async function NovaDiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; ref?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_WRITE)) redirect("/");

  const userId = session.user.id as string;
  const { tipo, ref } = await searchParams;

  // Resolve preselected type and reference
  let preselectedType: DiaryEntryType | undefined;
  let preselectedDailyCardId: string | undefined;
  let preselectedInterpretationId: string | undefined;

  if (tipo === "carta-do-dia" && ref) {
    const dc = await getByDate(userId, ref);
    if (dc) {
      preselectedType = "daily-card";
      preselectedDailyCardId = dc._id.toString();
    }
  } else if (tipo === "leitura" && ref) {
    preselectedType = "reading";
    preselectedInterpretationId = ref;
  } else if (tipo === "livre") {
    preselectedType = "free";
  }

  // Fetch recent daily cards without diary entries (last 30)
  const { items: recentDCs } = await getHistory(userId, {
    page: 1,
    pageSize: 30,
  });

  const dailyCardOptions = (
    await Promise.all(
      recentDCs.map(async (dc) => {
        const existing = await findEntryFor(userId, {
          dailyCardId: dc._id.toString(),
        });
        if (existing) return null; // already has a diary entry

        const live = await resolveLiveCard(dc);
        const name = live?.card.title ?? dc.cardSnapshot.name;
        const image = live?.card.image ?? dc.cardSnapshot.imageUrl;

        return {
          _id: dc._id.toString(),
          date: dc.date,
          cardName: name,
          cardImage: image,
        };
      })
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  // Fetch recent readings without diary entries (last 30)
  const { items: recentReadings } = await listUserInterpretations(userId, 1, 30);

  const readingOptions = (
    await Promise.all(
      recentReadings
        .filter((r) => r.mode === "normal") // only normal readings, not practice
        .map(async (r) => {
          const existing = await findEntryFor(userId, {
            interpretationId: r._id.toString(),
          });
          if (existing) return null;

          const deck = await getDeckById(r.deckId.toString());
          return {
            _id: r._id.toString(),
            context: r.context,
            createdAt: r.createdAt.toISOString(),
            deckName: deck?.name ?? "Baralho removido",
          };
        })
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/diario"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar ao diário
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">Nova entrada</h1>

      <DiaryEntryForm
        preselectedType={preselectedType}
        preselectedDailyCardId={preselectedDailyCardId}
        preselectedInterpretationId={preselectedInterpretationId}
        recentDailyCards={dailyCardOptions}
        recentReadings={readingOptions}
      />
    </div>
  );
}
```

**Important:** Check that `listUserInterpretations` is the correct export name from `lib/readings/service.ts`. The existing codebase uses this function — verify the exact name and signature match. It should accept `(userId, page, perPage)` and return `{ items, total }` or similar.

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds. If `listUserInterpretations` has a different name or signature, adjust to match the actual export.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/diario/nova/page.tsx
git commit -m "feat(diary): add new entry page with type selection and reference picker"
```

---

## Task 8: Entry Detail Page

**Files:**
- Create: `app/(dashboard)/diario/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

Follow the pattern from `app/(dashboard)/leituras/[id]/page.tsx`:

```typescript
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getEntryById } from "@/lib/diary/service";
import { DailyCard } from "@/lib/daily-card/model";
import { resolveLiveCard } from "@/lib/daily-card/service";
import { getInterpretationById } from "@/lib/readings/service";
import { getDeckById } from "@/lib/decks/service";
import { connectDB } from "@/lib/db/mongoose";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Sun, Sparkles, Feather } from "lucide-react";
import { ArchiveButton } from "./archive-button";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Sun; badgeClass: string }
> = {
  "daily-card": {
    label: "Carta do Dia",
    icon: Sun,
    badgeClass: "bg-amber-100 text-amber-800",
  },
  reading: {
    label: "Leitura",
    icon: Sparkles,
    badgeClass: "bg-violet-100 text-violet-800",
  },
  free: {
    label: "Livre",
    icon: Feather,
    badgeClass: "bg-emerald-100 text-emerald-800",
  },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DiaryEntryDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_READ)) redirect("/");

  const { id } = await params;
  const userId = session.user.id as string;
  const entry = await getEntryById(userId, id);
  if (!entry) notFound();

  const config = TYPE_CONFIG[entry.type];

  // Resolve linked context
  let dailyCardContext: {
    name: string;
    imageUrl: string;
    date: string;
  } | null = null;

  let readingContext: {
    id: string;
    context: string;
    deckName: string;
  } | null = null;

  if (entry.type === "daily-card" && entry.dailyCardId) {
    await connectDB();
    const dc = await DailyCard.findById(entry.dailyCardId).lean();
    if (dc) {
      const live = await resolveLiveCard(dc);
      dailyCardContext = {
        name: live?.card.title ?? dc.cardSnapshot.name,
        imageUrl: live?.card.image ?? dc.cardSnapshot.imageUrl,
        date: dc.date,
      };
    }
  }

  if (entry.type === "reading" && entry.interpretationId) {
    const interp = await getInterpretationById(
      entry.interpretationId.toString()
    );
    if (interp) {
      const deck = await getDeckById(interp.deckId.toString());
      readingContext = {
        id: interp._id.toString(),
        context: interp.context,
        deckName: deck?.name ?? "Baralho removido",
      };
    }
  }

  const isArchived = entry.archivedAt !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={isArchived ? "/diario/arquivadas" : "/diario"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {isArchived ? "Voltar às arquivadas" : "Voltar ao diário"}
      </Link>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
        >
          {config.label}
        </span>
        <span className="text-sm text-muted-foreground">
          {new Date(entry.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
        {isArchived && (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Arquivada
          </span>
        )}
      </div>

      {/* Linked daily card */}
      {dailyCardContext && (
        <Link
          href={`/carta-do-dia/historico/${dailyCardContext.date}`}
          className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
        >
          <div className="h-16 w-11 overflow-hidden rounded bg-muted">
            <img
              src={dailyCardContext.imageUrl}
              alt={dailyCardContext.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-medium">{dailyCardContext.name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(`${dailyCardContext.date}T12:00:00`).toLocaleDateString(
                "pt-BR",
                { day: "2-digit", month: "short", year: "numeric" }
              )}
            </p>
          </div>
        </Link>
      )}

      {/* Linked reading */}
      {readingContext && (
        <Link
          href={`/leituras/${readingContext.id}`}
          className="flex flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
        >
          <p className="text-sm font-medium">{readingContext.deckName}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            &quot;{readingContext.context}&quot;
          </p>
        </Link>
      )}

      {entry.title && (
        <h1 className="text-2xl font-semibold text-foreground">
          {entry.title}
        </h1>
      )}

      <div className="whitespace-pre-wrap text-foreground leading-relaxed">
        {entry.body}
      </div>

      {hasPermission(session, PERMISSIONS.DIARY_WRITE) && (
        <ArchiveButton
          entryId={entry._id.toString()}
          isArchived={isArchived}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the ArchiveButton client component**

Create `app/(dashboard)/diario/[id]/archive-button.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";
import {
  archiveDiaryEntryAction,
  unarchiveDiaryEntryAction,
} from "@/app/(dashboard)/diario/actions";

interface ArchiveButtonProps {
  entryId: string;
  isArchived: boolean;
}

export function ArchiveButton({ entryId, isArchived }: ArchiveButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const action = isArchived
        ? unarchiveDiaryEntryAction
        : archiveDiaryEntryAction;
      const result = await action(entryId);

      if ("error" in result) {
        // Could show a toast, for now just log
        console.error(result.error);
        return;
      }

      router.push(isArchived ? "/diario/arquivadas" : "/diario");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isArchived ? (
        <>
          <ArchiveRestore className="mr-1 h-4 w-4" />
          {isPending ? "Desarquivando..." : "Desarquivar"}
        </>
      ) : (
        <>
          <Archive className="mr-1 h-4 w-4" />
          {isPending ? "Arquivando..." : "Arquivar"}
        </>
      )}
    </Button>
  );
}
```

- [ ] **Step 3: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/diario/\[id\]/page.tsx app/\(dashboard\)/diario/\[id\]/archive-button.tsx
git commit -m "feat(diary): add entry detail page with archive/unarchive"
```

---

## Task 9: Archived Entries Page

**Files:**
- Create: `app/(dashboard)/diario/arquivadas/page.tsx`

- [ ] **Step 1: Create the archived list page**

This is structurally identical to the diary list page but queries archived entries and shows "Desarquivar" actions. Follow the same pattern from Task 6.

```typescript
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { listEntries } from "@/lib/diary/service";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const PAGE_SIZE = 20;

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  "daily-card": {
    label: "Carta do Dia",
    className: "bg-amber-100 text-amber-800",
  },
  reading: {
    label: "Leitura",
    className: "bg-violet-100 text-violet-800",
  },
  free: {
    label: "Livre",
    className: "bg-emerald-100 text-emerald-800",
  },
};

export default async function DiarioArquivadasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DIARY_READ)) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const userId = session.user.id as string;
  const { entries, total, pageSize } = await listEntries(userId, {
    page,
    pageSize: PAGE_SIZE,
    archived: true,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/diario"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar ao diário
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">
        Entradas arquivadas
      </h1>

      {entries.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma entrada arquivada.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const badge = TYPE_BADGES[entry.type];
            return (
              <Link
                key={entry._id.toString()}
                href={`/diario/${entry._id.toString()}`}
                className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {entry.title && (
                  <p className="font-medium text-foreground">{entry.title}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {entry.body}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/diario/arquivadas?page=${page - 1}`}>
              <Button variant="outline" size="sm">
                Anterior
              </Button>
            </Link>
          )}
          <span className="self-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/diario/arquivadas?page=${page + 1}`}>
              <Button variant="outline" size="sm">
                Próxima
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/diario/arquivadas/page.tsx
git commit -m "feat(diary): add archived entries page"
```

---

## Task 10: Sidebar Navigation

**Files:**
- Modify: `components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add "Diário" nav item**

In `components/dashboard/sidebar.tsx`:

1. Add `NotebookPen` to the lucide-react import (`BookOpen` is already used for "Cursos").
2. Add a permission-gated `SidebarItem` after "Carta do Dia" in the main `<nav>`. The diary item should only be visible to users with `diary:read`:

```typescript
{permissions.includes("diary:read") && (
  <SidebarItem href="/diario" label="Diário" icon={NotebookPen} onNavigate={onNavigate} />
)}
```

Place it immediately after the `Carta do Dia` `SidebarItem`.

**Important:** The `permissions` variable is already defined in the component as `session.user?.permissions ?? []`. Read the file first to confirm the exact variable name.

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds. Sidebar renders with the new item.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat(diary): add Diário to sidebar navigation"
```

---

## Task 11: Contextual CTA on Carta do Dia

**Files:**
- Modify: `app/(dashboard)/carta-do-dia/page.tsx`

- [ ] **Step 1: Add diary CTA to the Carta do Dia page**

In `app/(dashboard)/carta-do-dia/page.tsx`:

1. Add imports:
```typescript
import { findEntryFor } from "@/lib/diary/service";
```

2. After the existing data fetching (after `splitReflection`), add:
```typescript
  // Diary CTA — only if user has diary:write permission
  let diaryCta: { href: string; label: string } | null = null;
  if (hasPermission(session, PERMISSIONS.DIARY_WRITE)) {
    const existingEntry = await findEntryFor(userId, {
      dailyCardId: dailyCard._id.toString(),
    });
    if (existingEntry) {
      diaryCta = {
        href: `/diario/${existingEntry._id.toString()}`,
        label: "Ver minha reflexão",
      };
    } else {
      diaryCta = {
        href: `/diario/nova?tipo=carta-do-dia&ref=${dailyCard.date}`,
        label: "Escrever no diário",
      };
    }
  }
```

3. Pass `diaryCta` to the `EditorialLayout` component or render it separately below. Since `EditorialLayout` is a presentation component that may not accept this prop, add a discreet link **after** the `<EditorialLayout />` return:

Wrap the return in a fragment and add:
```tsx
  return (
    <>
      <EditorialLayout
        name={name}
        imageUrl={imageUrl}
        aspectRatio={aspectRatio}
        dateWeekday={dateWeekday}
        dateDayMonth={dateDayMonth}
        dateYear={dateYear}
        pullQuote={pullQuote}
        firstLetter={firstLetter}
        bodyWithoutFirstLetter={bodyWithoutFirstLetter}
      />
      {diaryCta && (
        <div className="mx-auto mt-6 max-w-2xl text-center">
          <Link
            href={diaryCta.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            {diaryCta.label}
          </Link>
        </div>
      )}
    </>
  );
```

**Note:** Read the current file before editing to check the exact return structure and ensure the fragment wrapping doesn't break anything.

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/carta-do-dia/page.tsx
git commit -m "feat(diary): add contextual diary CTA to Carta do Dia page"
```

---

## Task 12: Contextual CTA on Leituras Detail

**Files:**
- Modify: `app/(dashboard)/leituras/[id]/page.tsx`

- [ ] **Step 1: Add diary CTA to the reading detail page**

In `app/(dashboard)/leituras/[id]/page.tsx`:

1. Add imports:
```typescript
import { findEntryFor } from "@/lib/diary/service";
```

2. After the ownership check and data fetching, add. **Note:** the existing page does NOT define a `userId` variable — it uses `session.user.id` directly. Use `session.user.id` in the snippet below:
```typescript
  // Diary CTA — only for normal readings, and only if user has diary:write
  let diaryCta: { href: string; label: string } | null = null;
  if (
    interpretation.mode === "normal" &&
    hasPermission(session, PERMISSIONS.DIARY_WRITE)
  ) {
    const existingEntry = await findEntryFor(session.user.id, {
      interpretationId: interpretation._id.toString(),
    });
    if (existingEntry) {
      diaryCta = {
        href: `/diario/${existingEntry._id.toString()}`,
        label: "Ver minha reflexão",
      };
    } else {
      diaryCta = {
        href: `/diario/nova?tipo=leitura&ref=${interpretation._id.toString()}`,
        label: "Escrever no diário",
      };
    }
  }
```

3. Add the CTA link at the end of the page content (before the closing `</div>`):
```tsx
      {diaryCta && (
        <div className="text-center pt-4 border-t border-border">
          <Link
            href={diaryCta.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            {diaryCta.label}
          </Link>
        </div>
      )}
```

- [ ] **Step 2: Verify**

Run: `yarn build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/leituras/\[id\]/page.tsx
git commit -m "feat(diary): add contextual diary CTA to reading detail page"
```

---

## Task 13: Seed & Final Verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run the seed**

Run: `yarn seed`
Expected: Seed completes. The admin profile now includes `diary:read` and `diary:write` automatically (via `ALL_PERMISSIONS`). The free_tier profile does not include them.

- [ ] **Step 2: Run full build**

Run: `yarn build`
Expected: Clean build with no errors.

- [ ] **Step 3: Run lint**

Run: `yarn lint`
Expected: No new lint errors.

- [ ] **Step 4: Manual smoke test**

Start the dev server with `yarn dev` and verify:

1. Log in as admin → "Diário" appears in sidebar
2. Visit `/diario` → empty state with "Escrever primeira entrada" CTA
3. Click "Nova entrada" → type selector with 3 options
4. Create a free entry (title + body) → redirects to `/diario`, entry visible
5. Visit entry detail → shows full text, badge "Livre", archive button
6. Archive the entry → disappears from list, visible in `/diario/arquivadas`
7. Unarchive → returns to main list
8. Visit `/carta-do-dia` → "Escrever no diário" link visible below reflection
9. Click it → `/diario/nova` with "Carta do Dia" pre-selected and card linked
10. Create the entry → revisit `/carta-do-dia` → link now says "Ver minha reflexão"

- [ ] **Step 5: Commit (if any fixes needed)**

If any fixes were needed during verification, commit them:

```bash
git add -u
git commit -m "fix(diary): address issues found during smoke test"
```
