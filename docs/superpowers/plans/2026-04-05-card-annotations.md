# Card Annotations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add interactive annotations on card images — admin CRUD (click to place, edit, delete) and public visualization with connector lines (desktop) and numbered dots (mobile).

**Architecture:** Annotations are subdocuments within the Card subdocument (nested in Deck). Admin editor is a Client Component with click-to-place interaction. Public viewer is a Client Component with SVG lines (desktop) and numbered dots with modal (mobile). Service layer handles CRUD via Mongoose subdocument operations.

**Tech Stack:** Next.js 16, React 19, Mongoose, Tailwind CSS 4, SVG for connector lines

**Next.js 16:** `params` is async — always `await` it.

---

## File Map

```
lib/decks/
  model.ts                                          # Modify: add Annotation schema
  service.ts                                        # Modify: add annotation CRUD functions

components/
  admin/
    annotation-editor.tsx                           # Create: Client Component — admin CRUD
  card-annotations-viewer.tsx                       # Create: Client Component — public view

app/(dashboard)/
  admin/decks/[id]/cards/[cardId]/
    edit/page.tsx                                   # Modify: add "Anotações" link
    annotations/
      page.tsx                                      # Create: admin annotations page
      actions.ts                                    # Create: server actions
  baralhos/[id]/carta/[cardId]/
    page.tsx                                        # Modify: render annotations viewer
```

---

### Task 1: Add Annotation Schema to Model + Service Functions

**Files:**
- Modify: `lib/decks/model.ts`
- Modify: `lib/decks/service.ts`

- [ ] **Step 1: Add Annotation interface and schema to `lib/decks/model.ts`**

Add before the `ICard` interface:

```typescript
export interface IAnnotation {
  _id: mongoose.Types.ObjectId;
  x: number;
  y: number;
  title: string;
  description: string;
  order: number;
}

const AnnotationSchema = new Schema<IAnnotation>({
  x: { type: Number, required: true, min: 0, max: 100 },
  y: { type: Number, required: true, min: 0, max: 100 },
  title: { type: String, required: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 500 },
  order: { type: Number, required: true, default: 0 },
});
```

Add `annotations` field to `ICard` interface:

```typescript
export interface ICard extends mongoose.Document {
  ...existing fields
  annotations: IAnnotation[];
}
```

Add to `CardSchema`:

```typescript
annotations: { type: [AnnotationSchema], default: [] },
```

- [ ] **Step 2: Add annotation CRUD functions to `lib/decks/service.ts`**

```typescript
import type { IDeck, ICard, IAnnotation } from "./model";

export async function addAnnotation(
  deckId: string,
  cardId: string,
  data: { x: number; y: number; title: string; description: string }
): Promise<IAnnotation> {
  await connectDB();
  if (data.x < 0 || data.x > 100 || data.y < 0 || data.y > 100) {
    throw new Error("Coordenadas devem estar entre 0 e 100");
  }
  if (data.title.length > 80) throw new Error("Título máximo 80 caracteres");
  if (data.description.length > 500) throw new Error("Descrição máxima 500 caracteres");

  const deck = await Deck.findById(deckId);
  if (!deck) throw new Error("Deck não encontrado");

  const card = deck.cards.id(cardId);
  if (!card) throw new Error("Carta não encontrada");

  const maxOrder = card.annotations?.reduce((max: number, a: IAnnotation) => Math.max(max, a.order), -1) ?? -1;
  card.annotations.push({ ...data, order: maxOrder + 1 } as IAnnotation);
  await deck.save();

  return card.annotations[card.annotations.length - 1].toObject();
}

export async function updateAnnotation(
  deckId: string,
  cardId: string,
  annotationId: string,
  data: { x?: number; y?: number; title?: string; description?: string }
): Promise<IAnnotation | null> {
  await connectDB();
  if (data.x !== undefined && (data.x < 0 || data.x > 100)) {
    throw new Error("Coordenadas devem estar entre 0 e 100");
  }
  if (data.y !== undefined && (data.y < 0 || data.y > 100)) {
    throw new Error("Coordenadas devem estar entre 0 e 100");
  }
  if (data.title !== undefined && data.title.length > 80) throw new Error("Título máximo 80 caracteres");
  if (data.description !== undefined && data.description.length > 500) throw new Error("Descrição máxima 500 caracteres");

  const deck = await Deck.findById(deckId);
  if (!deck) return null;

  const card = deck.cards.id(cardId);
  if (!card) return null;

  const annotation = card.annotations.id(annotationId);
  if (!annotation) return null;

  if (data.x !== undefined) annotation.x = data.x;
  if (data.y !== undefined) annotation.y = data.y;
  if (data.title !== undefined) annotation.title = data.title;
  if (data.description !== undefined) annotation.description = data.description;

  await deck.save();
  return annotation.toObject();
}

export async function deleteAnnotation(
  deckId: string,
  cardId: string,
  annotationId: string
): Promise<boolean> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) return false;

  const card = deck.cards.id(cardId);
  if (!card) return false;

  const annotation = card.annotations.id(annotationId);
  if (!annotation) return false;

  annotation.deleteOne();
  await deck.save();
  return true;
}
```

Note: `card.annotations` needs to be a Mongoose DocumentArray for `.id()` to work. The ICard interface already extends `mongoose.Document`, and since annotations is defined as `[AnnotationSchema]`, Mongoose handles this automatically.

- [ ] **Step 3: Verify:** `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add lib/decks/model.ts lib/decks/service.ts
git commit -m "feat: add Annotation subdocument schema and service CRUD functions"
```

---

### Task 2: Server Actions for Annotations

**Files:**
- Create: `app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions.ts`

- [ ] **Step 1: Create server actions**

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { addAnnotation, updateAnnotation, deleteAnnotation } from "@/lib/decks/service";
import { revalidatePath } from "next/cache";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function createAnnotationAction(data: {
  deckId: string;
  cardId: string;
  x: number;
  y: number;
  title: string;
  description: string;
}) {
  await requireDecksPermission();
  const annotation = await addAnnotation(data.deckId, data.cardId, {
    x: data.x,
    y: data.y,
    title: data.title,
    description: data.description,
  });
  revalidatePath(`/admin/decks/${data.deckId}/cards/${data.cardId}/annotations`);
  return annotation;
}

export async function updateAnnotationAction(data: {
  deckId: string;
  cardId: string;
  annotationId: string;
  x?: number;
  y?: number;
  title?: string;
  description?: string;
}) {
  await requireDecksPermission();
  const annotation = await updateAnnotation(data.deckId, data.cardId, data.annotationId, {
    x: data.x,
    y: data.y,
    title: data.title,
    description: data.description,
  });
  revalidatePath(`/admin/decks/${data.deckId}/cards/${data.cardId}/annotations`);
  return annotation;
}

export async function deleteAnnotationAction(data: {
  deckId: string;
  cardId: string;
  annotationId: string;
}) {
  await requireDecksPermission();
  await deleteAnnotation(data.deckId, data.cardId, data.annotationId);
  revalidatePath(`/admin/decks/${data.deckId}/cards/${data.cardId}/annotations`);
}
```

Note: These actions use plain objects instead of FormData because the annotation editor Client Component will call them directly via `useTransition` / `startTransition`. Using `revalidatePath` instead of `redirect` so the editor stays on the page after CRUD operations.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/admin/decks/\[id\]/cards/\[cardId\]/annotations/
git commit -m "feat: add server actions for annotation CRUD"
```

---

### Task 3: Admin Annotation Editor Component

**Files:**
- Create: `components/admin/annotation-editor.tsx`

- [ ] **Step 1: Create the annotation editor Client Component**

This is the most complex component. It must:
1. Display the card image in a relative container
2. Render existing annotations as red dots at (x%, y%)
3. On click on the image (not on existing dot): enter "create" mode — show new dot + form
4. On click on existing dot: enter "edit" mode — populate form with annotation data
5. Form: title input (max 80), description textarea (max 500), Save/Cancel buttons
6. Edit mode has: "Reposicionar" button (re-enter click mode to pick new coords) + "Remover" button with confirm
7. Calls server actions directly (createAnnotationAction, updateAnnotationAction, deleteAnnotationAction)
8. After save/delete: refresh annotations from the server action response

```tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createAnnotationAction,
  updateAnnotationAction,
  deleteAnnotationAction,
} from "@/app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions";

interface Annotation {
  _id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  order: number;
}

interface AnnotationEditorProps {
  deckId: string;
  cardId: string;
  cardImage: string;
  cardAspectRatio: string;
  initialAnnotations: Annotation[];
}

type Mode = "idle" | "creating" | "editing" | "repositioning";

export function AnnotationEditor({
  deckId,
  cardId,
  cardImage,
  cardAspectRatio,
  initialAnnotations,
}: AnnotationEditorProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [mode, setMode] = useState<Mode>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPoint, setNewPoint] = useState<{ x: number; y: number } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const imageRef = useRef<HTMLDivElement>(null);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "idle" && mode !== "creating" && mode !== "repositioning") return;

    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (mode === "repositioning" && selectedId) {
      // Update position of existing annotation
      startTransition(async () => {
        const result = await updateAnnotationAction({
          deckId, cardId, annotationId: selectedId, x, y,
        });
        if (result) {
          setAnnotations((prev) =>
            prev.map((a) => (a._id === selectedId ? { ...a, x, y } : a))
          );
        }
        setMode("editing");
      });
      return;
    }

    // Create mode
    setNewPoint({ x, y });
    setTitle("");
    setDescription("");
    setMode("creating");
    setSelectedId(null);
  }

  function handleDotClick(annotation: Annotation) {
    if (mode === "repositioning") return;
    setSelectedId(annotation._id);
    setTitle(annotation.title);
    setDescription(annotation.description);
    setMode("editing");
    setNewPoint(null);
  }

  function handleSave() {
    if (mode === "creating" && newPoint) {
      startTransition(async () => {
        const result = await createAnnotationAction({
          deckId, cardId, x: newPoint.x, y: newPoint.y, title, description,
        });
        setAnnotations((prev) => [...prev, {
          _id: result._id.toString(),
          x: result.x,
          y: result.y,
          title: result.title,
          description: result.description,
          order: result.order,
        }]);
        resetForm();
      });
    } else if (mode === "editing" && selectedId) {
      startTransition(async () => {
        await updateAnnotationAction({
          deckId, cardId, annotationId: selectedId, title, description,
        });
        setAnnotations((prev) =>
          prev.map((a) => (a._id === selectedId ? { ...a, title, description } : a))
        );
        resetForm();
      });
    }
  }

  function handleDelete() {
    if (!selectedId) return;
    if (!confirm("Tem certeza que deseja remover esta anotação?")) return;

    startTransition(async () => {
      await deleteAnnotationAction({ deckId, cardId, annotationId: selectedId });
      setAnnotations((prev) => prev.filter((a) => a._id !== selectedId));
      resetForm();
    });
  }

  function resetForm() {
    setMode("idle");
    setSelectedId(null);
    setNewPoint(null);
    setTitle("");
    setDescription("");
  }

  const [rw, rh] = cardAspectRatio.split("/").map(Number);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Image with annotation points */}
      <div className="flex-1">
        <div
          ref={imageRef}
          className="relative cursor-crosshair rounded-lg overflow-hidden border border-border bg-muted"
          style={{ aspectRatio: `${rw}/${rh}` }}
          onClick={handleImageClick}
        >
          <img src={cardImage} alt="Carta" className="w-full h-full object-contain" />

          {/* Existing annotation dots */}
          {annotations.map((a) => (
            <button
              key={a._id}
              className={`absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white z-10 transition-transform hover:scale-125 ${
                selectedId === a._id ? "bg-primary ring-2 ring-primary" : "bg-red-500"
              }`}
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                handleDotClick(a);
              }}
              title={a.title}
            />
          ))}

          {/* New point being created */}
          {newPoint && mode === "creating" && (
            <div
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-green-500 z-10 animate-pulse"
              style={{ left: `${newPoint.x}%`, top: `${newPoint.y}%` }}
            />
          )}

          {mode === "idle" && (
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
              <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                Clique na imagem para adicionar uma anotação
              </span>
            </div>
          )}

          {mode === "repositioning" && (
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
              <span className="bg-primary/80 text-primary-foreground text-xs px-3 py-1 rounded-full">
                Clique na nova posição
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Form panel */}
      {(mode === "creating" || mode === "editing") && (
        <div className="w-full lg:w-80 space-y-4 rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground">
            {mode === "creating" ? "Nova Anotação" : "Editar Anotação"}
          </h3>
          <div className="space-y-2">
            <Label htmlFor="anno-title">Título</Label>
            <Input
              id="anno-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              required
            />
            <p className="text-xs text-muted-foreground">{title.length}/80</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="anno-desc">Descrição</Label>
            <textarea
              id="anno-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{description.length}/500</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending || !title.trim()}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
          {mode === "editing" && (
            <div className="flex gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode("repositioning")}
              >
                Reposicionar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                Remover
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Annotation list (when idle) */}
      {mode === "idle" && annotations.length > 0 && (
        <div className="w-full lg:w-80 space-y-2 rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground">Anotações ({annotations.length})</h3>
          {annotations.sort((a, b) => a.order - b.order).map((a) => (
            <button
              key={a._id}
              onClick={() => handleDotClick(a)}
              className="w-full text-left rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <span className="font-medium">{a.title}</span>
              {a.description && (
                <span className="block text-xs text-muted-foreground truncate">{a.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

IMPORTANT: The import path for server actions uses the `@/app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions` path. This may not work because Next.js route segments with brackets are not valid import paths. The implementer should either:
1. Move the actions import to be passed as props from the page (recommended)
2. Or use a wrapper approach where the page passes bound action functions as props

The recommended pattern: the admin page imports the actions and passes them as props to the editor component. Update the component to receive action functions as props instead of importing them directly.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/admin/annotation-editor.tsx
git commit -m "feat: add AnnotationEditor client component for admin CRUD"
```

---

### Task 4: Admin Annotations Page

**Files:**
- Create: `app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/page.tsx`
- Modify: `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx`

- [ ] **Step 1: Create the annotations admin page**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { AnnotationEditor } from "@/components/admin/annotation-editor";
import {
  createAnnotationAction,
  updateAnnotationAction,
  deleteAnnotationAction,
} from "./actions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function AnnotationsPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id, cardId } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const card = deck.cards.find((c) => c._id.toString() === cardId);
  if (!card) notFound();

  const annotations = (card.annotations ?? []).map((a) => ({
    _id: a._id.toString(),
    x: a.x,
    y: a.y,
    title: a.title,
    description: a.description,
    order: a.order,
  }));

  return (
    <div className="space-y-4">
      <Link
        href={`/admin/decks/${id}/cards/${cardId}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar para edição da carta
      </Link>

      <h1 className="text-xl font-semibold text-foreground">
        Anotações — {card.title}
      </h1>

      <AnnotationEditor
        deckId={id}
        cardId={cardId}
        cardImage={card.image}
        cardAspectRatio={deck.cardAspectRatio}
        initialAnnotations={annotations}
        createAction={createAnnotationAction}
        updateAction={updateAnnotationAction}
        deleteAction={deleteAnnotationAction}
      />
    </div>
  );
}
```

Note: The page passes server actions as props to the Client Component. The `AnnotationEditor` component should accept these as props instead of importing actions directly. The implementer needs to adjust the AnnotationEditor interface to accept:

```typescript
createAction: typeof createAnnotationAction;
updateAction: typeof updateAnnotationAction;
deleteAction: typeof deleteAnnotationAction;
```

- [ ] **Step 2: Add "Anotações" link to card edit page**

In `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx`, add a link to the annotations page after the form or near the title:

```tsx
<Link
  href={`/admin/decks/${id}/cards/${cardId}/annotations`}
  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
>
  Gerenciar Anotações ({card.annotations?.length ?? 0})
</Link>
```

- [ ] **Step 3: Verify:** `yarn build`

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/decks/\[id\]/cards/\[cardId\]/annotations/ app/\(dashboard\)/admin/decks/\[id\]/cards/\[cardId\]/edit/page.tsx
git commit -m "feat: add admin annotations page with link from card edit"
```

---

### Task 5: Public Annotations Viewer Component

**Files:**
- Create: `components/card-annotations-viewer.tsx`

- [ ] **Step 1: Create the annotations viewer Client Component**

This component handles:
- **Desktop (≥ 768px):** card image centered, dots on image, titles distributed around card with SVG connector lines, hover/click shows description tooltip
- **Mobile (< 768px):** card image, numbered dots on image, click opens modal below with title + description

```tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface Annotation {
  _id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  order: number;
}

interface CardAnnotationsViewerProps {
  image: string;
  aspectRatio: string;
  annotations: Annotation[];
}

export function CardAnnotationsViewer({
  image,
  aspectRatio,
  annotations,
}: CardAnnotationsViewerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const sorted = [...annotations].sort((a, b) => a.order - b.order);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const active = sorted.find((a) => a._id === activeId);

  if (sorted.length === 0) return null;

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Image with numbered dots */}
        <div ref={containerRef} className="relative" style={{ aspectRatio }}>
          <img src={image} alt="" className="w-full h-full object-contain" />
          {sorted.map((a, i) => (
            <button
              key={a._id}
              className={`absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs font-bold border-2 border-white z-10 transition-transform ${
                activeId === a._id
                  ? "bg-primary text-primary-foreground scale-125"
                  : "bg-red-500 text-white"
              }`}
              style={{ left: `${a.x}%`, top: `${a.y}%` }}
              onClick={() => setActiveId(activeId === a._id ? null : a._id)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Mobile modal/tooltip */}
        {active && (
          <div className="rounded-lg border border-border bg-card p-4 shadow-md">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-foreground">{active.title}</h3>
              <button
                onClick={() => setActiveId(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>
            {active.description && (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {active.description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Desktop: titles around card with SVG lines
  // Distribute titles: left half points → left side, right half → right side
  const leftAnnotations = sorted.filter((a) => a.x <= 50);
  const rightAnnotations = sorted.filter((a) => a.x > 50);

  const TITLE_MARGIN = 180; // px from card edge to title
  const TITLE_HEIGHT = 36; // estimated height per title item
  const TITLE_GAP = 8;

  function distributeVertically(items: Annotation[], containerHeight: number) {
    const totalHeight = items.length * TITLE_HEIGHT + (items.length - 1) * TITLE_GAP;
    const startY = Math.max(0, (containerHeight - totalHeight) / 2);
    return items.map((item, i) => ({
      ...item,
      titleY: startY + i * (TITLE_HEIGHT + TITLE_GAP),
    }));
  }

  const cHeight = containerRect?.height ?? 400;
  const cWidth = containerRect?.width ?? 300;
  const leftDistributed = distributeVertically(leftAnnotations, cHeight);
  const rightDistributed = distributeVertically(rightAnnotations, cHeight);

  return (
    <div className="relative" style={{ padding: `0 ${TITLE_MARGIN + 20}px` }}>
      {/* SVG overlay for lines */}
      <svg
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: "100%", height: "100%" }}
      >
        {[...leftDistributed, ...rightDistributed].map((a) => {
          const dotX = TITLE_MARGIN + 20 + (a.x / 100) * cWidth;
          const dotY = (a.y / 100) * cHeight;
          const isLeft = a.x <= 50;
          const titleX = isLeft ? TITLE_MARGIN : TITLE_MARGIN + 20 + cWidth + 20;
          const titleY = a.titleY + TITLE_HEIGHT / 2;

          return (
            <line
              key={a._id}
              x1={dotX}
              y1={dotY}
              x2={titleX}
              y2={titleY}
              stroke={activeId === a._id ? "var(--primary)" : "var(--muted-foreground)"}
              strokeWidth={activeId === a._id ? 2 : 1}
              opacity={activeId === a._id ? 1 : 0.4}
              className="transition-all"
            />
          );
        })}
      </svg>

      {/* Card image */}
      <div ref={containerRef} className="relative z-20" style={{ aspectRatio }}>
        <img src={image} alt="" className="w-full h-full object-contain rounded-lg" />
        {sorted.map((a) => (
          <div
            key={a._id}
            className={`absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${
              activeId === a._id ? "bg-primary" : "bg-red-500"
            }`}
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          />
        ))}
      </div>

      {/* Left titles */}
      <div className="absolute left-0 top-0 z-30" style={{ width: TITLE_MARGIN }}>
        {leftDistributed.map((a) => (
          <div
            key={a._id}
            className="absolute right-0"
            style={{ top: a.titleY }}
          >
            <button
              className={`text-right text-sm px-2 py-1 rounded transition-colors ${
                activeId === a._id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onMouseEnter={() => setActiveId(a._id)}
              onMouseLeave={() => setActiveId(null)}
              onClick={() => setActiveId(activeId === a._id ? null : a._id)}
            >
              {a.title}
            </button>
            {activeId === a._id && a.description && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md bg-foreground text-background p-2 text-xs shadow-lg z-40">
                {a.description}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right titles */}
      <div className="absolute right-0 top-0 z-30" style={{ width: TITLE_MARGIN }}>
        {rightDistributed.map((a) => (
          <div
            key={a._id}
            className="absolute left-0"
            style={{ top: a.titleY }}
          >
            <button
              className={`text-left text-sm px-2 py-1 rounded transition-colors ${
                activeId === a._id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onMouseEnter={() => setActiveId(a._id)}
              onMouseLeave={() => setActiveId(null)}
              onClick={() => setActiveId(activeId === a._id ? null : a._id)}
            >
              {a.title}
            </button>
            {activeId === a._id && a.description && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-md bg-foreground text-background p-2 text-xs shadow-lg z-40">
                {a.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

IMPORTANT: The SVG line positioning relies on the container dimensions from ResizeObserver. The implementer should test that the lines connect properly at various viewport sizes. The line calculation may need adjustment — the code above is a starting point that the implementer should refine during visual testing. The key principle: dot position = (percentage * containerWidth, percentage * containerHeight), title position is distributed vertically on each side.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/card-annotations-viewer.tsx
git commit -m "feat: add CardAnnotationsViewer with desktop lines and mobile numbered dots"
```

---

### Task 6: Integrate Viewer into Public Card Detail Page

**Files:**
- Modify: `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx`

- [ ] **Step 1: Import and render the annotations viewer**

In the card detail page, after the card image section and before the description, add the annotations viewer. The component replaces the standalone image display when annotations exist.

The page already has `getCardFromDeck` which returns the card with annotations. Pass the annotations to the viewer:

```tsx
import { CardAnnotationsViewer } from "@/components/card-annotations-viewer";

// In the component, after getting card data:
const annotations = (card.annotations ?? []).map((a: any) => ({
  _id: a._id.toString(),
  x: a.x,
  y: a.y,
  title: a.title,
  description: a.description,
  order: a.order,
}));

const hasAnnotations = annotations.length > 0;
```

If card has annotations, render the viewer instead of the plain image:

```tsx
{hasAnnotations ? (
  <CardAnnotationsViewer
    image={card.image}
    aspectRatio={parseAspectRatio(deck.cardAspectRatio).cssValue}
    annotations={annotations}
  />
) : (
  // existing plain image display
)}
```

- [ ] **Step 2: Update page title mapping**

In `components/dashboard/page-title.tsx`, add:

```typescript
if (/^\/admin\/decks\/[^/]+\/cards\/[^/]+\/annotations$/.test(pathname)) return "Anotações";
```

- [ ] **Step 3: Verify:** `yarn build`

- [ ] **Step 4: Test manually**

1. Create annotations on a card via admin
2. View the card on `/baralhos/[id]/carta/[cardId]`
3. Desktop: should see dots on image, titles around card, lines connecting them
4. Mobile viewport: should see numbered dots, click opens modal

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/baralhos/\[id\]/carta/\[cardId\]/page.tsx components/dashboard/page-title.tsx
git commit -m "feat: integrate annotations viewer into public card detail page"
```

---

### Task 7: Final Cleanup + Lint + Build

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Fix any errors.

- [ ] **Step 2: Run build**

```bash
yarn build
```

Fix any errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address lint and build issues"
```

---

## Completion Checklist

After all tasks are done, verify:

- [ ] `yarn build` succeeds
- [ ] `yarn lint` passes (warnings for `<img>` are expected)
- [ ] Annotation schema has validation (x/y 0-100, title max 80, description max 500)
- [ ] Admin can create annotation by clicking on card image
- [ ] Admin can edit annotation title/description
- [ ] Admin can reposition annotation by clicking "Reposicionar" then new point
- [ ] Admin can delete annotation with confirmation
- [ ] Card edit page has link to "Anotações" with count
- [ ] Public card detail shows annotations when present
- [ ] Desktop: dots on image, titles around card, SVG lines connecting them
- [ ] Desktop: hover on title highlights line + shows description tooltip
- [ ] Mobile: numbered dots on image, click opens modal with title + description
- [ ] Card without annotations still displays normally (no viewer rendered)
- [ ] All UI text in Portuguese
