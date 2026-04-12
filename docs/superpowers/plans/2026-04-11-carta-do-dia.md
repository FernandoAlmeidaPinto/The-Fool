# Carta do Dia Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Carta do Dia" retention feature: once-per-day draw per user from a single admin-flagged deck, with a lazily AI-generated reflection cached per card; widget on dashboard, dedicated page, and paginated history.

**Architecture:** New `lib/daily-card/` domain (model + service + date helper). Extend `Deck` schema with `availableForDailyCard` flag and `Card` subdoc with `dailyReflection`. Extend `AIProvider` with `generateDailyCardReflection`. Add new permission `daily-card:read` granted to `admin` + `free_tier`. UI: dashboard widget (Server Component reading `getOrCreateToday`), `/carta-do-dia`, `/carta-do-dia/historico`, `/carta-do-dia/historico/[date]`, plus a toggle in admin deck edit form and a badge in the deck list.

**Tech Stack:** Next.js 16 App Router (Server Components, async params), Mongoose 8, TypeScript strict, Tailwind 4, shadcn/ui (Switch, Badge, Card). No test framework — manual verification per spec.

**Spec:** `docs/superpowers/specs/2026-04-11-carta-do-dia-design.md`

---

## File Structure

### New files

- `lib/daily-card/model.ts` — Mongoose `DailyCard` schema + interface
- `lib/daily-card/date.ts` — `dateInSaoPaulo()` helper
- `lib/daily-card/service.ts` — `getOrCreateToday`, `markRevealed`, `getHistory`, `getByDate`
- `app/(dashboard)/carta-do-dia/page.tsx` — dedicated page (Server Component)
- `app/(dashboard)/carta-do-dia/historico/page.tsx` — paginated history list
- `app/(dashboard)/carta-do-dia/historico/[date]/page.tsx` — history detail
- `components/daily-card/widget.tsx` — dashboard widget (Server Component)
- `components/daily-card/card-view.tsx` — shared card presentation (image + name + reflection), used by dedicated page and history detail
- `components/ui/switch.tsx` — shadcn Switch (if not already present; verify at Task 5)

### Modified files

- `lib/permissions/constants.ts` — add `DAILY_CARD_READ`
- `lib/db/seed.ts` — include new permission in `admin` + `free_tier` seeds
- `lib/decks/model.ts` — add `availableForDailyCard` to `IDeck`/`DeckSchema`, `dailyReflection` to `ICard`/`CardSchema`
- `lib/decks/service.ts` — add `getActiveDailyDeck()`, `setAsDailyDeck(id)`, exposed via toggle action
- `lib/ai/provider.ts` — add `generateDailyCardReflection(card)` to `AIProvider` interface
- `lib/ai/mock-provider.ts` — implement `generateDailyCardReflection`
- `app/(dashboard)/admin/decks/actions.ts` — new `setAsDailyDeckAction(formData)` + accept `availableForDailyCard` flag from edit form
- `app/(dashboard)/admin/decks/[id]/edit/page.tsx` — render Switch "Usar como baralho do dia"
- `app/(dashboard)/admin/decks/page.tsx` — badge on the active daily deck row
- `components/dashboard/sidebar.tsx` — new "Carta do Dia" nav item after "Leituras"
- `app/(dashboard)/page.tsx` — render `<DailyCardWidget />`

---

## Task 1: Permission constant and seed

**Files:**
- Modify: `lib/permissions/constants.ts`
- Modify: `lib/db/seed.ts`

- [ ] **Step 1: Add permission constant**

In `lib/permissions/constants.ts`, inside the `PERMISSIONS` object (after `ADMIN_PRACTICE_QUESTIONS`), add:

```ts
  // Daily card
  DAILY_CARD_READ: "daily-card:read",
```

- [ ] **Step 2: Update seed**

In `lib/db/seed.ts`, update the `free_tier` profile `permissions` array to include the new constant:

```ts
permissions: [
  PERMISSIONS.READINGS_VIEW,
  PERMISSIONS.READINGS_CREATE,
  PERMISSIONS.DAILY_CARD_READ,
],
```

The `admin` profile uses `ALL_PERMISSIONS` so it already picks up the new one.

- [ ] **Step 3: Run seed**

```bash
yarn seed
```

Expected: `✓ admin profile`, `✓ free_tier profile`, `Seed complete.`

- [ ] **Step 4: Commit**

```bash
git add lib/permissions/constants.ts lib/db/seed.ts
git commit -m "feat(daily-card): add daily-card:read permission"
```

---

## Task 2: Deck schema extensions

**Files:**
- Modify: `lib/decks/model.ts`

- [ ] **Step 1: Add fields to schemas**

In `lib/decks/model.ts`:

1. Add `dailyReflection` to `ICard` and `CardSchema`:
   ```ts
   // interface ICard
   dailyReflection: string | null;

   // CardSchema
   dailyReflection: { type: String, default: null },
   ```

2. Add `availableForDailyCard` to `IDeck` and `DeckSchema`:
   ```ts
   // interface IDeck
   availableForDailyCard: boolean;

   // DeckSchema
   availableForDailyCard: { type: Boolean, default: false, index: true },
   ```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/decks/model.ts
git commit -m "feat(daily-card): extend deck/card schema with daily fields"
```

---

## Task 3: Deck service — daily deck helpers

**Files:**
- Modify: `lib/decks/service.ts`

- [ ] **Step 1: Add `getActiveDailyDeck` and `setAsDailyDeck`**

At the bottom of `lib/decks/service.ts`, append:

```ts
export async function getActiveDailyDeck(): Promise<IDeck | null> {
  await connectDB();
  return Deck.findOne({ availableForDailyCard: true }).lean();
}

/**
 * Atomically marks one deck as the active daily deck.
 * Unsets the flag on every other deck first, then sets it on the target.
 * Pass `deckId = null` to simply clear the flag (no active deck).
 */
export async function setAsDailyDeck(deckId: string | null): Promise<void> {
  await connectDB();
  await Deck.updateMany(
    { availableForDailyCard: true },
    { $set: { availableForDailyCard: false } }
  );
  if (deckId) {
    await Deck.updateOne(
      { _id: deckId },
      { $set: { availableForDailyCard: true } }
    );
  }
}
```

- [ ] **Step 2: Add `setCardDailyReflection` (positional update, avoids lost writes)**

Append:

```ts
export async function setCardDailyReflection(
  deckId: string,
  cardId: string,
  reflection: string
): Promise<void> {
  await connectDB();
  await Deck.updateOne(
    { _id: deckId, "cards._id": cardId },
    { $set: { "cards.$.dailyReflection": reflection } }
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
yarn lint
```

- [ ] **Step 4: Commit**

```bash
git add lib/decks/service.ts
git commit -m "feat(daily-card): add active-daily-deck helpers to deck service"
```

---

## Task 4: AI provider — `generateDailyCardReflection`

**Files:**
- Modify: `lib/ai/provider.ts`
- Modify: `lib/ai/mock-provider.ts`

- [ ] **Step 1: Add method to interface**

In `lib/ai/provider.ts`, add to `AIProvider`:

```ts
generateDailyCardReflection(card: CardData): Promise<string>;
```

- [ ] **Step 2: Implement in mock provider**

In `lib/ai/mock-provider.ts`, add:

```ts
async generateDailyCardReflection(card: CardData): Promise<string> {
  return `<p>A carta <strong>${card.title}</strong> convida você a fazer uma pausa e olhar para dentro. Respire fundo e permita que a sua mensagem atravesse o dia com você.</p><p>Deixe que o símbolo desta carta seja um farol silencioso nas pequenas escolhas de hoje.</p>`;
}
```

Note: never mention "AI" in the text — this is a product-wide user-facing rule.

- [ ] **Step 3: Typecheck**

```bash
yarn lint
```

- [ ] **Step 4: Commit**

```bash
git add lib/ai/provider.ts lib/ai/mock-provider.ts
git commit -m "feat(daily-card): add generateDailyCardReflection to AI provider"
```

---

## Task 5: shadcn Switch component (verify or install)

**Files:**
- Possibly create: `components/ui/switch.tsx`

- [ ] **Step 1: Check existence**

```bash
ls components/ui/switch.tsx 2>/dev/null && echo EXISTS || echo MISSING
```

- [ ] **Step 2: If MISSING, install via shadcn CLI**

```bash
npx shadcn@latest add switch
```

If the CLI is not available, create `components/ui/switch.tsx` manually by copying the standard shadcn base-nova Switch template (Radix `@radix-ui/react-switch` wrapper). Ensure the import path is `@/components/ui/switch`.

- [ ] **Step 3: Commit (only if added)**

```bash
git add components/ui/switch.tsx package.json yarn.lock
git commit -m "chore: add shadcn Switch component"
```

---

## Task 6: `dateInSaoPaulo()` helper

**Files:**
- Create: `lib/daily-card/date.ts`

- [ ] **Step 1: Implement helper**

```ts
/**
 * Returns today's date in `YYYY-MM-DD` format, computed in the
 * `America/Sao_Paulo` timezone. Used as the "day line" for the daily card,
 * so every user across the pt-BR product shares the same daily cycle
 * regardless of their browser timezone.
 *
 * Brazil has no DST, but this uses Intl.DateTimeFormat anyway so that
 * future rule changes are handled automatically.
 */
export function dateInSaoPaulo(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return `${year}-${month}-${day}`;
}
```

- [ ] **Step 2: Sanity check in `node -e`**

```bash
node -e "console.log(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))"
```

Expected: a string shaped like `2026-04-11`.

- [ ] **Step 3: Commit**

```bash
git add lib/daily-card/date.ts
git commit -m "feat(daily-card): add dateInSaoPaulo helper"
```

---

## Task 7: `DailyCard` model

**Files:**
- Create: `lib/daily-card/model.ts`

- [ ] **Step 1: Write model**

```ts
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IDailyCard {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string; // "YYYY-MM-DD" in America/Sao_Paulo
  deckId: mongoose.Types.ObjectId;
  cardId: mongoose.Types.ObjectId;
  cardSnapshot: {
    name: string;
    imageUrl: string;
  };
  revealedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DailyCardSchema = new Schema<IDailyCard>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    deckId: { type: Schema.Types.ObjectId, ref: "Deck", required: true },
    cardId: { type: Schema.Types.ObjectId, required: true },
    cardSnapshot: {
      name: { type: String, required: true },
      imageUrl: { type: String, required: true },
    },
    revealedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One draw per user per day — also protects against concurrent first-visit races.
DailyCardSchema.index({ userId: 1, date: 1 }, { unique: true });
// Feeds paginated history query.
DailyCardSchema.index({ userId: 1, date: -1 });

export const DailyCard: Model<IDailyCard> =
  models.DailyCard ?? model<IDailyCard>("DailyCard", DailyCardSchema);
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add lib/daily-card/model.ts
git commit -m "feat(daily-card): add DailyCard mongoose model"
```

---

## Task 8: `DailyCard` service — `getOrCreateToday` and friends

**Files:**
- Create: `lib/daily-card/service.ts`

- [ ] **Step 1: Write service**

```ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { DailyCard, type IDailyCard } from "./model";
import { dateInSaoPaulo } from "./date";
import {
  getActiveDailyDeck,
  getDeckById,
  setCardDailyReflection,
} from "@/lib/decks/service";
import type { IDeck, ICard } from "@/lib/decks/model";
import { getAIProvider } from "@/lib/ai/provider";

function pickRandomCard(cards: ICard[]): ICard | null {
  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}

/**
 * Single entry point for the daily card feature. Idempotent: called by
 * both the dashboard widget and the dedicated page any number of times.
 *
 * - Returns the existing DailyCard for today if one exists.
 * - Otherwise draws a random card from the active daily deck, lazily
 *   generates a reflection (cached on the Card subdoc), and persists
 *   a new DailyCard.
 * - Returns null if no deck is currently flagged as the daily deck
 *   (or the flagged deck is empty).
 */
export async function getOrCreateToday(
  userId: string
): Promise<IDailyCard | null> {
  await connectDB();
  const today = dateInSaoPaulo();

  const existing = await DailyCard.findOne({ userId, date: today }).lean();
  if (existing) return existing;

  const activeDeck = await getActiveDailyDeck();
  if (!activeDeck) return null;

  const card = pickRandomCard(activeDeck.cards as unknown as ICard[]);
  if (!card) return null;

  // Lazy reflection generation — one AI call per card, ever.
  if (!card.dailyReflection) {
    try {
      const ai = getAIProvider();
      const reflection = await ai.generateDailyCardReflection({
        _id: card._id.toString(),
        title: card.title,
        description: card.description,
      });
      await setCardDailyReflection(
        activeDeck._id.toString(),
        card._id.toString(),
        reflection
      );
      card.dailyReflection = reflection;
    } catch (err) {
      // Non-fatal: the DailyCard is still created below; reflection stays
      // null and a later draw of the same card will retry.
      console.error("[daily-card] reflection generation failed", err);
    }
  }

  try {
    const created = await DailyCard.create({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      deckId: activeDeck._id,
      cardId: card._id,
      cardSnapshot: { name: card.title, imageUrl: card.image },
      revealedAt: null,
    });
    return created.toObject();
  } catch (err: unknown) {
    // Duplicate key: lost a race with a concurrent first-visit. Re-read.
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return DailyCard.findOne({ userId, date: today }).lean();
    }
    throw err;
  }
}

export async function markRevealed(
  userId: string,
  date: string
): Promise<void> {
  await connectDB();
  await DailyCard.updateOne(
    { userId, date, revealedAt: null },
    { $set: { revealedAt: new Date() } }
  );
}

export async function getHistory(
  userId: string,
  { page = 1, pageSize = 30 }: { page?: number; pageSize?: number } = {}
): Promise<{ items: IDailyCard[]; total: number; page: number; pageSize: number }> {
  await connectDB();
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    DailyCard.find({ userId }).sort({ date: -1 }).skip(skip).limit(pageSize).lean(),
    DailyCard.countDocuments({ userId }),
  ]);
  return { items, total, page, pageSize };
}

export async function getByDate(
  userId: string,
  date: string
): Promise<IDailyCard | null> {
  await connectDB();
  return DailyCard.findOne({ userId, date }).lean();
}

/**
 * Resolves the live card (deck + subdoc) for a stored DailyCard record.
 * Returns null if either the deck or the card no longer exists — in that
 * case callers should fall back to `dailyCard.cardSnapshot`.
 */
export async function resolveLiveCard(
  dailyCard: IDailyCard
): Promise<{ deck: IDeck; card: ICard } | null> {
  const deck = await getDeckById(dailyCard.deckId.toString());
  if (!deck) return null;
  const card = deck.cards.find(
    (c) => c._id.toString() === dailyCard.cardId.toString()
  );
  if (!card) return null;
  return { deck, card: card as ICard };
}
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add lib/daily-card/service.ts
git commit -m "feat(daily-card): add DailyCard service (getOrCreateToday, history)"
```

---

## Task 9: Shared `DailyCardView` component

**Files:**
- Create: `components/daily-card/card-view.tsx`

- [ ] **Step 1: Write component**

```tsx
import { parseAspectRatio } from "@/lib/decks/constants";

interface DailyCardViewProps {
  name: string;
  imageUrl: string;
  reflection: string | null;
  aspectRatio?: string;
  dateLabel?: string;
}

export function DailyCardView({
  name,
  imageUrl,
  reflection,
  aspectRatio = "2/3",
  dateLabel,
}: DailyCardViewProps) {
  const ratio = parseAspectRatio(aspectRatio).cssValue;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      {dateLabel && (
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      )}
      <div
        className="w-full max-w-xs overflow-hidden rounded-lg border border-border shadow-sm"
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
      </div>
      <h1 className="text-center text-2xl font-semibold text-foreground">{name}</h1>
      {reflection ? (
        <div
          className="prose prose-sm max-w-none text-center text-foreground"
          dangerouslySetInnerHTML={{ __html: reflection }}
        />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Reflexão em preparação, volte daqui a pouco.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/daily-card/card-view.tsx
git commit -m "feat(daily-card): add shared DailyCardView component"
```

---

## Task 10: Dedicated page `/carta-do-dia`

**Files:**
- Create: `app/(dashboard)/carta-do-dia/page.tsx`

- [ ] **Step 1: Write page**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  getOrCreateToday,
  markRevealed,
  resolveLiveCard,
} from "@/lib/daily-card/service";
import { DailyCardView } from "@/components/daily-card/card-view";
import { Button } from "@/components/ui/button";

export default async function CartaDoDiaPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) redirect("/");

  const userId = session.user.id as string;
  const dailyCard = await getOrCreateToday(userId);

  if (!dailyCard) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">Carta do Dia</h1>
        <p className="mt-4 text-muted-foreground">
          Nenhum baralho do dia configurado. Volte em breve.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button variant="outline">Voltar à dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!dailyCard.revealedAt) {
    await markRevealed(userId, dailyCard.date);
  }

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  const reflection = live?.card.dailyReflection ?? null;
  const aspectRatio = live?.deck.cardAspectRatio ?? "2/3";

  return (
    <div className="space-y-8">
      <DailyCardView
        name={name}
        imageUrl={imageUrl}
        reflection={reflection}
        aspectRatio={aspectRatio}
      />
      <div className="text-center">
        <Link
          href="/carta-do-dia/historico"
          className="text-sm text-primary hover:underline"
        >
          Ver histórico
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/carta-do-dia/page.tsx
git commit -m "feat(daily-card): add dedicated /carta-do-dia page"
```

---

## Task 11: History list page `/carta-do-dia/historico`

**Files:**
- Create: `app/(dashboard)/carta-do-dia/historico/page.tsx`

- [ ] **Step 1: Write page**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getHistory, resolveLiveCard } from "@/lib/daily-card/service";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 30;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) redirect("/");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const userId = session.user.id as string;
  const { items, total, pageSize } = await getHistory(userId, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Resolve all thumbnails in parallel.
  const resolved = await Promise.all(
    items.map(async (dc) => {
      const live = await resolveLiveCard(dc);
      return {
        dc,
        name: live?.card.title ?? dc.cardSnapshot.name,
        imageUrl: live?.card.image ?? dc.cardSnapshot.imageUrl,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Histórico — Carta do Dia</h1>
        <Link href="/carta-do-dia">
          <Button variant="outline" size="sm">Carta de hoje</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">Ainda não há cartas no seu histórico.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {resolved.map(({ dc, name, imageUrl }) => (
            <Link
              key={dc._id.toString()}
              href={`/carta-do-dia/historico/${dc.date}`}
              className="group flex flex-col gap-2"
            >
              <div className="relative overflow-hidden rounded-md border border-border" style={{ aspectRatio: "2/3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={name} className="h-full w-full object-contain opacity-80 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{dc.date}</p>
                <p className="text-sm font-medium leading-tight group-hover:underline">{name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/carta-do-dia/historico?page=${page - 1}`}>
              <Button variant="outline" size="sm">Anterior</Button>
            </Link>
          )}
          <span className="self-center text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/carta-do-dia/historico?page=${page + 1}`}>
              <Button variant="outline" size="sm">Próxima</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/carta-do-dia/historico/page.tsx
git commit -m "feat(daily-card): add paginated history list"
```

---

## Task 12: History detail page `/carta-do-dia/historico/[date]`

**Files:**
- Create: `app/(dashboard)/carta-do-dia/historico/[date]/page.tsx`

- [ ] **Step 1: Write page**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getByDate, resolveLiveCard } from "@/lib/daily-card/service";
import { DailyCardView } from "@/components/daily-card/card-view";

export default async function HistoricoDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) redirect("/");

  const { date } = await params;

  // Minimal format guard — reject anything that isn't YYYY-MM-DD.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const userId = session.user.id as string;
  const dailyCard = await getByDate(userId, date);
  if (!dailyCard) notFound();

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  // Reflection lives on the subdoc — if the card no longer resolves, hide it.
  const reflection = live ? live.card.dailyReflection : null;
  const aspectRatio = live?.deck.cardAspectRatio ?? "2/3";

  return (
    <div className="space-y-8">
      <DailyCardView
        name={name}
        imageUrl={imageUrl}
        reflection={reflection}
        aspectRatio={aspectRatio}
        dateLabel={date}
      />
      <div className="text-center">
        <Link href="/carta-do-dia/historico" className="text-sm text-primary hover:underline">
          ← Voltar ao histórico
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/carta-do-dia/historico/\[date\]/page.tsx
git commit -m "feat(daily-card): add history detail page"
```

---

## Task 13: Dashboard widget

**Files:**
- Create: `components/daily-card/widget.tsx`
- Modify: `app/(dashboard)/page.tsx`

- [ ] **Step 1: Write widget**

```tsx
// components/daily-card/widget.tsx
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getOrCreateToday, resolveLiveCard } from "@/lib/daily-card/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export async function DailyCardWidget() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.DAILY_CARD_READ)) {
    return null;
  }

  const userId = session.user.id as string;
  const dailyCard = await getOrCreateToday(userId);

  // State 1: no active deck
  if (!dailyCard) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Carta do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Em breve.</p>
        </CardContent>
      </Card>
    );
  }

  const live = await resolveLiveCard(dailyCard);
  const name = live?.card.title ?? dailyCard.cardSnapshot.name;
  const imageUrl = live?.card.image ?? dailyCard.cardSnapshot.imageUrl;
  const visited = dailyCard.revealedAt !== null;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{visited ? "Sua carta de hoje" : "Sua carta do dia te espera"}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md border border-border">
          {visited ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-2xl">🎴</div>
          )}
        </div>
        <div className="flex-1">
          {visited && <p className="mb-2 text-sm font-medium text-foreground">{name}</p>}
          <Link href="/carta-do-dia">
            <Button size="sm" variant={visited ? "outline" : "default"}>
              {visited ? "Ver novamente" : "Revelar"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Render widget on dashboard home**

Replace `app/(dashboard)/page.tsx` content with:

```tsx
import { auth } from "@/lib/auth/auth";
import { DailyCardWidget } from "@/components/daily-card/widget";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Bem-vindo, {session?.user?.name}
        </h2>
        <p className="mt-2 text-muted-foreground">
          Esta é a sua dashboard. Novas funcionalidades aparecerão aqui em breve.
        </p>
      </div>
      <DailyCardWidget />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
yarn lint
```

- [ ] **Step 4: Commit**

```bash
git add components/daily-card/widget.tsx app/\(dashboard\)/page.tsx
git commit -m "feat(daily-card): add dashboard widget"
```

---

## Task 14: Sidebar nav entry

**Files:**
- Modify: `components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add import and entry**

1. Add `Sun` to the lucide-react import block.
2. Add new `SidebarItem` after the Leituras one:

```tsx
<SidebarItem href="/leituras" label="Leituras" icon={Sparkles} onNavigate={onNavigate} />
<SidebarItem href="/carta-do-dia" label="Carta do Dia" icon={Sun} onNavigate={onNavigate} />
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat(daily-card): add sidebar nav entry"
```

---

## Task 15: Admin toggle — action + edit form

**Files:**
- Modify: `app/(dashboard)/admin/decks/actions.ts`
- Modify: `app/(dashboard)/admin/decks/[id]/edit/page.tsx`

- [ ] **Step 1: Add `setAsDailyDeckAction` server action**

Add at the top of `actions.ts`:

```ts
import { setAsDailyDeck } from "@/lib/decks/service";
```

Append at the bottom of `actions.ts`:

```ts
export async function setAsDailyDeckAction(formData: FormData) {
  await requireDecksPermission();
  const deckId = formData.get("deckId") as string;
  const enabled = formData.get("enabled") === "true";
  if (!deckId) throw new Error("Deck id é obrigatório");
  await setAsDailyDeck(enabled ? deckId : null);
}
```

- [ ] **Step 2: Wire the Switch into the edit page**

In `app/(dashboard)/admin/decks/[id]/edit/page.tsx`, add imports:

```tsx
import { Switch } from "@/components/ui/switch";
import { setAsDailyDeckAction } from "../../actions";
```

Render a separate form block directly **below** the existing `updateDeckAction` form (inside the same `<Card>` or as its own `<Card>`), so that toggling the daily-deck flag is one submission and the main form remains untouched:

```tsx
<Card className="max-w-2xl">
  <CardHeader>
    <CardTitle>Carta do Dia</CardTitle>
  </CardHeader>
  <CardContent>
    <form action={setAsDailyDeckAction} className="flex items-center gap-4">
      <input type="hidden" name="deckId" value={deck._id.toString()} />
      <input
        type="hidden"
        name="enabled"
        value={deck.availableForDailyCard ? "false" : "true"}
      />
      <div className="flex-1">
        <p className="text-sm font-medium">Usar como baralho do dia</p>
        <p className="text-xs text-muted-foreground">
          Apenas um baralho pode estar ativo por vez. Ativar este desativa o anterior.
        </p>
      </div>
      <Button
        type="submit"
        variant={deck.availableForDailyCard ? "outline" : "default"}
        size="sm"
      >
        {deck.availableForDailyCard ? "Desativar" : "Ativar"}
      </Button>
    </form>
  </CardContent>
</Card>
```

Note: we use a button form rather than a live `Switch` to avoid client-side state and keep it a Server Component. (The `Switch` component is still installed from Task 5 for consistency with other shadcn usage; if you prefer a live switch, wrap it in a small client component — but the plain button form is simpler and sufficient.)

- [ ] **Step 3: Typecheck**

```bash
yarn lint
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/decks/actions.ts app/\(dashboard\)/admin/decks/\[id\]/edit/page.tsx
git commit -m "feat(daily-card): admin toggle for active daily deck"
```

---

## Task 16: Admin deck listing badge

**Files:**
- Modify: `app/(dashboard)/admin/decks/page.tsx`

- [ ] **Step 1: Show badge on the active row**

In the `<TableRow>` loop, next to `{deck.name}`, render a small badge when `deck.availableForDailyCard`:

```tsx
<TableCell className="font-medium">
  {deck.name}
  {deck.availableForDailyCard && (
    <Badge variant="default" className="ml-2">Baralho do dia</Badge>
  )}
</TableCell>
```

- [ ] **Step 2: Typecheck**

```bash
yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/admin/decks/page.tsx
git commit -m "feat(daily-card): show active daily deck badge in admin list"
```

---

## Task 17: Build verification

- [ ] **Step 1: Full build**

```bash
yarn build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Manual verification against spec**

Follow the scenarios in `docs/superpowers/specs/2026-04-11-carta-do-dia-design.md` §"Verification Plan":

1. Admin invariant: flag deck A → DB shows only A; flag deck B → A cleared.
2. First visit: fresh user sees "Sua carta do dia te espera" → clicks Revelar → page shows card + reflection → dashboard now says "visitada".
3. Idempotency: reload dedicated page and dashboard; no duplicates, same card.
4. AI cache: log a first draw (AI call fires) → second user drawing same card → no new AI call, reflection reused.
5. AI failure: set `AI_PROVIDER=broken` (or throw manually) → DailyCard still created, UI shows "Reflexão em preparação".
6. Snapshot fallback: delete a drawn card via admin → history detail renders via snapshot, reflection block hidden.
7. No active deck: unflag all → widget shows "em breve", page shows empty state.
8. Day boundary: advance clock across 00:00 BR → new card drawn.
9. Pagination: seed ~50 records → `?page=2` works, ordering correct.
10. Deep link: visit `/carta-do-dia/historico/2026-04-10` directly.
11. Race: two concurrent first-visits → exactly one `DailyCard` row in DB.

Record any issues and fix before closing the branch.

- [ ] **Step 3: Final commit (if fixes needed)**

If fixes are needed, commit them separately with descriptive messages. Otherwise, this task has no commit.

---

## Notes

- **No test framework yet** — all verification is manual. Automated tests for `getOrCreateToday`, the deck-service invariant, and `dateInSaoPaulo` are deferred and noted in the spec.
- **No cron / midnight job** — lazy draws are by design.
- **Use `<img>` not `next/image` for MinIO URLs** (project rule).
- **`params`/`searchParams` are async in Next.js 16** — always `await`.
