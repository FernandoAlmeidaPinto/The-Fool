# Card Annotations Design

**Date:** 2026-04-05
**Status:** Draft
**Scope:** Interactive annotations on card images — admin CRUD, public visualization (desktop + mobile)
**Depends on:** Decks & Cards (sub-project 1)
**Sub-project:** 2 of 2

---

## Overview

Admin creates annotations on card images by clicking points on the card. Each annotation has coordinates (percentage-based), a title, and a description. On the public card detail page, annotations are rendered as points on the image with connector lines to titles distributed around the card. Hover/click on a title reveals the description. Mobile uses numbered dots with a modal.

## 1. Data Model

### Annotation (subdocument within Card)

```
Annotation {
  _id: ObjectId
  x: number           // horizontal position in % (0-100)
  y: number           // vertical position in % (0-100)
  title: string       // "A Trouxa", "O Precipício"
  description: string // descriptive text
  order: number       // display order (used for mobile numbering)
}
```

Coordinates are **percentages**, not pixels — independent of rendered image size. A click at the center of the image saves `x: 50, y: 50`.

**Validation:** x and y must be between 0 and 100 (reject out-of-range values in the service layer). Title max 80 characters. Description max 500 characters.

### Card (modify existing)

Add `annotations` field:

```
Card {
  ...existing fields (title, description, image, order)
  annotations: Annotation[]  // subdocument array, default []
}
```

## 2. Admin — Annotation CRUD

### Page

`/admin/decks/[id]/cards/[cardId]/annotations` — dedicated page for managing annotations on a card.

**Access:** Link "Anotações" on the card edit page (`/admin/decks/[id]/cards/[cardId]/edit`) and optionally from the card grid in deck edit.

### Permission

Uses existing `admin:decks` permission.

### Create Flow

1. Admin sees the card image displayed large
2. Clicks a point on the image → red marker appears + side form with title and description fields
3. Fills in and saves → annotation created with coordinates (x%, y%)
4. The point stays visible alongside existing annotations

### Edit Flow

1. Admin clicks an existing point on the image → side form populates with current data
2. Can modify title, description
3. To reposition: clicks "Reposicionar" button, then clicks a new point on the image
4. Saves changes

### Delete Flow

1. In the edit form, "Remover" button with confirmation dialog
2. Deletes the annotation and removes the point from the image

### Components

```
components/admin/annotation-editor.tsx  # Client Component — full interactivity
```

The annotation editor is a Client Component handling:
- Image display with click-to-place points
- Existing annotation points rendered as markers
- Side form (title, description) that appears on point click/create
- Server Action calls for create/update/delete

### Server Actions

```
app/(dashboard)/admin/decks/[id]/cards/[cardId]/annotations/actions.ts
```

Functions:
- `createAnnotationAction(formData)` — deckId, cardId, x, y, title, description
- `updateAnnotationAction(formData)` — deckId, cardId, annotationId, x, y, title, description
- `deleteAnnotationAction(formData)` — deckId, cardId, annotationId

All check `admin:decks` permission.

## 3. Public Visualization — Desktop (≥ 768px)

### Where

Card detail page: `/baralhos/[id]/carta/[cardId]`

### Layout

- Card image centered in a relative container
- Red dots on the image at (x%, y%) coordinates
- Titles distributed automatically around the card:
  - Point in left half of image → title positioned to the left of the card
  - Point in right half → title to the right
  - Vertical distribution to avoid overlap between titles on the same side
- SVG lines connecting each dot to its title (absolute-positioned `<svg>` overlay)
- Hover on title: highlights the line + shows tooltip with description
- Click on title: toggles the tooltip (for click-preference users)

### Component

```
components/card-annotations-viewer.tsx  # Client Component
```

Receives annotations array + image URL + aspect ratio. Handles:
- Point rendering (absolute positioned within image container)
- Title positioning algorithm (left/right distribution with vertical spacing)
- SVG line drawing (from point center to title edge)
- Hover/click state for descriptions
- Responsive breakpoint switching (desktop vs mobile)

## 4. Public Visualization — Mobile (< 768px)

### Layout

- Card image centered, no titles around (insufficient space)
- Points on the image as **numbered circles** (1, 2, 3...) based on `order` field
- No connector lines
- Click on a numbered circle → modal/tooltip appears below the image with title + description
- Click outside or X button closes the modal

### Implementation

Same component (`card-annotations-viewer.tsx`) with conditional rendering per breakpoint. Uses CSS media queries or a `useMediaQuery` hook to switch between desktop and mobile modes.

## 5. File Structure

```
lib/
  decks/
    model.ts                              # Modify: add Annotation schema to Card
    service.ts                            # Modify: add annotation CRUD functions

components/
  admin/
    annotation-editor.tsx                 # Client: image click, form, CRUD
  card-annotations-viewer.tsx             # Client: public view (desktop + mobile)

app/(dashboard)/
  admin/decks/
    [id]/cards/
      [cardId]/
        edit/page.tsx                     # Modify: add link to annotations page
        annotations/
          page.tsx                        # Admin: annotation management page
          actions.ts                      # Server Actions: create, update, delete
  baralhos/
    [id]/carta/
      [cardId]/page.tsx                   # Modify: render annotations viewer
```

## 6. Service Layer Functions

Add to `lib/decks/service.ts`:

- `addAnnotation(deckId, cardId, data: { x, y, title, description })` — push to card's annotations array with next order number
- `updateAnnotation(deckId, cardId, annotationId, data: { x?, y?, title?, description? })` — update subdocument fields
- `deleteAnnotation(deckId, cardId, annotationId)` — pull from annotations array

## 7. Language

All UI text in Portuguese: "Anotações", "Adicionar Anotação", "Título", "Descrição", "Reposicionar", "Remover", "Clique na imagem para adicionar uma anotação", etc.

## Out of Scope

- User-created personal annotations (only admin creates)
- Drag-and-drop point repositioning (admin re-clicks to reposition)
- Complex line animations
- Export/import annotations
- Annotation reorder UI (uses creation order; future enhancement if pedagogical order needed)
