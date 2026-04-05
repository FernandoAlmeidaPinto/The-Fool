# Decks & Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin CRUD for tarot/oracle decks with card image upload to MinIO, plus public card browsing for all authenticated users.

**Architecture:** Deck is a MongoDB collection with Card subdocuments. Images stored in MinIO (S3-compatible) via `@aws-sdk/client-s3`. Admin pages under `/admin/decks`, public browsing under `/baralhos`. New `admin:decks` permission. Sidebar updated for both admin and public sections.

**Tech Stack:** Next.js 16, Mongoose, @aws-sdk/client-s3, MinIO (Docker), shadcn/ui, lucide-react, Tailwind CSS 4

**Next.js 16 breaking changes to respect:**
- `headers()`, `cookies()`, `params`, `searchParams` are **async** — always `await` them
- Always read `node_modules/next/dist/docs/` before using any Next.js API

---

## File Map

```
docker-compose.yml                                # Modify: add MinIO service
.env.example                                      # Modify: add S3 env vars
.env.local                                        # Modify: add S3 env vars
lib/
  permissions/constants.ts                        # Modify: add ADMIN_DECKS
  storage/s3.ts                                   # Create: S3/MinIO client wrapper
  decks/
    constants.ts                                  # Create: DECK_TYPES enum
    model.ts                                      # Create: Deck + Card schemas
    service.ts                                    # Create: CRUD operations
components/
  dashboard/
    sidebar.tsx                                   # Modify: add Baralhos + admin Baralhos
    page-title.tsx                                # Modify: add deck/card titles
app/(dashboard)/
  admin/decks/
    page.tsx                                      # Create: list decks
    actions.ts                                    # Create: server actions
    new/page.tsx                                  # Create: create deck form
    [id]/edit/page.tsx                            # Create: edit deck + card list
    [id]/cards/
      new/page.tsx                                # Create: add card with upload
      [cardId]/edit/page.tsx                      # Create: edit card
  baralhos/
    page.tsx                                      # Create: public deck list
    [id]/
      page.tsx                                    # Create: card grid
      carta/
        [cardId]/page.tsx                         # Create: card detail
```

---

### Task 1: MinIO in Docker Compose + S3 Storage Library

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `.env.local`
- Create: `lib/storage/s3.ts`

- [ ] **Step 1: Install @aws-sdk/client-s3**

```bash
yarn add @aws-sdk/client-s3
```

- [ ] **Step 2: Add MinIO to `docker-compose.yml`**

Add the minio service and volume:

```yaml
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
```

Add `minio_data:` to the volumes section.

- [ ] **Step 3: Add S3 env vars to `.env.example` and `.env.local`**

Append to `.env.example`:
```
# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=the-fool-cards
S3_REGION=us-east-1
```

Copy the same values to `.env.local`.

- [ ] **Step 4: Create `lib/storage/s3.ts`**

```typescript
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT!;
const bucket = process.env.S3_BUCKET!;

const s3 = new S3Client({
  endpoint,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    // Set bucket policy to public-read
    const { PutBucketPolicyCommand } = await import("@aws-sdk/client-s3");
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        }),
      })
    );
  }
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImage(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Formato inválido. Use JPEG, PNG ou WebP.";
  }
  if (file.size > MAX_SIZE) {
    return "Arquivo muito grande. Máximo 5MB.";
  }
  return null;
}

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await ensureBucket();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return getPublicUrl(key);
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export function getPublicUrl(key: string): string {
  return `${endpoint}/${bucket}/${key}`;
}
```

- [ ] **Step 5: Verify MinIO starts**

```bash
docker compose up -d
docker compose ps
```

Expected: both mongodb and minio services running.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example lib/storage/ package.json yarn.lock
git commit -m "feat: add MinIO to Docker Compose and S3 storage library"
```

---

### Task 2: Deck Model + Constants + Service

**Files:**
- Create: `lib/decks/constants.ts`
- Create: `lib/decks/model.ts`
- Create: `lib/decks/service.ts`

- [ ] **Step 1: Create `lib/decks/constants.ts`**

```typescript
export const DECK_TYPES = {
  TAROT: "tarot",
  LENORMAND: "lenormand",
  ORACLE: "oracle",
} as const;

export type DeckType = (typeof DECK_TYPES)[keyof typeof DECK_TYPES];

export const DECK_TYPE_LABELS: Record<DeckType, string> = {
  tarot: "Tarot",
  lenormand: "Lenormand",
  oracle: "Oráculo",
};
```

- [ ] **Step 2: Create `lib/decks/model.ts`**

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface ICard {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  image: string;
  order: number;
}

const CardSchema = new Schema<ICard>({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  image: { type: String, required: true },
  order: { type: Number, required: true, default: 0 },
});

export interface IDeck {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  type: string;
  coverImage: string | null;
  cards: ICard[];
  createdAt: Date;
  updatedAt: Date;
}

const DeckSchema = new Schema<IDeck>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["tarot", "lenormand", "oracle"],
      required: true,
    },
    coverImage: { type: String, default: null },
    cards: { type: [CardSchema], default: [] },
  },
  { timestamps: true }
);

export const Deck: Model<IDeck> =
  models.Deck ?? model<IDeck>("Deck", DeckSchema);
```

- [ ] **Step 3: Create `lib/decks/service.ts`**

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { Deck } from "./model";
import type { IDeck, ICard } from "./model";

// Deck CRUD
export async function listDecks(): Promise<IDeck[]> {
  await connectDB();
  return Deck.find().sort({ name: 1 }).lean();
}

export async function getDeckById(id: string): Promise<IDeck | null> {
  await connectDB();
  return Deck.findById(id).lean();
}

export async function createDeck(data: {
  name: string;
  description: string;
  type: string;
}): Promise<IDeck> {
  await connectDB();
  return Deck.create(data);
}

export async function updateDeck(
  id: string,
  data: { name?: string; description?: string; type?: string }
): Promise<IDeck | null> {
  await connectDB();
  return Deck.findByIdAndUpdate(id, data, { new: true }).lean();
}

// Card CRUD (subdocument operations)
export async function addCard(
  deckId: string,
  data: { title: string; description: string; image: string }
): Promise<ICard> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) throw new Error("Deck not found");

  const maxOrder = deck.cards.reduce((max, c) => Math.max(max, c.order), -1);
  const card = { ...data, order: maxOrder + 1 };
  deck.cards.push(card as ICard);
  await deck.save();

  return deck.cards[deck.cards.length - 1].toObject();
}

export async function updateCard(
  deckId: string,
  cardId: string,
  data: { title?: string; description?: string; image?: string }
): Promise<ICard | null> {
  await connectDB();
  const deck = await Deck.findById(deckId);
  if (!deck) return null;

  const card = deck.cards.id(cardId);
  if (!card) return null;

  if (data.title !== undefined) card.title = data.title;
  if (data.description !== undefined) card.description = data.description;
  if (data.image !== undefined) card.image = data.image;

  await deck.save();
  return card.toObject();
}

export async function getCardFromDeck(
  deckId: string,
  cardId: string
): Promise<{ deck: IDeck; card: ICard; prevCard: ICard | null; nextCard: ICard | null } | null> {
  await connectDB();
  const deck = await Deck.findById(deckId).lean();
  if (!deck) return null;

  const sortedCards = [...deck.cards].sort((a, b) => a.order - b.order);
  const idx = sortedCards.findIndex((c) => c._id.toString() === cardId);
  if (idx === -1) return null;

  return {
    deck,
    card: sortedCards[idx],
    prevCard: idx > 0 ? sortedCards[idx - 1] : null,
    nextCard: idx < sortedCards.length - 1 ? sortedCards[idx + 1] : null,
  };
}
```

- [ ] **Step 4: Verify:** `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add lib/decks/
git commit -m "feat: add Deck model, constants, and service layer"
```

---

### Task 3: Update Permissions + Seed + Sidebar

**Files:**
- Modify: `lib/permissions/constants.ts`
- Modify: `components/dashboard/sidebar.tsx`
- Modify: `components/dashboard/page-title.tsx`

- [ ] **Step 1: Add `ADMIN_DECKS` to permissions constants**

In `lib/permissions/constants.ts`, add to the PERMISSIONS object:

```typescript
  ADMIN_DECKS: "admin:decks",
```

Note: The seed script uses `ALL_PERMISSIONS` which is derived from `Object.values(PERMISSIONS)`, so the admin profile will automatically include `admin:decks` on next `yarn seed` run.

- [ ] **Step 2: Update sidebar**

In `components/dashboard/sidebar.tsx`:

Add import for `Layers` icon (for Baralhos):
```typescript
import { ..., Layers } from "lucide-react";
```

Add "Baralhos" to main nav (after Cursos, before the separator):
```tsx
<SidebarItem href="/baralhos" label="Baralhos" icon={Layers} onNavigate={onNavigate} />
```

Add `"admin:decks"` to `ADMIN_PERMISSIONS` array.

Add "Baralhos" to admin section:
```tsx
<SidebarItem href="/admin/decks" label="Baralhos" icon={Layers} onNavigate={onNavigate} />
```

- [ ] **Step 3: Update page titles**

In `components/dashboard/page-title.tsx`, add to `PAGE_TITLES`:

```typescript
"/baralhos": "Baralhos",
"/admin/decks": "Baralhos",
"/admin/decks/new": "Novo Baralho",
```

Add to `getPageTitle` function (dynamic routes):

```typescript
if (/^\/admin\/decks\/[^/]+\/edit$/.test(pathname)) return "Editar Baralho";
if (/^\/admin\/decks\/[^/]+\/cards\/new$/.test(pathname)) return "Nova Carta";
if (/^\/admin\/decks\/[^/]+\/cards\/[^/]+\/edit$/.test(pathname)) return "Editar Carta";
if (/^\/baralhos\/[^/]+$/.test(pathname)) return "Baralho";
if (/^\/baralhos\/[^/]+\/carta\/[^/]+$/.test(pathname)) return "Carta";
```

- [ ] **Step 4: Run seed to update admin permissions**

```bash
yarn seed
```

- [ ] **Step 5: Verify:** `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add lib/permissions/constants.ts components/dashboard/sidebar.tsx components/dashboard/page-title.tsx
git commit -m "feat: add admin:decks permission, Baralhos to sidebar and page titles"
```

---

### Task 4: Admin Deck List + Create Pages

**Files:**
- Create: `app/(dashboard)/admin/decks/page.tsx`
- Create: `app/(dashboard)/admin/decks/actions.ts`
- Create: `app/(dashboard)/admin/decks/new/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/admin/decks/actions.ts`**

Server Actions for deck and card CRUD. All check `admin:decks` permission.

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createDeck, updateDeck, addCard, updateCard } from "@/lib/decks/service";
import { uploadFile, validateImage } from "@/lib/storage/s3";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

async function requireDecksPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    throw new Error("Unauthorized");
  }
}

export async function createDeckAction(formData: FormData) {
  await requireDecksPermission();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;
  if (!name || !type) throw new Error("Nome e tipo são obrigatórios");
  await createDeck({ name, description: description ?? "", type });
  redirect("/admin/decks");
}

export async function updateDeckAction(formData: FormData) {
  await requireDecksPermission();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as string;
  if (!id || !name || !type) throw new Error("Campos obrigatórios faltando");
  await updateDeck(id, { name, description: description ?? "", type });
  redirect(`/admin/decks/${id}/edit`);
}

export async function addCardAction(formData: FormData) {
  await requireDecksPermission();
  const deckId = formData.get("deckId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File;

  if (!deckId || !title || !file || file.size === 0) {
    throw new Error("Título e imagem são obrigatórios");
  }

  const validationError = validateImage(file);
  if (validationError) throw new Error(validationError);

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `decks/${deckId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const imageUrl = await uploadFile(buffer, key, file.type);

  await addCard(deckId, { title, description: description ?? "", image: imageUrl });
  redirect(`/admin/decks/${deckId}/edit`);
}

export async function updateCardAction(formData: FormData) {
  await requireDecksPermission();
  const deckId = formData.get("deckId") as string;
  const cardId = formData.get("cardId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File | null;

  if (!deckId || !cardId || !title) {
    throw new Error("Campos obrigatórios faltando");
  }

  const updateData: { title: string; description: string; image?: string } = {
    title,
    description: description ?? "",
  };

  if (file && file.size > 0) {
    const validationError = validateImage(file);
    if (validationError) throw new Error(validationError);

    const ext = file.name.split(".").pop() ?? "jpg";
    const key = `decks/${deckId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    updateData.image = await uploadFile(buffer, key, file.type);
  }

  await updateCard(deckId, cardId, updateData);
  redirect(`/admin/decks/${deckId}/edit`);
}
```

- [ ] **Step 2: Create `app/(dashboard)/admin/decks/page.tsx`**

List all decks in a table with name, type badge, card count, edit action.

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listDecks } from "@/lib/decks/service";
import { DECK_TYPE_LABELS } from "@/lib/decks/constants";
import type { DeckType } from "@/lib/decks/constants";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function AdminDecksPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const decks = await listDecks();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Baralhos</h1>
        <Link href="/admin/decks/new">
          <Button>Novo Baralho</Button>
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cartas</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {decks.map((deck) => (
            <TableRow key={deck._id.toString()}>
              <TableCell className="font-medium">{deck.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {DECK_TYPE_LABELS[deck.type as DeckType] ?? deck.type}
                </Badge>
              </TableCell>
              <TableCell>{deck.cards.length}</TableCell>
              <TableCell>
                <Link href={`/admin/decks/${deck._id}/edit`}>
                  <Button variant="outline" size="sm">Editar</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(dashboard)/admin/decks/new/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { DECK_TYPES, DECK_TYPE_LABELS } from "@/lib/decks/constants";
import type { DeckType } from "@/lib/decks/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createDeckAction } from "../actions";

export default async function NewDeckPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novo Baralho</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createDeckAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <select
              id="type"
              name="type"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
            >
              {Object.values(DECK_TYPES).map((t) => (
                <option key={t} value={t}>
                  {DECK_TYPE_LABELS[t as DeckType]}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Criar Baralho</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Verify:** `yarn build`

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/admin/decks/
git commit -m "feat: add admin deck list, create page, and server actions"
```

---

### Task 5: Admin Deck Edit + Card List

**Files:**
- Create: `app/(dashboard)/admin/decks/[id]/edit/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/admin/decks/[id]/edit/page.tsx`**

Edit deck form + list of cards with "Adicionar Carta" button. Cards shown in a grid with image thumbnails.

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { DECK_TYPES, DECK_TYPE_LABELS } from "@/lib/decks/constants";
import type { DeckType } from "@/lib/decks/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { updateDeckAction } from "../../actions";

export default async function EditDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const sortedCards = [...deck.cards].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Editar Baralho: {deck.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateDeckAction} className="space-y-4">
            <input type="hidden" name="id" value={deck._id.toString()} />
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={deck.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={deck.description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                defaultValue={deck.type}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              >
                {Object.values(DECK_TYPES).map((t) => (
                  <option key={t} value={t}>
                    {DECK_TYPE_LABELS[t as DeckType]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Salvar Alterações</Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Cartas ({sortedCards.length})
          </h2>
          <Link href={`/admin/decks/${deck._id}/cards/new`}>
            <Button>Adicionar Carta</Button>
          </Link>
        </div>
        {sortedCards.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma carta adicionada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedCards.map((card) => (
              <Link
                key={card._id.toString()}
                href={`/admin/decks/${deck._id}/cards/${card._id}/edit`}
                className="group"
              >
                <div className="aspect-[2/3] relative rounded-md overflow-hidden border border-border">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="object-cover w-full h-full group-hover:opacity-80 transition-opacity"
                  />
                </div>
                <p className="mt-1 text-sm font-medium text-foreground truncate">{card.title}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: Using `<img>` instead of Next.js `<Image>` for MinIO URLs since they are external and the domain may not be configured in `next.config.ts`. The implementer can add the MinIO domain to `images.remotePatterns` in `next.config.ts` if they want to use `<Image>`.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/admin/decks/\[id\]/edit/
git commit -m "feat: add admin deck edit page with card grid"
```

---

### Task 6: Admin Add Card + Edit Card Pages

**Files:**
- Create: `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx`
- Create: `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addCardAction } from "../../../../actions";

export default async function NewCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_DECKS)) {
    redirect("/");
  }

  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Nova Carta — {deck.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={addCardAction} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="deckId" value={deck._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Imagem</Label>
            <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
            <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP. Máximo 5MB.</p>
          </div>
          <Button type="submit">Adicionar Carta</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note: The relative import path to `actions.ts` (`../../../../actions`) depends on the actual directory depth. The implementer should verify this resolves correctly from `app/(dashboard)/admin/decks/[id]/cards/new/page.tsx` up to `app/(dashboard)/admin/decks/actions.ts`.

- [ ] **Step 2: Create `app/(dashboard)/admin/decks/[id]/cards/[cardId]/edit/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCardAction } from "../../../../../actions";

export default async function EditCardPage({
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

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Editar Carta — {card.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateCardAction} className="space-y-4" encType="multipart/form-data">
          <input type="hidden" name="deckId" value={deck._id.toString()} />
          <input type="hidden" name="cardId" value={card._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" name="title" defaultValue={card.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={card.description}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>Imagem Atual</Label>
            <img src={card.image} alt={card.title} className="w-40 aspect-[2/3] object-cover rounded-md border border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Substituir Imagem (opcional)</Label>
            <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
            <p className="text-xs text-muted-foreground">Deixe vazio para manter a imagem atual.</p>
          </div>
          <Button type="submit">Salvar Alterações</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify:** `yarn build`

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/admin/decks/\[id\]/cards/
git commit -m "feat: add admin card create and edit pages with image upload"
```

---

### Task 7: Public Deck List Page

**Files:**
- Create: `app/(dashboard)/baralhos/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/baralhos/page.tsx`**

```tsx
import { listDecks } from "@/lib/decks/service";
import { DECK_TYPE_LABELS } from "@/lib/decks/constants";
import type { DeckType } from "@/lib/decks/constants";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function BaralhosPage() {
  const decks = await listDecks();

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6">Baralhos</h2>
      {decks.length === 0 ? (
        <p className="text-muted-foreground">Nenhum baralho disponível ainda.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => {
            const coverImg = deck.coverImage ?? deck.cards[0]?.image;
            return (
              <Link
                key={deck._id.toString()}
                href={`/baralhos/${deck._id}`}
                className="group block rounded-lg border border-border bg-card overflow-hidden hover:border-primary transition-colors"
              >
                {coverImg ? (
                  <div className="aspect-[3/2] overflow-hidden">
                    <img
                      src={coverImg}
                      alt={deck.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                    />
                  </div>
                ) : (
                  <div className="aspect-[3/2] bg-muted flex items-center justify-center text-muted-foreground">
                    Sem imagem
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-foreground">{deck.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {DECK_TYPE_LABELS[deck.type as DeckType] ?? deck.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {deck.cards.length} {deck.cards.length === 1 ? "carta" : "cartas"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/baralhos/page.tsx
git commit -m "feat: add public deck list page"
```

---

### Task 8: Public Card Grid + Card Detail Pages

**Files:**
- Create: `app/(dashboard)/baralhos/[id]/page.tsx`
- Create: `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/baralhos/[id]/page.tsx`**

Card grid — responsive, 2:3 aspect ratio images, title below.

```tsx
import { notFound } from "next/navigation";
import { getDeckById } from "@/lib/decks/service";
import { DECK_TYPE_LABELS } from "@/lib/decks/constants";
import type { DeckType } from "@/lib/decks/constants";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deck = await getDeckById(id);
  if (!deck) notFound();

  const sortedCards = [...deck.cards].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-semibold text-foreground">{deck.name}</h2>
          <Badge variant="secondary">
            {DECK_TYPE_LABELS[deck.type as DeckType] ?? deck.type}
          </Badge>
        </div>
        {deck.description && (
          <p className="text-muted-foreground">{deck.description}</p>
        )}
      </div>

      {sortedCards.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma carta neste baralho.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedCards.map((card) => (
            <Link
              key={card._id.toString()}
              href={`/baralhos/${deck._id}/carta/${card._id}`}
              className="group"
            >
              <div className="aspect-[2/3] relative rounded-md overflow-hidden border border-border">
                <img
                  src={card.image}
                  alt={card.title}
                  className="object-cover w-full h-full group-hover:opacity-80 transition-opacity"
                />
              </div>
              <p className="mt-2 text-sm font-medium text-foreground text-center truncate">
                {card.title}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(dashboard)/baralhos/[id]/carta/[cardId]/page.tsx`**

Card detail with large image, title, description, prev/next navigation.

```tsx
import { notFound } from "next/navigation";
import { getCardFromDeck } from "@/lib/decks/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string; cardId: string }>;
}) {
  const { id, cardId } = await params;
  const result = await getCardFromDeck(id, cardId);
  if (!result) notFound();

  const { deck, card, prevCard, nextCard } = result;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/baralhos/${deck._id}`}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        ← Voltar para {deck.name}
      </Link>

      <div className="flex flex-col items-center">
        <div className="w-full max-w-sm aspect-[2/3] relative rounded-lg overflow-hidden border border-border">
          <img
            src={card.image}
            alt={card.title}
            className="object-cover w-full h-full"
          />
        </div>

        <h2 className="text-2xl font-semibold text-foreground mt-6">{card.title}</h2>

        {card.description && (
          <p className="text-muted-foreground mt-3 text-center leading-relaxed">
            {card.description}
          </p>
        )}

        <div className="flex items-center gap-4 mt-8">
          {prevCard ? (
            <Link href={`/baralhos/${deck._id}/carta/${prevCard._id}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {prevCard.title}
              </Button>
            </Link>
          ) : (
            <div />
          )}
          {nextCard && (
            <Link href={`/baralhos/${deck._id}/carta/${nextCard._id}`}>
              <Button variant="outline" size="sm">
                {nextCard.title}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify:** `yarn build`

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/baralhos/
git commit -m "feat: add public card grid and card detail pages"
```

---

### Task 9: Final Cleanup + Lint + Build

**Files:**
- Possibly modify: any files with lint/build issues

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Fix any errors.

- [ ] **Step 2: Run build**

```bash
yarn build
```

Expected new routes:
```
/admin/decks            (list)
/admin/decks/new        (create)
/admin/decks/[id]/edit  (edit + cards)
/admin/decks/[id]/cards/new          (add card)
/admin/decks/[id]/cards/[cardId]/edit (edit card)
/baralhos               (public deck list)
/baralhos/[id]          (card grid)
/baralhos/[id]/carta/[cardId]  (card detail)
```

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address lint and build issues"
```

---

## Completion Checklist

After all tasks are done, verify:

- [ ] `docker compose up -d` starts MongoDB + MinIO
- [ ] `yarn seed` adds `admin:decks` to admin profile
- [ ] `yarn build` succeeds with all expected routes
- [ ] `yarn lint` passes
- [ ] Admin can create a deck (name, description, type)
- [ ] Admin can add cards with image upload to a deck
- [ ] Admin can edit deck details and card details
- [ ] Image upload validates file type (JPEG/PNG/WebP) and size (max 5MB)
- [ ] Images are stored in MinIO and accessible via URL
- [ ] "Baralhos" appears in sidebar main nav and admin accordion
- [ ] Public `/baralhos` shows deck list with cover images
- [ ] `/baralhos/[id]` shows card grid (2/3/4 cols responsive)
- [ ] `/baralhos/[id]/carta/[cardId]` shows card detail with prev/next navigation
- [ ] All UI text is in Portuguese
