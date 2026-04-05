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
| Annotation description | `<textarea>` 4 rows, 500 char limit | Tooltip/panel plain text | Rich text editor + viewer, limit to 1000 |

## Storage

- Description fields remain `String` in Mongoose schema
- Content stored as HTML produced by Tiptap (e.g. `<p>Texto <strong>negrito</strong></p>`)
- Annotation description `maxlength` changes from 500 to 1000 to accommodate HTML overhead
- No migration script needed — backward compatibility handled at read time

## Backward Compatibility

Plain text detection at render time:
- If the string does not contain `<`, render inside a `<p>` with `whitespace-pre-wrap` (current behavior)
- If the string contains `<`, render as sanitized HTML via the viewer component
- Existing descriptions are naturally "migrated" when an admin edits and saves them

## New Components

### `components/ui/rich-text-editor.tsx` (Client Component)

Tiptap editor wrapper.

**Props:**
- `content: string` — initial HTML content
- `onChange: (html: string) => void` — called on content change
- `placeholder?: string`
- `maxLength?: number` — optional character limit (counts text content, not HTML)

**Tiptap extensions:**
- `StarterKit` with disabled: heading, blockquote, codeBlock, code, horizontalRule
- `Link` extension (openOnClick: false, for editing)
- `Placeholder` extension

**Toolbar:** Bold | Italic | Bullet List | Ordered List | Link

**Styling:** Tailwind classes matching shadcn/ui input styling (border, rounded, focus ring, background).

### `components/ui/rich-text-viewer.tsx` (Server-safe Component)

Renders description HTML safely.

**Props:**
- `content: string` — HTML or plain text
- `className?: string`

**Behavior:**
- If `content` does not contain `<`: render in `<p>` with `whitespace-pre-wrap`
- If `content` contains `<`: sanitize with `sanitize-html` and render via `dangerouslySetInnerHTML`

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
- `lib/decks/model.ts` — annotation description maxlength 500 → 1000

### Admin forms (replace plain inputs with RichTextEditor)
- `app/(dashboard)/admin/decks/new/page.tsx` — deck description
- `app/(dashboard)/admin/decks/[id]/edit/page.tsx` — deck description
- `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx` — card description
- `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx` — card description
- `components/admin/annotation-editor.tsx` — annotation description

### Server actions
- `app/(dashboard)/admin/decks/actions.ts` — no change needed (already passes string through)
- `app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions.ts` — no change needed

### Public display (replace plain text with RichTextViewer)
- `app/(dashboard)/baralhos/[id]/page.tsx` — deck description
- `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx` — card description
- `components/card-annotations-viewer.tsx` — annotation description (desktop tooltip + mobile panel)

## Out of Scope

- Image embedding in descriptions
- Markdown storage (HTML only)
- Migration script for existing data
- Dark mode styling for editor/viewer
