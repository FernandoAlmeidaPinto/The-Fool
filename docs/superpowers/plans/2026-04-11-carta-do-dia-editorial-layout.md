# Carta do Dia — Editorial Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/carta-do-dia` dedicated page into an editorial / mystic-modern two-column layout with Playfair Display display type, a pull-quote + drop cap, and a subtle decorative block behind the card. Also shrink the card on the history detail page via a new `size="compact"` prop on `DailyCardView`.

**Architecture:** Strictly UI + one pure utility. No schema, service, AI, or permission changes. A new Server Component `EditorialLayout` replaces `DailyCardView` only on the dedicated page. A new pure function `splitReflection` extracts quote / drop cap / body from the cached reflection HTML. `DailyCardView` gains a `size` prop. Playfair Display is loaded via `next/font/google` and exposed as a Tailwind 4 `--font-display` theme token.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19, Tailwind 4 (inline `@theme`), `next/font/google` for Playfair Display. No tests — project has no test framework; verification is manual and documented per task.

**Spec:** `docs/superpowers/specs/2026-04-11-carta-do-dia-editorial-layout-design.md`

---

## File Structure

### New files

- `lib/daily-card/reflection.ts` — pure utility `splitReflection(html)` returning `{ pullQuote, body, firstLetter, bodyWithoutFirstLetter }`. No React, no IO.
- `components/daily-card/editorial-layout.tsx` — Server Component that renders the editorial composition. Receives already-processed strings as props; contains no business logic.

### Modified files

- `app/layout.tsx` — add Playfair Display via `next/font/google`, wire CSS variable `--font-playfair-display` into `<html>` className.
- `app/globals.css` — expose `--font-display` inside the `@theme inline` block so Tailwind generates a `font-display` utility.
- `app/(dashboard)/carta-do-dia/page.tsx` — stop importing `DailyCardView`, import `EditorialLayout`. Call `splitReflection`. Format three date strings (weekday / "DD DE MONTH" / "DE YYYY"). Pass everything to `EditorialLayout`.
- `components/daily-card/card-view.tsx` — add `size?: "default" | "compact"` prop; `compact` shrinks image and name.
- `app/(dashboard)/carta-do-dia/historico/[date]/page.tsx` — pass `size="compact"`.

### Not touching

- `DailyCardWidget`, history list, service layer, model, AI provider, permissions, other pages.

---

## Task 1: Load Playfair Display and expose `font-display` utility

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add the font import in `app/layout.tsx`**

Replace the existing `next/font/google` import line and add a third font constant:

```ts
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
```

- [ ] **Step 2: Add the variable to the `<html>` className**

Replace:

```tsx
<html
  lang="pt-BR"
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
>
```

With:

```tsx
<html
  lang="pt-BR"
  className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} h-full antialiased`}
>
```

- [ ] **Step 3: Expose `--font-display` in `app/globals.css`**

Inside the existing `@theme inline { ... }` block in `app/globals.css`, add a new line directly after the existing `--font-mono` declaration:

```css
  --font-display: var(--font-playfair-display), ui-serif, Georgia, serif;
```

(Location: under `--font-mono: var(--font-geist-mono);` near the top of the `@theme inline` block.) This makes Tailwind 4 auto-generate a `font-display` utility class.

- [ ] **Step 4: Verify**

```bash
yarn lint
```

Expected: 0 errors.

Optional smoke check by visiting any page — nothing should visually change yet because no element uses `font-display` yet.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(daily-card): load Playfair Display and expose font-display utility"
```

---

## Task 2: `splitReflection` pure utility

**Files:**
- Create: `lib/daily-card/reflection.ts`

- [ ] **Step 1: Write the module**

```ts
export interface SplitReflection {
  pullQuote: string | null;
  body: string | null;
  firstLetter: string | null;
  bodyWithoutFirstLetter: string | null;
}

/**
 * Splits a cached `dailyReflection` HTML blob into editorial pieces:
 * a pull quote (first sentence), a body (the rest as plain text), and
 * the first alphabetical letter of the body pre-extracted for a drop
 * cap, plus the body with that letter removed.
 *
 * The AI provider currently returns `<p>...</p><p>...</p>` with at
 * most one `<strong>` tag per paragraph. We intentionally strip HTML
 * and render the body as plain text — see the design doc for why.
 *
 * Edge cases:
 * - Null / empty input → all fields null.
 * - Single sentence → pullQuote is that sentence, body is "".
 * - Body starts with punctuation → drop cap picks the first `\p{L}`
 *   match; the punctuation stays in `bodyWithoutFirstLetter`.
 * - No period found → pullQuote is the whole string, body is "".
 *
 * The sentence splitter is naively regex-based and will also split on
 * abbreviations like "Sr. Fulano". The current content doesn't produce
 * those — don't engineer around it until a real case appears.
 */
export function splitReflection(html: string | null): SplitReflection {
  if (!html) {
    return {
      pullQuote: null,
      body: null,
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  // Strip HTML tags and collapse whitespace.
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plain) {
    return {
      pullQuote: null,
      body: null,
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  // Split on the first period followed by whitespace.
  const parts = plain.split(/(?<=\.)\s+/);
  const pullQuote = parts[0].trim();
  const body = parts.slice(1).join(" ").trim();

  if (!body) {
    return {
      pullQuote,
      body: "",
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  // Find the first Unicode letter in the body.
  const letterMatch = body.match(/\p{L}/u);
  if (!letterMatch || letterMatch.index === undefined) {
    return {
      pullQuote,
      body,
      firstLetter: null,
      bodyWithoutFirstLetter: null,
    };
  }

  const idx = letterMatch.index;
  const firstLetter = body[idx];
  const bodyWithoutFirstLetter = body.slice(0, idx) + body.slice(idx + 1);

  return {
    pullQuote,
    body,
    firstLetter,
    bodyWithoutFirstLetter,
  };
}
```

- [ ] **Step 2: Verify**

```bash
yarn lint
```

Expected: 0 errors.

Quick manual smoke check in `node -e`:

```bash
node -e "const { splitReflection } = require('./lib/daily-card/reflection.ts');" 2>&1 || true
```

Note: this will not run because TypeScript imports don't work in raw Node without a loader — skip runtime verification here and rely on the typecheck. The function will be exercised when task 5 runs the actual page.

- [ ] **Step 3: Commit**

```bash
git add lib/daily-card/reflection.ts
git commit -m "feat(daily-card): add splitReflection utility"
```

---

## Task 3: `DailyCardView` gains `size` prop

**Files:**
- Modify: `components/daily-card/card-view.tsx`

- [ ] **Step 1: Read the existing file first**

Use the Read tool on `components/daily-card/card-view.tsx` before editing, to match the existing Tailwind class style and avoid stomping unrelated code.

- [ ] **Step 2: Add the prop and apply it**

Replace the props interface and the JSX with:

```tsx
import { parseAspectRatio } from "@/lib/decks/constants";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";

interface DailyCardViewProps {
  name: string;
  imageUrl: string;
  reflection: string | null;
  aspectRatio?: string;
  dateLabel?: string;
  size?: "default" | "compact";
}

export function DailyCardView({
  name,
  imageUrl,
  reflection,
  aspectRatio = "2/3",
  dateLabel,
  size = "default",
}: DailyCardViewProps) {
  const ratio = parseAspectRatio(aspectRatio).cssValue;
  const imageClass = size === "compact" ? "w-full max-w-[160px]" : "w-full max-w-xs";
  const nameClass =
    size === "compact"
      ? "text-center text-xl font-semibold text-foreground"
      : "text-center text-2xl font-semibold text-foreground";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6">
      {dateLabel && (
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
      )}
      <div
        className={`${imageClass} overflow-hidden rounded-lg border border-border shadow-sm`}
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
      </div>
      <h1 className={nameClass}>{name}</h1>
      {reflection ? (
        <RichTextViewer content={reflection} className="max-w-none text-center" />
      ) : (
        <p className="text-sm italic text-muted-foreground">
          Reflexão em preparação, volte daqui a pouco.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
yarn lint
```

Expected: 0 errors. Existing callers (the dedicated page and the history detail page) keep working because `size` has a default.

- [ ] **Step 4: Commit**

```bash
git add components/daily-card/card-view.tsx
git commit -m "feat(daily-card): add size prop to DailyCardView"
```

---

## Task 4: History detail uses `size="compact"`

**Files:**
- Modify: `app/(dashboard)/carta-do-dia/historico/[date]/page.tsx`

- [ ] **Step 1: Read the existing file**

Use the Read tool on the target file first to locate the `<DailyCardView>` call.

- [ ] **Step 2: Pass `size="compact"`**

Find the `<DailyCardView ... />` JSX invocation in that file and add the `size="compact"` prop alongside the existing ones. Do not change any other prop, any imports, or any surrounding code.

Example diff shape (adapt to whatever formatting is already there):

```tsx
<DailyCardView
  name={name}
  imageUrl={imageUrl}
  reflection={reflection}
  aspectRatio={aspectRatio}
  dateLabel={dateLabel}
  size="compact"
/>
```

- [ ] **Step 3: Verify**

```bash
yarn lint
```

Manual check (optional here, full manual verification happens in Task 7): visit `/carta-do-dia/historico/<some-date>` locally and confirm the card is visibly smaller than before.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/carta-do-dia/historico/\[date\]/page.tsx
git commit -m "feat(daily-card): shrink card on history detail via compact size"
```

---

## Task 5: `EditorialLayout` Server Component

**Files:**
- Create: `components/daily-card/editorial-layout.tsx`

- [ ] **Step 1: Write the component**

```tsx
import Link from "next/link";

interface EditorialLayoutProps {
  name: string;
  imageUrl: string;
  aspectRatio: string; // CSS aspect-ratio value, e.g. "2/3"
  dateWeekday: string;
  dateDayMonth: string;
  dateYear: string;
  pullQuote: string | null;
  firstLetter: string | null;
  bodyWithoutFirstLetter: string | null;
}

/**
 * Editorial composition of the daily card for the dedicated
 * `/carta-do-dia` page. Pure presentation: receives already-processed
 * strings and renders the grid, typography, decorative block, and
 * footer link. No IO, no authorization, no data fetching.
 */
export function EditorialLayout({
  name,
  imageUrl,
  aspectRatio,
  dateWeekday,
  dateDayMonth,
  dateYear,
  pullQuote,
  firstLetter,
  bodyWithoutFirstLetter,
}: EditorialLayoutProps) {
  const hasReflection = pullQuote !== null;
  const hasBody =
    firstLetter !== null &&
    bodyWithoutFirstLetter !== null &&
    bodyWithoutFirstLetter.length > 0;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8">
      {/* Date block */}
      <header className="mb-10 text-center font-display">
        <p className="text-sm italic text-muted-foreground">{dateWeekday}</p>
        <p className="mt-1 text-2xl font-bold tracking-[0.2em] text-foreground sm:text-3xl">
          {dateDayMonth}
        </p>
        <p className="mt-1 text-sm tracking-[0.3em] text-muted-foreground">
          {dateYear}
        </p>
      </header>

      {/* Two-column grid (stacks on mobile) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Card column */}
        <div className="lg:col-span-5 lg:self-start">
          <div className="relative mx-auto w-full max-w-sm">
            {/* Decorative block — absolute, insets handle the offset */}
            <div
              aria-hidden
              className="absolute inset-[-3%_-8%_-2%_4%] z-0 rounded-[2px] bg-charcoal/5 sm:inset-[-6%_-15%_-4%_8%]"
            />
            <div
              className="relative z-10 overflow-hidden rounded-lg border border-border shadow-sm"
              style={{ aspectRatio }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Text column */}
        <div className="lg:col-span-6 lg:self-start">
          <h1 className="font-display text-4xl font-normal text-foreground sm:text-5xl">
            {name}
          </h1>
          <div className="mt-3 h-px w-[60px] bg-border/60" />

          {hasReflection ? (
            <>
              <p className="mt-6 font-display text-xl italic leading-relaxed text-foreground">
                {pullQuote}
              </p>

              {hasBody && (
                <p className="mt-6 max-w-[65ch] text-base leading-relaxed text-foreground/90">
                  <span
                    className="daily-card-dropcap float-left mr-2 mt-1.5 font-display text-[60px] leading-[0.85] text-foreground"
                    aria-hidden
                  >
                    {firstLetter}
                  </span>
                  <span className="sr-only">{firstLetter}</span>
                  {bodyWithoutFirstLetter}
                </p>
              )}
            </>
          ) : (
            <p className="mt-6 text-sm italic text-muted-foreground">
              Reflexão em preparação, volte daqui a pouco.
            </p>
          )}
        </div>
      </div>

      {/* Footer link */}
      <footer className="mt-16 text-center">
        <Link
          href="/carta-do-dia/historico"
          className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
        >
          — Ver histórico —
        </Link>
      </footer>
    </article>
  );
}
```

Notes:
- The `font-display` class comes from the Tailwind 4 theme token added in Task 1.
- `bg-charcoal/5` assumes a `charcoal` color token. If the project uses a different name (check `globals.css` inside `@theme inline`), fall back to `bg-foreground/5` — visually equivalent for this decorative use. **Before committing, grep `globals.css` for `charcoal` and switch to `bg-foreground/5` if it doesn't exist.**
- Accessibility: the drop cap span is `aria-hidden` and a visually hidden `<span className="sr-only">` carries the same letter so screen readers still read the whole word. This keeps the visual float trick without breaking reading order.

- [ ] **Step 2: Verify `charcoal` color token**

```bash
grep -n "charcoal" app/globals.css
```

Expected: either a `--color-charcoal` declaration (use `bg-charcoal/5`) or no match (then replace `bg-charcoal/5` with `bg-foreground/5` in the file before committing). Edit in place if needed.

- [ ] **Step 3: Verify**

```bash
yarn lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add components/daily-card/editorial-layout.tsx
git commit -m "feat(daily-card): add EditorialLayout Server Component"
```

---

## Task 6: Wire the dedicated page to `EditorialLayout`

**Files:**
- Modify: `app/(dashboard)/carta-do-dia/page.tsx`

- [ ] **Step 1: Read the existing file**

Use the Read tool on `app/(dashboard)/carta-do-dia/page.tsx`. The overall structure (auth → permission → `getOrCreateToday` → null-check / empty state → `markRevealed` → `resolveLiveCard`) must be preserved. Only the final render section (and a date/reflection prep block) changes.

- [ ] **Step 2: Replace the file contents**

Replace the whole file with:

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
import { splitReflection } from "@/lib/daily-card/reflection";
import { EditorialLayout } from "@/components/daily-card/editorial-layout";
import { parseAspectRatio } from "@/lib/decks/constants";
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
  const reflectionHtml = live?.card.dailyReflection ?? null;
  const aspectRatio = parseAspectRatio(live?.deck.cardAspectRatio ?? "2/3").cssValue;

  // Multi-line editorial date. The `T12:00:00` suffix avoids the midnight-UTC
  // off-by-one that happens when a YYYY-MM-DD string is parsed at UTC.
  const dateObj = new Date(`${dailyCard.date}T12:00:00`);
  const dateWeekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
  const dateDayMonth = dateObj
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
    .toUpperCase();
  const dateYear = `DE ${dateObj.getFullYear()}`;

  const { pullQuote, firstLetter, bodyWithoutFirstLetter } =
    splitReflection(reflectionHtml);

  return (
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
  );
}
```

- [ ] **Step 3: Verify**

```bash
yarn lint
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/carta-do-dia/page.tsx
git commit -m "feat(daily-card): render editorial layout on dedicated page"
```

---

## Task 7: Build verification and manual check

- [ ] **Step 1: Full production build**

```bash
yarn build
```

Expected: success, no type errors, all routes compile. If build complains about a missing `.env.local`, copy from the main worktree the same way it was done previously (see prior branch's history): `cp /path/to/main/.env.local .` then retry. Delete the `.env.local` again before committing (it is gitignored but don't take chances).

- [ ] **Step 2: Start dev server**

```bash
yarn dev
```

- [ ] **Step 3: Manual verification checklist**

Per the spec §"Verification Plan (manual)":

1. Open `/carta-do-dia` on desktop (≥ 1024px wide). Confirm:
   - Two-column layout (card left, text right)
   - Playfair Display visible on date, card name, pull quote, drop cap
   - Decorative block visible behind the card (subtle passe-partout offset)
   - Drop cap visible on the first letter of the body
   - Pull quote in italic above the body
   - "— VER HISTÓRICO —" footer link rendered in uppercase tracked sans
2. Resize browser to ~ 600px wide. Confirm:
   - Date block still multi-line but smaller
   - Card and decorative block stacked at top
   - Text (name, ruler, quote, body) stacked below
   - Footer at bottom
3. Open `/carta-do-dia/historico/<some-date>`. Confirm:
   - Card is roughly half its previous width
   - Otherwise identical to before (centered column, reflection via `RichTextViewer`, back link)
4. Open `/` (dashboard). Confirm:
   - Widget renders exactly as before (unchanged)
5. Open `/carta-do-dia/historico`. Confirm:
   - List page renders exactly as before (unchanged)
6. **Reflection null path** — temporarily set a fresh user or clear the cached `dailyReflection` on the card subdoc (via `mongosh`: `db.decks.updateOne({ _id: ObjectId("...") }, { $set: { "cards.$[c].dailyReflection": null } }, { arrayFilters: [{ "c._id": ObjectId("...") }] })`). Reload `/carta-do-dia`. Confirm the "Reflexão em preparação" fallback replaces the quote + body block. Everything else renders normally. Re-run the seed afterward if needed.
7. **Single-sentence path** — optionally edit `lib/ai/mock-provider.ts` `generateDailyCardReflection` temporarily to return a single-sentence HTML (`<p>Uma frase só.</p>`), clear the cached reflection, reload. Confirm the quote renders but the drop-cap body paragraph does not. Revert the mock change.

- [ ] **Step 4: Close the dev server and commit any fixes**

If any fixes were needed during verification, commit them with descriptive messages. Otherwise no commit.

- [ ] **Step 5: Final lint pass**

```bash
yarn lint
```

Expected: 0 errors.

---

## Notes

- **Accessibility:** the decorative block is `aria-hidden`. The drop cap uses the `aria-hidden` + `sr-only` pattern so screen readers read the full word.
- **Font fallback:** Playfair uses `display: swap`, so while it loads the browser falls back to `ui-serif` / Georgia — no layout shift blocker.
- **No test framework:** every verification is manual. Unit tests for `splitReflection` are the obvious future automated target (null, empty, single-sentence, multi-paragraph, punctuation-first, long sentence, only tags) — noted in the spec.
- **Single commit per task** except Task 1 which legitimately bundles two files (font loading is one coherent change). Do not amend commits.
