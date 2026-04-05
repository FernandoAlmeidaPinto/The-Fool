# Profile Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Meu Perfil" stub with a profile page where users can edit their info (name, avatar, birth date) and see their plan limits.

**Architecture:** Add `birthDate` and `avatar` fields to User model, create a user service, a server action for updates with avatar upload to MinIO, and a client component with the profile form and plan section.

**Tech Stack:** Next.js 16, Mongoose, MinIO (S3), sharp, ImageCropUpload, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-05-profile-page-design.md`

---

### Task 1: User model update

**Files:**
- Modify: `lib/users/model.ts`

- [ ] **Step 1: Add fields to IUser and UserSchema**

In `lib/users/model.ts`, add to the `IUser` interface after `image`:

```typescript
avatar: string | null;
birthDate: Date | null;
```

Add to `UserSchema` after `image`:

```typescript
avatar: { type: String, default: null },
birthDate: { type: Date, default: null },
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/users/model.ts
git commit -m "feat: add avatar and birthDate fields to User model"
```

---

### Task 2: User service

**Files:**
- Create: `lib/users/service.ts`

- [ ] **Step 1: Create the service**

Create `lib/users/service.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { User } from "./model";
import type { IUser } from "./model";

export async function getUserById(id: string): Promise<IUser | null> {
  await connectDB();
  return User.findById(id).lean();
}

export async function updateUser(
  id: string,
  data: { name?: string; birthDate?: Date | null; avatar?: string }
): Promise<IUser | null> {
  await connectDB();
  return User.findByIdAndUpdate(id, data, { new: true }).lean();
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/users/service.ts
git commit -m "feat: add user service with getUserById and updateUser"
```

---

### Task 3: Server action

**Files:**
- Create: `app/(dashboard)/perfil/actions.ts`

- [ ] **Step 1: Create the server action**

Create `app/(dashboard)/perfil/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { updateUser } from "@/lib/users/service";
import { uploadFile, validateImage } from "@/lib/storage/s3";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Não autenticado" };
  }

  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { success: false, error: "Nome é obrigatório" };
  }

  const birthDateStr = formData.get("birthDate") as string;
  const birthDate = birthDateStr ? new Date(birthDateStr) : null;

  const data: { name: string; birthDate: Date | null; avatar?: string } = {
    name: name.trim(),
    birthDate,
  };

  // Handle avatar upload
  const avatarFile = formData.get("avatar") as File | null;
  if (avatarFile && avatarFile.size > 0) {
    const validationError = validateImage(avatarFile);
    if (validationError) {
      return { success: false, error: validationError };
    }

    const sharp = (await import("sharp")).default;
    const rawBuffer = Buffer.from(await avatarFile.arrayBuffer());
    const processedBuffer = await sharp(rawBuffer)
      .resize(256, 256, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const key = `users/avatars/${session.user.id}.jpg`;
    data.avatar = await uploadFile(processedBuffer, key, "image/jpeg");
  }

  try {
    await updateUser(session.user.id, data);
    revalidatePath("/perfil");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao salvar" };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/perfil/actions.ts"
git commit -m "feat: add updateProfileAction with avatar upload"
```

---

### Task 4: Profile form client component

**Files:**
- Create: `components/profile/profile-form.tsx`

- [ ] **Step 1: Create the component**

Create `components/profile/profile-form.tsx`:

```tsx
"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropUpload } from "@/components/image-crop-upload";
import { updateProfileAction } from "@/app/(dashboard)/perfil/actions";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    birthDate: string | null; // ISO string or null
  };
  plan: {
    name: string;
    limits: {
      label: string;
      used: number;
      limit: number | null; // null = unlimited
    }[];
  };
}

export function ProfileForm({ user, plan }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setMessage(null);
      const result = await updateProfileAction(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Perfil atualizado com sucesso" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Erro ao salvar" });
      }
    });
  };

  // Get initials for avatar fallback
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      {/* Section 1: Personal Info */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
          <h3 className="text-lg font-semibold">Dados Pessoais</h3>

          {message && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-24 w-24 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground border border-border">
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1">
              <ImageCropUpload
                name="avatar"
                aspectRatio={1}
                currentImage={user.avatar}
                label="Foto de perfil"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              required
              disabled={isPending}
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          {/* Birth date */}
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              defaultValue={user.birthDate ?? ""}
              disabled={isPending}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>

      {/* Section 2: Meu Plano */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Meu Plano</h3>
        <p className="text-sm font-medium">{plan.name}</p>

        {plan.limits.length > 0 && (
          <div className="space-y-3">
            {plan.limits.map((limit) => (
              <div key={limit.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{limit.label}</span>
                  <span className="text-muted-foreground">
                    {limit.limit === null
                      ? "Ilimitado"
                      : `${limit.used} de ${limit.limit} usadas`}
                  </span>
                </div>
                {limit.limit !== null && (
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (limit.used / limit.limit) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add components/profile/profile-form.tsx
git commit -m "feat: add ProfileForm client component with avatar and plan section"
```

---

### Task 5: Profile page (Server Component)

**Files:**
- Modify: `app/(dashboard)/perfil/page.tsx`

- [ ] **Step 1: Replace the stub page**

Replace the entire contents of `app/(dashboard)/perfil/page.tsx`:

```tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/users/service";
import { getProfileBySlug } from "@/lib/profiles/service";
import { checkReadingQuota } from "@/lib/readings/quota";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    redirect("/auth/login");
  }

  // Fetch profile for plan info
  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;

  // Fetch reading quota
  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
  const readingQuota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);

  // Build plan info
  const planName = profile?.name ?? "Sem plano";
  const limits = [
    {
      label: "Leituras este mês",
      used: readingQuota.used,
      limit: readingQuota.limit,
    },
  ];

  // Serialize for client component
  const birthDateStr = user.birthDate
    ? new Date(user.birthDate).toISOString().split("T")[0]
    : null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Meu Perfil</h2>
      <ProfileForm
        user={{
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          avatar: user.avatar ?? null,
          birthDate: birthDateStr,
        }}
        plan={{
          name: planName,
          limits,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify build and lint**

```bash
yarn build && yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/perfil/page.tsx"
git commit -m "feat: replace perfil stub with profile page"
```
