# Carta do Dia — Editorial Layout

**Date:** 2026-04-11
**Status:** Approved
**Supersedes (partially):** the UI portion of `2026-04-11-carta-do-dia-design.md` — only for the dedicated page `/carta-do-dia`. All other pieces of that feature remain as-is.

## Overview

The current `/carta-do-dia` page uses a single-column `DailyCardView` that, while functional, feels like a wireframe: centered column, stock serif-less typography, no visual identity. This spec redesigns that single page into an **editorial / mystic-modern** composition — two columns on desktop, Playfair Display for display type, a subtle decorative block anchoring the card, and a pull quote + drop cap in the reflection text.

The goal is to match the ritualistic tone the feature is meant to evoke (daily retention loop, contemplative moment) without scope-creeping into new data, new schemas, or new product surfaces. It is strictly a UI redesign of one page — plus a small `size` prop added to `DailyCardView` so the history detail page can shrink its card in half (currently oversized).

## What Changes

### New files

- `components/daily-card/editorial-layout.tsx` — Server Component that renders the editorial composition. Receives all text already processed (pull quote, first letter, body rest) as props. No IO, no logic — pure layout.
- `lib/daily-card/reflection.ts` — Pure utility: `splitReflection(html)` returns `{ pullQuote, body, firstLetter, bodyWithoutFirstLetter }`.

### Modified files

- `app/(dashboard)/carta-do-dia/page.tsx` — Stops using `DailyCardView`, imports `EditorialLayout` instead. Runs `splitReflection` and formats `dateLabel` into a multi-line pt-BR label before rendering.
- `components/daily-card/card-view.tsx` — Adds a `size?: "default" | "compact"` prop; `compact` shrinks the card container to roughly half its current width.
- `app/(dashboard)/carta-do-dia/historico/[date]/page.tsx` — Passes `size="compact"` to `DailyCardView`. Nothing else changes.
- `app/layout.tsx` — Imports `Playfair_Display` from `next/font/google` alongside the existing Geist imports, exposes it as CSS variable `--font-playfair-display`.
- `app/globals.css` — Declares a `--font-display` token mapped to the new CSS variable, and a Tailwind utility class (or CSS custom property) so the editorial layout can use `font-display` idiomatically instead of inline `style`.

### Not changing

- `DailyCardWidget` — dashboard widget stays identical
- `/carta-do-dia/historico` list page — stays identical
- The empty state (no active daily deck) — the current centered message is appropriate and stays
- Service layer, models, permissions, AI provider
- Auth / permission guards in the page

## Scope boundary — not in scope

- Widget redesign
- History list redesign
- New AI prompts or structured output from the provider
- Any schema change on `Deck.cards.dailyReflection`
- Dark mode adjustments (the page already inherits the project's color tokens)
- Rich HTML in the body text — the body is rendered as plain text after HTML stripping (see "Reflection splitting" below)

## Layout

### Desktop (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                        quinta-feira                              │
│                       11 DE ABRIL                                │
│                         DE 2026                                  │
│                                                                  │
├──────────────────────────────┬───────────────────────────────────┤
│                              │                                   │
│   ░░░░░░░░░░░░░░░░░░░░░      │                                   │
│   ░░┌────────────────┐░░     │        A Estrela                  │
│   ░░│                │░░     │   ─────                           │
│   ░░│   [imagem      │░░     │                                   │
│   ░░│    da carta]   │░░     │  frase de abertura em itálico     │
│   ░░│                │░░     │                                   │
│   ░░│                │░░     │   D eixe que o símbolo desta      │
│   ░░│                │░░     │   carta seja um farol silencioso  │
│   ░░└────────────────┘░░     │   nas pequenas escolhas de hoje.  │
│   ░░░░░░░░░░░░░░░░░░░░░      │                                   │
│                              │                                   │
├──────────────────────────────┴───────────────────────────────────┤
│                     — VER HISTÓRICO —                            │
└──────────────────────────────────────────────────────────────────┘
```

- **Grid:** 12 columns, container `max-w-6xl mx-auto`. The date block spans the full width. Below it, the card column is `col-span-5` and the text column is `col-span-6`, with a 1-column gap between them.
- **Card column is `position: relative`.** Inside, a decorative block (`position: absolute`) sits behind the image. The image is `position: relative` / normal flow and sits on top.
- **Text column alignment:** the text column's children (name, quote, body) align to the top of the card image, NOT to the top of the image container. This is achieved with `align-self: start` on both columns and matching top padding so the card name and the card image share a horizontal baseline.
- **Footer:** full-width centered, below both columns, spaced generously.

### Mobile (< 1024px)

Everything stacks into a single column:

1. Date block (same multi-line composition, slightly smaller)
2. Card image + decorative block (centered, max-w-xs)
3. Card name
4. Short ruler beneath the name
5. Pull quote
6. Body with drop cap
7. Footer link

### Empty state

Unchanged from the current implementation — centered message "Nenhum baralho do dia configurado. Volte em breve." with a button back to the dashboard. The editorial layout is not rendered at all when `dailyCard` is null.

## Typography

### Font stack

- **Playfair Display** — loaded via `next/font/google`, weights `400` and `700`, subset `latin`, `display: "swap"`, exposed as CSS variable `--font-playfair-display`. Used for: date composition, card name, pull quote, drop cap.
- **Geist Sans** — already in the project, unchanged. Used for: body text of the reflection, footer link.

### Scale

| Element | Font | Size | Weight | Tracking | Color |
|---|---|---|---|---|---|
| Weekday (line 1 of date) | Playfair | 14px | 400 italic | normal | muted-foreground |
| "DD DE MÊS" (line 2) | Playfair | 32px desktop / 24px mobile | 700 | `0.2em` | foreground |
| "DE YYYY" (line 3) | Playfair | 14px | 400 | `0.3em` | muted-foreground |
| Card name | Playfair | 48px desktop / 36px mobile | 400 | normal | foreground |
| Ruler under name | — | 60px × 1px | — | — | `border/60` |
| Pull quote | Playfair | 22px / `text-xl` | 400 italic | normal | foreground |
| Body text | Geist | 16px / `text-base` | 400 | normal | `foreground/90` |
| Drop cap | Playfair | 60px | 400 | — | foreground |
| Footer link | Geist | 12px | 500 | `0.25em` | muted-foreground |

### Drop cap implementation

Not `::first-letter`, because the body text comes from HTML that has been stripped to plain text — the component renders a `<span className="daily-card-dropcap">{firstLetter}</span>` floated left, followed by the rest of the text as a normal paragraph. CSS: `float: left; font-family: var(--font-display); font-size: 60px; line-height: 0.85; margin-right: 8px; margin-top: 6px;`.

The span carries its own class so responsive tweaks and hover states are scoped.

### Pull quote

Rendered in Playfair italic, no quote marks (`"` or `"`). Quote marks add visual noise; italic alone is sufficient and more elegant. Color: `foreground`, size 22px, max-width the same as the body (around 65ch measured from the start of the text column).

## Reflection splitting

### Function

`lib/daily-card/reflection.ts`:

```ts
export interface SplitReflection {
  pullQuote: string | null;
  body: string | null;
  firstLetter: string | null;
  bodyWithoutFirstLetter: string | null;
}

export function splitReflection(html: string | null): SplitReflection;
```

### Algorithm

1. If `html` is null or empty after trim → return `{ pullQuote: null, body: null, firstLetter: null, bodyWithoutFirstLetter: null }`.
2. Strip HTML tags with `html.replace(/<[^>]+>/g, " ")`, collapse whitespace with `.replace(/\s+/g, " ").trim()`. The space substitution avoids gluing words together across paragraph boundaries.
3. Split on the first sentence boundary using a regex that matches a period followed by whitespace: `/(?<=\.)\s+/`. Take the first chunk as `pullQuote` (trimmed). Join the remaining chunks with a single space as the `body` (trimmed).
4. If the split yields only one chunk (no period found, or period only at the very end), `body` is `""`.
5. For `firstLetter`: scan `body` from the left, find the first character matching `/\p{L}/u`, take it. If no such character exists (body is empty or only punctuation), `firstLetter` is `null`.
6. `bodyWithoutFirstLetter` is `body` with exactly that first letter removed (from its found index, not from position 0).

### Edge cases and how the UI reacts

| Case | `pullQuote` | `body` | Renderer behavior |
|---|---|---|---|
| Reflection is null | null | null | Render the fallback `<p>` "Reflexão em preparação, volte daqui a pouco." in place of the entire quote + body block |
| Reflection is a single sentence | the sentence | `""` | Render pull quote only; no drop cap, no body paragraph |
| First text character is punctuation or quote | the sentence | the rest | Drop cap uses the first `\p{L}` match; the body paragraph still starts with the prefix punctuation (it remains visually in the text before the drop cap span, so we keep it as is — acceptable since this is a rare input) |
| Sentence ends in ellipsis `...` | whole chunk up to first `.` | rest after first `.` | Minor visual oddity (quote ends at "..") — acceptable, AI prompt avoids ellipses |
| Very long first sentence (> 160 chars) | whole sentence | rest | No truncation — quote wraps naturally |

### Why plain text for the body

Stripping HTML means the body cannot render `<strong>`, `<em>`, lists, or links. This is intentional:

- The current `dailyReflection` outputs from the mock provider are two `<p>` blocks, each with at most one `<strong>`. Losing the bold is a negligible stylistic change.
- Editorial body text with mixed rich formatting and a drop cap is visually noisy.
- A future structured AI output could return plain text directly, making this a one-line simplification later.

If rich body rendering becomes a requirement later, the function becomes more complex (or we bring back `RichTextViewer` for the body while keeping the extracted quote and drop cap). Out of scope here.

## Decorative block

Positioned absolutely inside the card column, behind the image:

- **Size:** width 85% of column, height 90% of image height
- **Offset:** `top: 8%`, `left: 8%` (desktop); `top: 4%`, `left: 4%` (mobile)
- **Style:** `bg-charcoal/5` (charcoal at 5% opacity) over the ivory background — an almost-imperceptible passe-partout
- **Border radius:** 2px — nearly square, editorial
- **Z-index:** block has `z-0`, image has `z-10`

This creates a soft anchoring effect for the card without introducing a dark background or a texture. It reads as "composition" rather than "frame".

If future user testing shows it reads as dirt/noise on mobile at small sizes, hide with `hidden sm:block`. Default ships visible on all sizes.

## Date label formatting

The page currently formats dates only in the history detail page (via `toLocaleDateString("pt-BR", ...)`). The new editorial layout needs three separate strings for the multi-line composition.

In `app/(dashboard)/carta-do-dia/page.tsx`, compute:

```ts
const dateObj = new Date(`${dailyCard.date}T12:00:00`);
const weekday = dateObj.toLocaleDateString("pt-BR", { weekday: "long" });
// "quinta-feira"
const dayMonth = dateObj
  .toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
  .toUpperCase();
// "11 DE ABRIL"
const year = `DE ${dateObj.getFullYear()}`;
// "DE 2026"
```

These are passed to `EditorialLayout` as three separate props (`dateWeekday`, `dateDayMonth`, `dateYear`).

The `T12:00:00` suffix parses the `YYYY-MM-DD` string as noon in the local timezone, avoiding the off-by-one that happens when a pure date string is parsed at midnight UTC and converted to a local timezone east of UTC-0.

## `DailyCardView` compact prop

The history detail page currently shows an oversized card relative to its content. Adding a `size` prop solves this without touching the rest of the layout:

```ts
interface DailyCardViewProps {
  name: string;
  imageUrl: string;
  reflection: string | null;
  aspectRatio?: string;
  dateLabel?: string;
  size?: "default" | "compact";
}
```

Effect of `size="compact"`:

- Image container: `max-w-[160px]` instead of `max-w-xs` (which is `320px`)
- Card name: `text-xl` instead of `text-2xl`
- Everything else unchanged (gap, alignment, reflection via `RichTextViewer`)

The dedicated page stops importing `DailyCardView` entirely, so the `default` branch is only used by… nothing, actually, after this change. It remains supported for API symmetry and potential future consumers, and to avoid a breaking change in the component interface.

## Why the history detail stays simple

The history detail page is **navigation / consulting past records**, not the contemplative "moment of the day". Applying the editorial layout there would:

- Duplicate reflection splitting for a context where the date is already the primary marker
- Make historical cards visually equivalent to today's card, blurring the "today feels special" distinction
- Cost twice the visual complexity for twice the maintenance surface

Shrinking the card is enough to fix the current complaint ("ta enorme e ocupando muito espaço") without scope creep.

## Font loading

In `app/layout.tsx`:

```ts
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});
```

The variable is added to the `<body>` className alongside `geistSans.variable` and `geistMono.variable`.

### CSS token

In `app/globals.css`, add:

```css
:root {
  --font-display: var(--font-playfair-display), ui-serif, Georgia, serif;
}
```

Plus a Tailwind utility via `@layer utilities`:

```css
@layer utilities {
  .font-display {
    font-family: var(--font-display);
  }
}
```

This lets the editorial layout use `className="font-display"` idiomatically, same pattern as Tailwind's `font-sans` / `font-mono`.

## Component responsibilities

### `EditorialLayout` (new)

Props:

```ts
interface EditorialLayoutProps {
  name: string;
  imageUrl: string;
  aspectRatio: string; // parsed CSS value from parseAspectRatio().cssValue
  dateWeekday: string;
  dateDayMonth: string;
  dateYear: string;
  pullQuote: string | null;
  firstLetter: string | null;
  bodyRest: string | null;
}
```

Responsibilities:
- Render the grid layout (date block → two columns → footer)
- Render the decorative block behind the image
- Render the typographic hierarchy using `font-display` and size classes
- Render the drop cap span
- Render the fallback message when `pullQuote` is null (the function returns null `pullQuote` only when the whole reflection is null — the fallback replaces the entire quote+body block)
- Render the footer link styled editorially (`— VER HISTÓRICO —`, tracked, uppercase)

No IO. No authorization logic. No data fetching. Takes ready strings and renders them.

### `splitReflection` (new)

Pure function. No React, no Mongoose. Testable in isolation (though no test framework exists yet — notes left for future automated tests).

### `page.tsx` (dedicated page)

Orchestrates:
1. Auth + permission guard (unchanged)
2. `getOrCreateToday` + `markRevealed` (unchanged)
3. Empty state for null `dailyCard` (unchanged)
4. `resolveLiveCard` for snapshot fallback (unchanged)
5. **New:** split the reflection via `splitReflection`
6. **New:** compute three date strings
7. **New:** render `<EditorialLayout {...} />` (replaces the `<DailyCardView>` call)

## Error handling & edge cases

1. **Null reflection** — whole quote+body block is replaced by the fallback paragraph. Everything else (date, card image, name, footer) renders normally.
2. **Single-sentence reflection** — quote renders, drop cap block is not rendered (no body).
3. **Card with aspect ratio != 2/3** — `aspectRatio` is passed through; the card column respects the deck's ratio. The decorative block's size is percentage-based so it adapts.
4. **Very narrow viewport** (< 640px) — the date block shrinks, card column becomes full width, columns stack. Grid reduces to 1 column. Drop cap stays but size might shrink to 48px at `max-sm` breakpoint if needed during implementation polish.
5. **Deleted card after draw** — `live` is null → name/image come from `cardSnapshot`, reflection is null (editorial fallback shows). Same graceful behavior as the current implementation.
6. **Very long card names** — name wraps naturally in Playfair at 48px; if it ever exceeds two lines, acceptable.

## Verification Plan (manual)

1. Open `/carta-do-dia` on desktop → two-column layout, Playfair loaded, decorative block visible behind card.
2. Resize to mobile → date stays multi-line but smaller; card + decorative block stack; text follows; footer at the bottom.
3. Pull quote appears in Playfair italic at the top of the text column.
4. Drop cap visible on the first letter of the body.
5. Force a null reflection (temporarily unset the cached value in the DB or throw in the mock provider) → "Reflexão em preparação" fallback appears, the rest of the page renders normally.
6. Force a one-sentence reflection (edit the mock provider temporarily) → quote renders, body block does not.
7. Open `/carta-do-dia/historico/[date]` → card visibly smaller (roughly half the previous width), rest of the layout unchanged.
8. Open dashboard → widget unchanged.
9. Open `/carta-do-dia/historico` list → unchanged.
10. Throttle network → Playfair falls back to `ui-serif` until loaded (`display: swap`), no FOUT blocker.

### Notes for future automated tests

- `splitReflection` unit tests are the obvious target: null input, empty HTML, single sentence, multi-paragraph, punctuation-first, ellipsis, long sentence, only tags.
- A visual regression test would catch accidental changes to the decorative block offsets, but no such infra exists yet.
