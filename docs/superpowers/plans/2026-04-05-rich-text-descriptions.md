# Rich Text Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tiptap rich text editing to deck, card, and annotation description fields with safe HTML rendering on the public side.

**Architecture:** Two new UI components (editor + viewer), two shared utilities (sanitize config + strip HTML), wired into existing admin forms and public display pages. HTML stored in the same String fields. Server-side sanitization for defense-in-depth.

**Tech Stack:** Tiptap (React), sanitize-html, Next.js 16 Server Components + Server Actions

**Spec:** `docs/superpowers/specs/2026-04-05-rich-text-descriptions-design.md`

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Tiptap packages**

```bash
yarn add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder @tiptap/pm
```

- [ ] **Step 2: Install sanitize-html**

```bash
yarn add sanitize-html && yarn add -D @types/sanitize-html
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock
git commit -m "chore: add tiptap and sanitize-html dependencies"
```

---

### Task 2: Shared utilities — sanitize config and strip HTML

**Files:**
- Create: `lib/html/sanitize.ts`
- Create: `lib/html/strip.ts`

Note: Cannot use `lib/utils/` as a directory because `lib/utils.ts` already exists as a file.

- [ ] **Step 1: Create sanitize-html config**

Create `lib/html/sanitize.ts`:

```typescript
import sanitize from "sanitize-html";

const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: ["p", "strong", "em", "ul", "ol", "li", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  transformTags: {
    a: sanitize.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
  },
};

export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, SANITIZE_OPTIONS);
}
```

- [ ] **Step 2: Create strip-html utility**

Create `lib/html/strip.ts`:

```typescript
/** Strip HTML tags and return plain text. Works server and client side. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/html/sanitize.ts lib/html/strip.ts
git commit -m "feat: add shared sanitize-html config and strip-html utility"
```

---

### Task 3: RichTextViewer component

**Files:**
- Create: `components/ui/rich-text-viewer.tsx`

- [ ] **Step 1: Create the viewer component**

Create `components/ui/rich-text-viewer.tsx`:

```tsx
import { sanitizeHtml } from "@/lib/html/sanitize";
import { cn } from "@/lib/utils";

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export function RichTextViewer({ content, className }: RichTextViewerProps) {
  if (!content) return null;

  // Plain text detection: Tiptap always wraps in <p>
  if (!content.startsWith("<p>") && !content.startsWith("<p ")) {
    return (
      <p className={cn("whitespace-pre-wrap", className)}>{content}</p>
    );
  }

  const clean = sanitizeHtml(content);

  return (
    <div
      className={cn(
        "[&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_p]:mb-2 [&_p:last-child]:mb-0",
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/rich-text-viewer.tsx
git commit -m "feat: add RichTextViewer component with HTML sanitization"
```

---

### Task 4: RichTextEditor component

**Files:**
- Create: `components/ui/rich-text-editor.tsx`

- [ ] **Step 1: Create the editor component**

Create `components/ui/rich-text-editor.tsx`:

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { stripHtml } from "@/lib/html/strip";

interface RichTextEditorProps {
  content: string;
  onChange?: (html: string) => void;
  name?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  name,
  placeholder,
  maxLength,
  disabled,
}: RichTextEditorProps) {
  const hiddenRef = useRef<HTMLInputElement>(null);

  // Normalize plain text to HTML for Tiptap
  const initialContent = content && !content.includes("<")
    ? `<p>${content}</p>`
    : content;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: initialContent,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      if (hiddenRef.current) hiddenRef.current.value = html;
    },
  });

  // Sync disabled state
  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const textLength = stripHtml(editor.getHTML()).length;

  const handleLink = () => {
    const existingHref = editor.getAttributes("link").href;
    if (existingHref) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("URL do link:");
    if (!url) return;
    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent(url)
        .setTextSelection({ from: editor.state.selection.from - url.length, to: editor.state.selection.from })
        .setLink({ href: url })
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const tools = [
    {
      label: "Negrito",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      icon: "B",
      className: "font-bold",
    },
    {
      label: "Itálico",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      icon: "I",
      className: "italic",
    },
    {
      label: "Lista",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      icon: "\u2022",
      className: "",
    },
    {
      label: "Lista numerada",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      icon: "1.",
      className: "",
    },
    {
      label: editor.isActive("link") ? "Remover link" : "Link",
      action: handleLink,
      active: editor.isActive("link"),
      icon: "\uD83D\uDD17",
      className: "",
    },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex gap-1 rounded-t-md border border-input bg-muted/50 px-2 py-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            aria-pressed={tool.active}
            onClick={tool.action}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-sm transition-colors hover:bg-muted",
              tool.active && "bg-muted text-foreground ring-1 ring-ring",
              tool.className
            )}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className={cn(
          "min-h-[80px] rounded-b-md border border-t-0 border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
          "focus-within:ring-1 focus-within:ring-ring",
          "[&_.tiptap]:outline-none [&_.tiptap]:min-h-[60px]",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
          "[&_.tiptap_strong]:font-semibold [&_.tiptap_em]:italic",
          "[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_li]:mt-1",
          "[&_.tiptap_a]:text-primary [&_.tiptap_a]:underline [&_.tiptap_a]:underline-offset-2",
          disabled && "pointer-events-none opacity-50"
        )}
      />

      {/* Hidden input for form submission */}
      {name && (
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          defaultValue={content}
        />
      )}

      {/* Character count */}
      {maxLength && (
        <span className="text-xs text-muted-foreground">
          {textLength}/{maxLength}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Expected: Build succeeds. The component is client-only (`"use client"`).

- [ ] **Step 3: Commit**

```bash
git add components/ui/rich-text-editor.tsx
git commit -m "feat: add RichTextEditor component with Tiptap"
```

---

### Task 5: Update Mongoose schema — annotation maxlength

**Files:**
- Modify: `lib/decks/model.ts:17`

- [ ] **Step 1: Update annotation description maxlength**

In `lib/decks/model.ts`, change line 17:

```typescript
// Before:
description: { type: String, default: "", maxlength: 500 },
// After:
description: { type: String, default: "", maxlength: 2000 },
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/decks/model.ts
git commit -m "chore: increase annotation description maxlength to 2000 for rich text"
```

---

### Task 6: Server-side sanitization in server actions

**Files:**
- Modify: `app/(dashboard)/admin/decks/actions.ts`
- Modify: `app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions.ts`

- [ ] **Step 1: Add sanitization to deck actions**

In `app/(dashboard)/admin/decks/actions.ts`, add import at the top:

```typescript
import { sanitizeHtml } from "@/lib/html/sanitize";
```

Then wrap description in each action:

In `createDeckAction` (line 46), change:
```typescript
// Before:
await createDeck({ name, description: description ?? "", type, cardAspectRatio: aspectRatio, coverImage });
// After:
await createDeck({ name, description: sanitizeHtml(description ?? ""), type, cardAspectRatio: aspectRatio, coverImage });
```

In `updateDeckAction` (line 64-65), change:
```typescript
// Before:
name, description: description ?? "", type, cardAspectRatio: aspectRatio,
// After:
name, description: sanitizeHtml(description ?? ""), type, cardAspectRatio: aspectRatio,
```

In `addCardAction` (line 109), change:
```typescript
// Before:
await addCard(deckId, { title, description: description ?? "", image: imageUrl });
// After:
await addCard(deckId, { title, description: sanitizeHtml(description ?? ""), image: imageUrl });
```

In `updateCardAction` (line 127-128), change:
```typescript
// Before:
title,
description: description ?? "",
// After:
title,
description: sanitizeHtml(description ?? ""),
```

- [ ] **Step 2: Add sanitization to annotation actions**

In `app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions.ts`, add import:

```typescript
import { sanitizeHtml } from "@/lib/html/sanitize";
```

In `createAnnotationAction` (line 25-27), change:
```typescript
// Before:
const annotation = await addAnnotation(data.deckId, data.cardId, {
  x: data.x, y: data.y, title: data.title, description: data.description,
});
// After:
const annotation = await addAnnotation(data.deckId, data.cardId, {
  x: data.x, y: data.y, title: data.title, description: sanitizeHtml(data.description),
});
```

In `updateAnnotationAction` (line 50-52), change:
```typescript
// Before:
const annotation = await updateAnnotation(data.deckId, data.cardId, data.annotationId, {
  x: data.x, y: data.y, title: data.title, description: data.description,
});
// After:
const annotation = await updateAnnotation(data.deckId, data.cardId, data.annotationId, {
  x: data.x, y: data.y, title: data.title, description: data.description ? sanitizeHtml(data.description) : data.description,
});
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/decks/actions.ts app/\(dashboard\)/admin/decks/\[id\]/cards/\[cardId\]/annotations/actions.ts
git commit -m "feat: add server-side HTML sanitization to all description server actions"
```

---

### Task 7: Wire RichTextEditor into deck admin forms

**Files:**
- Modify: `app/(dashboard)/admin/decks/new/page.tsx`
- Modify: `app/(dashboard)/admin/decks/[id]/edit/page.tsx`

These are Server Components using native `<form action>`. The `RichTextEditor` uses the `name` prop to render a hidden input.

**Important:** Since `RichTextEditor` is a Client Component, it can be used inside a Server Component as a leaf. No need to convert the page.

- [ ] **Step 1: Update new deck page**

In `app/(dashboard)/admin/decks/new/page.tsx`:

Add import:
```typescript
import { RichTextEditor } from "@/components/ui/rich-text-editor";
```

Replace the description field (lines 32-35):
```tsx
{/* Before: */}
<div className="space-y-2">
  <Label htmlFor="description">Descrição</Label>
  <Input id="description" name="description" />
</div>

{/* After: */}
<div className="space-y-2">
  <Label>Descrição</Label>
  <RichTextEditor content="" name="description" placeholder="Descrição do baralho" />
</div>
```

Remove `Input` from imports if no longer used (still used for `name` field — keep it).

- [ ] **Step 2: Update edit deck page**

In `app/(dashboard)/admin/decks/[id]/edit/page.tsx`:

Add import:
```typescript
import { RichTextEditor } from "@/components/ui/rich-text-editor";
```

Replace the description field (lines 46-49):
```tsx
{/* Before: */}
<div className="space-y-2">
  <Label htmlFor="description">Descrição</Label>
  <Input id="description" name="description" defaultValue={deck.description} />
</div>

{/* After: */}
<div className="space-y-2">
  <Label>Descrição</Label>
  <RichTextEditor content={deck.description} name="description" placeholder="Descrição do baralho" />
</div>
```

- [ ] **Step 3: Verify build and test manually**

```bash
yarn build
```

Then `yarn dev` and test creating/editing a deck. The description should show the rich text toolbar. Submitting the form should persist the HTML.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/decks/new/page.tsx app/\(dashboard\)/admin/decks/\[id\]/edit/page.tsx
git commit -m "feat: use RichTextEditor in deck admin forms"
```

---

### Task 8: Wire RichTextEditor into card admin forms

**Files:**
- Modify: `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx`
- Modify: `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx`

Same pattern as Task 7 — Server Components with `name` prop.

- [ ] **Step 1: Update new card page**

In `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx`:

Add import:
```typescript
import { RichTextEditor } from "@/components/ui/rich-text-editor";
```

Replace the description field (lines 44-51):
```tsx
{/* Before: */}
<div className="space-y-2">
  <Label htmlFor="description">Descrição</Label>
  <textarea
    id="description"
    name="description"
    rows={4}
    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  />
</div>

{/* After: */}
<div className="space-y-2">
  <Label>Descrição</Label>
  <RichTextEditor content="" name="description" placeholder="Descrição da carta" />
</div>
```

- [ ] **Step 2: Update edit card page**

In `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx`:

Add import:
```typescript
import { RichTextEditor } from "@/components/ui/rich-text-editor";
```

Replace the description field (lines 56-64):
```tsx
{/* Before: */}
<div className="space-y-2">
  <Label htmlFor="description">Descrição</Label>
  <textarea
    id="description"
    name="description"
    defaultValue={card.description}
    rows={4}
    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  />
</div>

{/* After: */}
<div className="space-y-2">
  <Label>Descrição</Label>
  <RichTextEditor content={card.description} name="description" placeholder="Descrição da carta" />
</div>
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/decks/\[id\]/cards/new/page.tsx app/\(dashboard\)/admin/decks/\[id\]/cards/\[cardId\]/edit/page.tsx
git commit -m "feat: use RichTextEditor in card admin forms"
```

---

### Task 9: Wire RichTextEditor into annotation editor

**Files:**
- Modify: `components/admin/annotation-editor.tsx`

The annotation editor is already a Client Component with `useState` for `description`. Replace the `<textarea>` with `RichTextEditor` using `onChange` to sync state. Use `key` to force re-initialization when switching annotations.

- [ ] **Step 1: Add imports**

In `components/admin/annotation-editor.tsx`, add:

```typescript
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { stripHtml } from "@/lib/html/strip";
```

- [ ] **Step 2: Replace textarea in the form section**

Replace lines 331-346 (the description textarea block):

```tsx
{/* Before: */}
<div className="space-y-1.5">
  <Label htmlFor="ann-description">Descrição</Label>
  <textarea
    id="ann-description"
    value={description}
    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
    placeholder="Descrição da anotação"
    maxLength={500}
    rows={4}
    disabled={isPending}
    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  />
  <span className="text-xs text-muted-foreground">
    {description.length}/500
  </span>
</div>

{/* After: */}
<div className="space-y-1.5">
  <Label>Descrição</Label>
  <RichTextEditor
    key={selectedId ?? (pendingCoords ? `${pendingCoords.x}-${pendingCoords.y}` : "new")}
    content={description}
    onChange={setDescription}
    placeholder="Descrição da anotação"
    maxLength={1000}
    disabled={isPending}
  />
</div>
```

- [ ] **Step 3: Update sidebar annotation list preview to strip HTML**

Replace line 424-426 (the description preview in the annotation list):

```tsx
{/* Before: */}
{annotation.description && (
  <p className="mt-0.5 truncate text-xs text-muted-foreground">
    {annotation.description}
  </p>
)}

{/* After: */}
{annotation.description && (
  <p className="mt-0.5 truncate text-xs text-muted-foreground">
    {stripHtml(annotation.description)}
  </p>
)}
```

- [ ] **Step 4: Remove the `.trim()` call on description in handleCreate and handleUpdate**

Rich text HTML should not be trimmed — it would break tags. Update:

In `handleCreate` (line 145):
```typescript
// Before:
description: description.trim(),
// After:
description,
```

In `handleUpdate` (line 178):
```typescript
// Before:
description: description.trim(),
// After:
description,
```

Also in `handleUpdate` state update (line 184):
```typescript
// Before:
? { ...a, title: title.trim(), description: description.trim() }
// After:
? { ...a, title: title.trim(), description }
```

- [ ] **Step 5: Verify build**

```bash
yarn build
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/annotation-editor.tsx
git commit -m "feat: use RichTextEditor in annotation editor with HTML-aware preview"
```

---

### Task 10: Wire RichTextViewer into public display pages

**Files:**
- Modify: `app/(dashboard)/baralhos/[id]/page.tsx`
- Modify: `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx`
- Modify: `components/card-annotations-viewer.tsx`

- [ ] **Step 1: Update deck detail page**

In `app/(dashboard)/baralhos/[id]/page.tsx`:

Add import:
```typescript
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
```

Replace lines 28-30:
```tsx
{/* Before: */}
{deck.description && (
  <p className="text-muted-foreground">{deck.description}</p>
)}

{/* After: */}
{deck.description && (
  <RichTextViewer content={deck.description} className="text-muted-foreground" />
)}
```

- [ ] **Step 2: Update card detail page**

In `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx`:

Add import:
```typescript
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
```

Replace lines 69-73:
```tsx
{/* Before: */}
{card.description && (
  <p className="text-muted-foreground text-center whitespace-pre-wrap">
    {card.description}
  </p>
)}

{/* After: */}
{card.description && (
  <RichTextViewer content={card.description} className="text-muted-foreground text-center" />
)}
```

- [ ] **Step 3: Update annotations viewer — desktop tooltips**

In `components/card-annotations-viewer.tsx`:

Add import:
```typescript
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
```

Replace left column tooltip (lines 187-190):
```tsx
{/* Before: */}
{activeId === ann._id && ann.description && (
  <span className="mt-1 block rounded bg-gray-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-lg">
    {ann.description}
  </span>
)}

{/* After: */}
{activeId === ann._id && ann.description && (
  <span className="mt-1 block rounded bg-gray-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-lg">
    <RichTextViewer content={ann.description} className="[&_p]:mb-1 [&_p:last-child]:mb-0" />
  </span>
)}
```

Replace right column tooltip (lines 254-257) with the same pattern:
```tsx
{/* Before: */}
{activeId === ann._id && ann.description && (
  <span className="mt-1 block rounded bg-gray-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-lg">
    {ann.description}
  </span>
)}

{/* After: */}
{activeId === ann._id && ann.description && (
  <span className="mt-1 block rounded bg-gray-900 px-2 py-1 text-left text-[11px] font-normal leading-snug text-white shadow-lg">
    <RichTextViewer content={ann.description} className="[&_p]:mb-1 [&_p:last-child]:mb-0" />
  </span>
)}
```

- [ ] **Step 4: Update annotations viewer — mobile panel**

Replace the mobile description (lines 346-349):
```tsx
{/* Before: */}
{ann.description && (
  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
    {ann.description}
  </p>
)}

{/* After: */}
{ann.description && (
  <RichTextViewer content={ann.description} className="mt-1 text-sm text-muted-foreground" />
)}
```

- [ ] **Step 5: Verify build**

```bash
yarn build
```

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/baralhos/\[id\]/page.tsx app/\(dashboard\)/baralhos/\[id\]/carta/\[cardId\]/page.tsx components/card-annotations-viewer.tsx
git commit -m "feat: use RichTextViewer in all public description displays"
```

---

### Task 11: Lint check and final verification

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
1. Create a new deck with rich text description (bold, italic, list) — saves correctly
2. Edit an existing deck — description loads in editor, edits persist
3. Create/edit a card with rich text description — saves and displays correctly
4. Create/edit an annotation with rich text — saves, displays in tooltip and mobile panel
5. Existing plain text descriptions render correctly (backward compat)

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "fix: resolve lint issues from rich text integration"
```
