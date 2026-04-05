# Rich Text Descriptions with Tiptap

**Date:** 2026-04-05
**Status:** Approved

## Overview

Add rich text editing (bold, italic, lists, links) to deck, card, and annotation description fields using Tiptap. Applies to both admin editing forms and public display.

## Scope

### Formatting capabilities

- Bold, italic
- Unordered and ordered lists
- Links (with href)
- No headings, blockquotes, code blocks, images, or tables

### Fields affected

| Field | Current input | Current display | Change |
|-------|--------------|----------------|--------|
| Deck description | `<Input>` single-line | Plain `<p>` | Rich text editor + viewer |
| Card description | `<textarea>` 4 rows | `<p>` whitespace-pre-wrap | Rich text editor + viewer |
| Annotation description | `<textarea>` 4 rows, 500 char limit | Tooltip/panel plain text | Rich text editor + viewer, schema limit to 2000 |

## Storage

- Description fields remain `String` in Mongoose schema
- Content stored as HTML produced by Tiptap (e.g. `<p>Texto <strong>negrito</strong></p>`)
- Annotation description `maxlength` changes from 500 to 2000 to provide ample headroom for HTML overhead (bold wrapping adds 17 chars per occurrence, list markup adds more)
- No migration script needed — backward compatibility handled at read time

## Backward Compatibility

Plain text detection at render time:
- If the string does not start with `<p>` (Tiptap always wraps in `<p>`), treat as plain text and render with `whitespace-pre-wrap`
- If the string starts with `<p>`, render as sanitized HTML via the viewer component
- Existing descriptions are naturally "migrated" when an admin edits and saves them
- The editor normalizes incoming plain text: if `content` does not contain `<`, wrap in `<p>` tags before passing to Tiptap

## New Components

### `components/ui/rich-text-editor.tsx` (Client Component)

Tiptap editor wrapper.

**Props:**
- `content: string` — initial HTML content
- `onChange: (html: string) => void` — called on content change
- `name?: string` — if provided, renders a hidden `<input>` with this name and current HTML as value (for native form submission)
- `placeholder?: string`
- `maxLength?: number` — optional character limit (counts text content, not HTML)

**Form integration:** Deck and card admin forms use native `<form action={serverAction}>`. The `name` prop renders a `<input type="hidden" name={name} value={html} />` so the HTML content is submitted via FormData without changing the existing server action pattern.

**Annotation editor integration:** The annotation editor is a client component with `useState`. Use `onChange` to sync state. Use `key={selectedAnnotationId}` to force re-initialization when switching between annotations (Tiptap does not re-render on `content` prop changes after mount).

**Tiptap extensions:**
- `StarterKit` with disabled: heading, blockquote, codeBlock, code, horizontalRule
- `Link` extension (openOnClick: false, for editing)
- `Placeholder` extension

**Toolbar:** Bold | Italic | Bullet List | Ordered List | Link

**Link UX:** Toolbar link button opens a simple prompt (`window.prompt`) for the URL. If text is selected, it becomes the link text. If no selection, the URL is inserted as both text and href. Edit/remove by clicking an existing link and using the toolbar button.

**Accessibility:** Toolbar buttons have `aria-label` and `aria-pressed` for active formatting state.

**Styling:** Tailwind classes matching shadcn/ui input styling (border, rounded, focus ring, background).

### `components/ui/rich-text-viewer.tsx` (Server-safe Component)

Renders description HTML safely.

**Props:**
- `content: string` — HTML or plain text
- `className?: string`

**Behavior:**
- If `content` does not start with `<p>`: render in `<p>` with `whitespace-pre-wrap` (plain text)
- If `content` starts with `<p>`: sanitize with `sanitize-html` and render via `dangerouslySetInnerHTML`

**Sanitization allow list:**
- Tags: `p`, `strong`, `em`, `ul`, `ol`, `li`, `a`
- Attributes: `a[href, target, rel]`
- All other tags/attributes stripped

**Styling:** Basic prose styles via Tailwind for `strong`, `em`, lists, and links within the viewer.

## Dependencies

New packages:
- `@tiptap/react` — React bindings
- `@tiptap/starter-kit` — core extensions bundle
- `@tiptap/extension-link` — link support
- `@tiptap/extension-placeholder` — placeholder text
- `@tiptap/pm` — ProseMirror peer dependency
- `sanitize-html` — HTML sanitization for viewer
- `@types/sanitize-html` — TypeScript types

## Files Modified

### Schema
- `lib/decks/model.ts` — annotation description maxlength 500 → 2000

### Admin forms (replace plain inputs with RichTextEditor)
- `app/(dashboard)/admin/decks/new/page.tsx` — deck description
- `app/(dashboard)/admin/decks/[id]/edit/page.tsx` — deck description
- `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx` — card description
- `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx` — card description
- `components/admin/annotation-editor.tsx` — annotation description

### Server actions (add server-side sanitization)
- `app/(dashboard)/admin/decks/actions.ts` — sanitize description HTML before persisting (defense-in-depth)
- `app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions.ts` — sanitize description HTML before persisting

### Public display (replace plain text with RichTextViewer)
- `app/(dashboard)/baralhos/[id]/page.tsx` — deck description
- `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx` — card description
- `components/card-annotations-viewer.tsx` — annotation description (desktop tooltip + mobile panel)

### Utilities
- `lib/html/sanitize.ts` — shared sanitize-html config (same allow list used by viewer and server actions)
- `lib/html/strip.ts` — strip HTML tags to get plain text (for annotation sidebar preview truncation, maxLength counting)

### Annotation editor internals
- `components/admin/annotation-editor.tsx` — also update the sidebar annotation list preview to strip HTML before truncating

## Out of Scope

- Image embedding in descriptions
- Markdown storage (HTML only)
- Migration script for existing data
- Dark mode styling for editor/viewer
