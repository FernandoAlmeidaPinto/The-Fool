# Profiles, Permissions & Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a role-based permission system with profiles, plans (CRUD), admin pages, seed script, and JWT-cached permissions.

**Architecture:** Profiles are MongoDB documents holding permission arrays. Users reference a single profile. Plans reference profiles for future billing. Permissions are cached in the JWT token and session object for zero-query runtime checks. Admin pages provide CRUD for both profiles and plans with two-level permission protection.

**Tech Stack:** Next.js 16, Mongoose, Auth.js v5 (JWT), shadcn/ui (Table, Select, Checkbox, Badge), Tailwind CSS 4

**Next.js 16 breaking changes to respect:**
- `headers()`, `cookies()`, `params`, `searchParams` are **async** — always `await` them
- `middleware.ts` is renamed to `proxy.ts` with `export function proxy()`
- Always read `node_modules/next/dist/docs/` before using any Next.js API to check for changes

---

## File Map

```
lib/
  permissions/
    constants.ts              # PERMISSIONS enum + Permission type
    check.ts                  # hasPermission() helper
  profiles/
    model.ts                  # Profile Mongoose schema
    service.ts                # CRUD: create, update, list, getBySlug
  plans/
    model.ts                  # Plan Mongoose schema
    service.ts                # CRUD: create, update, list, toggleActive
  db/
    seed.ts                   # Seed script (profiles: admin + free_tier)
  auth/
    auth.ts                   # Modify: JWT/session callbacks for permissions
    auth-actions.ts           # Modify: register assigns free_tier profileId
  users/
    model.ts                  # Modify: add profileId field
app/
  admin/
    layout.tsx                # Permission check wrapper (any admin:* perm)
    page.tsx                  # Redirect to /admin/profiles
    profiles/
      page.tsx                # List profiles table
      new/page.tsx            # Create profile form
      [id]/edit/page.tsx      # Edit profile form
      actions.ts              # Server Actions: createProfile, updateProfile
    plans/
      page.tsx                # List plans table
      new/page.tsx            # Create plan form
      [id]/edit/page.tsx      # Edit plan form
      actions.ts              # Server Actions: createPlan, updatePlan, togglePlanActive
```

---

### Task 1: Permissions Constants + Check Helper

**Files:**
- Create: `lib/permissions/constants.ts`
- Create: `lib/permissions/check.ts`

- [ ] **Step 1: Create `lib/permissions/constants.ts`**

```typescript
export const PERMISSIONS = {
  // Readings
  READINGS_VIEW: "readings:view",
  READINGS_CREATE: "readings:create",

  // AI Interpretation
  AI_USE: "ai:use",

  // Courses/Content
  COURSES_ACCESS: "courses:access",

  // Admin
  ADMIN_PROFILES: "admin:profiles",
  ADMIN_PLANS: "admin:plans",
  ADMIN_USERS: "admin:users",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
```

- [ ] **Step 2: Create `lib/permissions/check.ts`**

```typescript
import type { Session } from "next-auth";
import type { Permission } from "./constants";

export function hasPermission(
  session: Session | null,
  permission: Permission
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const permissions = (session?.user as any)?.permissions as string[] | undefined;
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(
  session: Session | null,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(session, p));
}
```

Note: The `any` cast is needed because Auth.js default session types don't include `permissions`. A proper type augmentation will be added in Task 4 when we modify the auth config.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/permissions/
git commit -m "feat: add permissions constants and check helpers"
```

---

### Task 2: Profile Model + Service

**Files:**
- Create: `lib/profiles/model.ts`
- Create: `lib/profiles/service.ts`

- [ ] **Step 1: Create `lib/profiles/model.ts`**

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IProfile {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema = new Schema<IProfile>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const Profile: Model<IProfile> =
  models.Profile ?? model<IProfile>("Profile", ProfileSchema);
```

- [ ] **Step 2: Create `lib/profiles/service.ts`**

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { Profile } from "./model";
import type { IProfile } from "./model";

export async function listProfiles(): Promise<IProfile[]> {
  await connectDB();
  return Profile.find().sort({ name: 1 }).lean();
}

export async function getProfileById(id: string): Promise<IProfile | null> {
  await connectDB();
  return Profile.findById(id).lean();
}

export async function getProfileBySlug(slug: string): Promise<IProfile | null> {
  await connectDB();
  return Profile.findOne({ slug }).lean();
}

export async function createProfile(data: {
  name: string;
  slug: string;
  description: string;
  permissions: string[];
}): Promise<IProfile> {
  await connectDB();
  return Profile.create(data);
}

export async function updateProfile(
  id: string,
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
  }
): Promise<IProfile | null> {
  await connectDB();
  return Profile.findByIdAndUpdate(id, data, { new: true }).lean();
}
```

Note: `slug` is not updatable after creation to prevent breaking references.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/profiles/
git commit -m "feat: add Profile model and service layer"
```

---

### Task 3: Plan Model + Service

**Files:**
- Create: `lib/plans/model.ts`
- Create: `lib/plans/service.ts`

- [ ] **Step 1: Create `lib/plans/model.ts`**

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface IPlan {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  profileId: mongoose.Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    currency: { type: String, default: "BRL" },
    interval: {
      type: String,
      enum: ["monthly", "yearly", "one_time"],
      default: "monthly",
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Plan: Model<IPlan> =
  models.Plan ?? model<IPlan>("Plan", PlanSchema);
```

- [ ] **Step 2: Create `lib/plans/service.ts`**

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { Plan } from "./model";
import type { IPlan } from "./model";

export async function listPlans(): Promise<IPlan[]> {
  await connectDB();
  return Plan.find().sort({ createdAt: -1 }).lean();
}

export async function getPlanById(id: string): Promise<IPlan | null> {
  await connectDB();
  return Plan.findById(id).lean();
}

export async function createPlan(data: {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  profileId: string;
}): Promise<IPlan> {
  await connectDB();
  return Plan.create(data);
}

export async function updatePlan(
  id: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    interval?: string;
    profileId?: string;
    active?: boolean;
  }
): Promise<IPlan | null> {
  await connectDB();
  return Plan.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function togglePlanActive(id: string): Promise<IPlan | null> {
  await connectDB();
  const plan = await Plan.findById(id);
  if (!plan) return null;
  plan.active = !plan.active;
  await plan.save();
  return plan.toObject();
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add lib/plans/
git commit -m "feat: add Plan model and service layer"
```

---

### Task 4: Modify User Model + Auth Callbacks (JWT permissions)

**Files:**
- Modify: `lib/users/model.ts`
- Modify: `lib/auth/auth.ts`

- [ ] **Step 1: Add `profileId` to User model**

In `lib/users/model.ts`, add `profileId` to the interface and schema:

```typescript
// Add to IUser interface:
profileId: mongoose.Types.ObjectId | null;

// Add to UserSchema:
profileId: {
  type: Schema.Types.ObjectId,
  ref: "Profile",
  default: null,
},
```

- [ ] **Step 2: Modify JWT callback in `lib/auth/auth.ts`**

Update the `jwt` callback to fetch the user's profile and cache permissions in the token:

```typescript
async jwt({ token, user, trigger }) {
  if (user || trigger === "update") {
    await connectDB();
    const dbUser = await User.findById(token.id ?? user?.id);
    if (dbUser?.profileId) {
      const { Profile } = await import("@/lib/profiles/model");
      const profile = await Profile.findById(dbUser.profileId);
      if (profile) {
        token.profileSlug = profile.slug;
        token.permissions = profile.permissions;
      }
    } else {
      token.profileSlug = null;
      token.permissions = [];
    }
    if (user) {
      token.id = user.id;
    }
  }
  return token;
},
```

- [ ] **Step 3: Modify session callback**

Update the `session` callback to pass permissions to the session object:

```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    (session.user as any).profileSlug = token.profileSlug as string | null;
    (session.user as any).permissions = (token.permissions as string[]) ?? [];
  }
  return session;
},
```

- [ ] **Step 4: Add Auth.js type augmentation**

Add a `types/next-auth.d.ts` file or augment at the top of `lib/auth/auth.ts`:

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      profileSlug: string | null;
      permissions: string[];
    };
  }
}
```

After this, remove the `any` casts from `lib/permissions/check.ts`.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add lib/users/model.ts lib/auth/auth.ts lib/permissions/check.ts types/
git commit -m "feat: add profileId to User and cache permissions in JWT"
```

---

### Task 5: Seed Script

**Files:**
- Create: `lib/db/seed.ts`
- Modify: `package.json` (add `seed` script)

- [ ] **Step 1: Create `lib/db/seed.ts`**

```typescript
import { connectDB } from "./mongoose";
import { Profile } from "@/lib/profiles/model";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions/constants";

async function seed() {
  await connectDB();

  console.log("Seeding profiles...");

  await Profile.findOneAndUpdate(
    { slug: "admin" },
    {
      name: "Admin",
      slug: "admin",
      description: "Full platform access",
      permissions: ALL_PERMISSIONS,
    },
    { upsert: true, new: true }
  );
  console.log("  ✓ admin profile");

  await Profile.findOneAndUpdate(
    { slug: "free_tier" },
    {
      name: "Free Tier",
      slug: "free_tier",
      description: "Basic free access",
      permissions: [PERMISSIONS.READINGS_VIEW, PERMISSIONS.READINGS_CREATE],
    },
    { upsert: true, new: true }
  );
  console.log("  ✓ free_tier profile");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed script to `package.json`**

```json
"scripts": {
  ...existing,
  "seed": "npx tsx lib/db/seed.ts"
}
```

Note: `tsx` runs TypeScript files directly with path alias support. Install it if not present: `yarn add -D tsx`.

- [ ] **Step 3: Run the seed script**

```bash
docker compose up -d
yarn seed
```

Expected output:
```
Seeding profiles...
  ✓ admin profile
  ✓ free_tier profile
Seed complete.
```

- [ ] **Step 4: Run seed again to verify idempotency**

```bash
yarn seed
```

Expected: same output, no duplicate errors.

- [ ] **Step 5: Commit**

```bash
git add lib/db/seed.ts package.json yarn.lock
git commit -m "feat: add seed script for admin and free_tier profiles"
```

---

### Task 6: Modify Registration to Assign free_tier Profile

**Files:**
- Modify: `lib/auth/auth-actions.ts`

- [ ] **Step 1: Update `register` function**

After `User.create(...)`, look up the free_tier profile and assign it. Modify the `User.create` call:

```typescript
import { getProfileBySlug } from "@/lib/profiles/service";

// Inside register(), before User.create:
const freeTierProfile = await getProfileBySlug("free_tier");
if (!freeTierProfile) {
  throw new Error("Free tier profile not found. Run 'yarn seed' first.");
}

// Modify User.create to include profileId:
await User.create({
  name,
  email,
  password: hashedPassword,
  profileId: freeTierProfile._id,
});
```

- [ ] **Step 2: Verify the full flow**

```bash
yarn dev
```

1. Register a new user
2. Check MongoDB — the user document should have a `profileId` matching the free_tier profile
3. The session should include `profileSlug: "free_tier"` and `permissions: ["readings:view", "readings:create"]`

- [ ] **Step 3: Commit**

```bash
git add lib/auth/auth-actions.ts
git commit -m "feat: assign free_tier profile on user registration"
```

---

### Task 7: Install Additional shadcn/ui Components

**Files:**
- Create: `components/ui/table.tsx` (auto-generated)
- Create: `components/ui/select.tsx` (auto-generated)
- Create: `components/ui/checkbox.tsx` (auto-generated)
- Create: `components/ui/badge.tsx` (auto-generated)

- [ ] **Step 1: Install components**

```bash
npx shadcn@latest add table select checkbox badge
```

- [ ] **Step 2: Verify they exist**

```bash
ls components/ui/
```

Should now include: `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `table.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/ui/
git commit -m "feat: add table, select, checkbox, badge shadcn/ui components"
```

---

### Task 8: Admin Layout + Redirect Page

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Create `app/admin/layout.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { hasAnyPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import Link from "next/link";

const ADMIN_PERMISSIONS = [
  PERMISSIONS.ADMIN_PROFILES,
  PERMISSIONS.ADMIN_PLANS,
  PERMISSIONS.ADMIN_USERS,
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || !hasAnyPermission(session, ADMIN_PERMISSIONS)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin/profiles" className="text-sm font-medium text-foreground hover:text-primary">
            Profiles
          </Link>
          <Link href="/admin/plans" className="text-sm font-medium text-foreground hover:text-primary">
            Plans
          </Link>
          <div className="ml-auto">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to app
            </Link>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/admin/profiles");
}
```

- [ ] **Step 3: Verify admin layout redirects non-admin users**

```bash
yarn dev
```

Navigate to `http://localhost:3000/admin` as a regular user — should redirect to `/`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx app/admin/page.tsx
git commit -m "feat: add admin layout with permission check and navigation"
```

---

### Task 9: Admin Profiles Pages (List + Create + Edit)

**Files:**
- Create: `app/admin/profiles/page.tsx`
- Create: `app/admin/profiles/actions.ts`
- Create: `app/admin/profiles/new/page.tsx`
- Create: `app/admin/profiles/[id]/edit/page.tsx`

- [ ] **Step 1: Create `app/admin/profiles/actions.ts`**

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createProfile, updateProfile } from "@/lib/profiles/service";
import { redirect } from "next/navigation";

async function requireProfilesPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    throw new Error("Unauthorized");
  }
}

export async function createProfileAction(formData: FormData) {
  await requireProfilesPermission();

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const permissions = formData.getAll("permissions") as string[];

  if (!name || !slug) {
    throw new Error("Name and slug are required");
  }

  await createProfile({ name, slug, description: description ?? "", permissions });
  redirect("/admin/profiles");
}

export async function updateProfileAction(formData: FormData) {
  await requireProfilesPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const permissions = formData.getAll("permissions") as string[];

  if (!id || !name) {
    throw new Error("ID and name are required");
  }

  await updateProfile(id, { name, description: description ?? "", permissions });
  redirect("/admin/profiles");
}
```

- [ ] **Step 2: Create `app/admin/profiles/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listProfiles } from "@/lib/profiles/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ProfilesPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    redirect("/");
  }

  const profiles = await listProfiles();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Profiles</h1>
        <Link href="/admin/profiles/new">
          <Button>New Profile</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow key={profile._id.toString()}>
              <TableCell className="font-medium">{profile.name}</TableCell>
              <TableCell className="text-muted-foreground">{profile.slug}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {profile.permissions.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Link href={`/admin/profiles/${profile._id}/edit`}>
                  <Button variant="outline" size="sm">Edit</Button>
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

- [ ] **Step 3: Create `app/admin/profiles/new/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { createProfileAction } from "../actions";

export default async function NewProfilePage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    redirect("/");
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createProfileAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" required placeholder="e.g. premium" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <Checkbox name="permissions" value={perm} />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">Create Profile</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note: shadcn/ui Checkbox may need `name` and `value` props for form submission. The implementer should check the actual component API. If Checkbox doesn't support native form values, use `<input type="checkbox">` styled with Tailwind instead.

- [ ] **Step 4: Create `app/admin/profiles/[id]/edit/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS, ALL_PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getProfileById } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateProfileAction } from "../../actions";

export default async function EditProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PROFILES)) {
    redirect("/");
  }

  const { id } = await params;
  const profile = await getProfileById(id);
  if (!profile) notFound();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Profile: {profile.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updateProfileAction} className="space-y-4">
          <input type="hidden" name="id" value={profile._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={profile.name} required />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <p className="text-sm text-muted-foreground">{profile.slug}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={profile.description} />
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    name="permissions"
                    value={perm}
                    defaultChecked={profile.permissions.includes(perm)}
                  />
                  {perm}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note: `params` is async in Next.js 16 — must `await` it. The slug is displayed as read-only text, not editable.

- [ ] **Step 5: Verify all pages compile and render**

```bash
yarn build
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/profiles/
git commit -m "feat: add admin profile pages (list, create, edit)"
```

---

### Task 10: Admin Plans Pages (List + Create + Edit)

**Files:**
- Create: `app/admin/plans/page.tsx`
- Create: `app/admin/plans/actions.ts`
- Create: `app/admin/plans/new/page.tsx`
- Create: `app/admin/plans/[id]/edit/page.tsx`

- [ ] **Step 1: Create `app/admin/plans/actions.ts`**

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { createPlan, updatePlan, togglePlanActive } from "@/lib/plans/service";
import { redirect } from "next/navigation";

async function requirePlansPermission() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    throw new Error("Unauthorized");
  }
}

export async function createPlanAction(formData: FormData) {
  await requirePlansPermission();

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const priceStr = formData.get("price") as string;
  const currency = formData.get("currency") as string;
  const interval = formData.get("interval") as string;
  const profileId = formData.get("profileId") as string;

  if (!name || !priceStr || !profileId) {
    throw new Error("Name, price, and profile are required");
  }

  const price = Math.round(parseFloat(priceStr) * 100);

  await createPlan({
    name,
    description: description ?? "",
    price,
    currency: currency || "BRL",
    interval: interval || "monthly",
    profileId,
  });
  redirect("/admin/plans");
}

export async function updatePlanAction(formData: FormData) {
  await requirePlansPermission();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const priceStr = formData.get("price") as string;
  const currency = formData.get("currency") as string;
  const interval = formData.get("interval") as string;
  const profileId = formData.get("profileId") as string;

  if (!id || !name || !priceStr || !profileId) {
    throw new Error("Required fields missing");
  }

  const price = Math.round(parseFloat(priceStr) * 100);

  await updatePlan(id, {
    name,
    description: description ?? "",
    price,
    currency: currency || "BRL",
    interval: interval || "monthly",
    profileId,
  });
  redirect("/admin/plans");
}

export async function togglePlanActiveAction(formData: FormData) {
  await requirePlansPermission();

  const id = formData.get("id") as string;
  if (!id) throw new Error("Plan ID required");

  await togglePlanActive(id);
  redirect("/admin/plans");
}
```

Note: Price is entered by admin in reais (e.g., "19.90") and converted to cents (1990) before storage.

- [ ] **Step 2: Create `app/admin/plans/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listPlans } from "@/lib/plans/service";
import { listProfiles } from "@/lib/profiles/service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { togglePlanActiveAction } from "./actions";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const [plans, profiles] = await Promise.all([listPlans(), listProfiles()]);
  const profileMap = new Map(profiles.map((p) => [p._id.toString(), p]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Plans</h1>
        <Link href="/admin/plans/new">
          <Button>New Plan</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Interval</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => {
            const profile = profileMap.get(plan.profileId.toString());
            return (
              <TableRow key={plan._id.toString()}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>
                  {(plan.price / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: plan.currency,
                  })}
                </TableCell>
                <TableCell>{plan.interval}</TableCell>
                <TableCell>{profile?.name ?? "Unknown"}</TableCell>
                <TableCell>
                  <Badge variant={plan.active ? "default" : "secondary"}>
                    {plan.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/admin/plans/${plan._id}/edit`}>
                      <Button variant="outline" size="sm">Edit</Button>
                    </Link>
                    <form action={togglePlanActiveAction}>
                      <input type="hidden" name="id" value={plan._id.toString()} />
                      <Button variant="outline" size="sm" type="submit">
                        {plan.active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/admin/plans/new/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect } from "next/navigation";
import { listProfiles } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createPlanAction } from "../actions";

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const profiles = await listProfiles();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createPlanAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (R$)</Label>
              <Input id="price" name="price" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue="BRL" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Interval</Label>
            <select
              id="interval"
              name="interval"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              defaultValue="monthly"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One Time</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileId">Profile</Label>
            <select
              id="profileId"
              name="profileId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              required
            >
              <option value="">Select a profile...</option>
              {profiles.map((p) => (
                <option key={p._id.toString()} value={p._id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Create Plan</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note: Using native `<select>` elements instead of shadcn Select for simpler form submission. The shadcn Select component uses Radix UI which requires client-side state management for form values. Native select works with Server Actions out of the box.

- [ ] **Step 4: Create `app/admin/plans/[id]/edit/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { redirect, notFound } from "next/navigation";
import { getPlanById } from "@/lib/plans/service";
import { listProfiles } from "@/lib/profiles/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updatePlanAction } from "../../actions";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || !hasPermission(session, PERMISSIONS.ADMIN_PLANS)) {
    redirect("/");
  }

  const { id } = await params;
  const [plan, profiles] = await Promise.all([
    getPlanById(id),
    listProfiles(),
  ]);
  if (!plan) notFound();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Edit Plan: {plan.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={updatePlanAction} className="space-y-4">
          <input type="hidden" name="id" value={plan._id.toString()} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={plan.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={plan.description} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (R$)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={(plan.price / 100).toFixed(2)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" name="currency" defaultValue={plan.currency} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Interval</Label>
            <select
              id="interval"
              name="interval"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              defaultValue={plan.interval}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One Time</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profileId">Profile</Label>
            <select
              id="profileId"
              name="profileId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground"
              defaultValue={plan.profileId.toString()}
              required
            >
              {profiles.map((p) => (
                <option key={p._id.toString()} value={p._id.toString()}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Verify all pages compile**

```bash
yarn build
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/plans/
git commit -m "feat: add admin plan pages (list, create, edit, toggle active)"
```

---

### Task 11: Final Cleanup + Lint + Build

**Files:**
- Modify: `app/page.tsx` (add admin link for admin users)

- [ ] **Step 1: Add admin link to home page**

In `app/page.tsx`, after the sign out button, add a link to `/admin` visible only to users with admin permissions:

```tsx
import { hasAnyPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import Link from "next/link";

// Inside the return, after the sign out form:
{hasAnyPermission(session, [
  PERMISSIONS.ADMIN_PROFILES,
  PERMISSIONS.ADMIN_PLANS,
  PERMISSIONS.ADMIN_USERS,
]) && (
  <Link href="/admin" className="mt-2 text-sm text-primary underline">
    Admin Panel
  </Link>
)}
```

- [ ] **Step 2: Run lint**

```bash
yarn lint
```

Fix any errors.

- [ ] **Step 3: Run build**

```bash
yarn build
```

Fix any errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add admin panel link for admin users on home page"
```

---

## Completion Checklist

After all tasks are done, verify:

- [ ] `yarn seed` runs and creates admin + free_tier profiles
- [ ] New user registration assigns free_tier profile
- [ ] JWT token includes `profileSlug` and `permissions`
- [ ] `/admin` redirects non-admin users to home
- [ ] `/admin/profiles` shows profile list (after manually promoting a user to admin in MongoDB)
- [ ] Can create a new profile with selected permissions
- [ ] Can edit an existing profile
- [ ] `/admin/plans` shows plan list
- [ ] Can create a plan linked to a profile
- [ ] Can edit a plan
- [ ] Can toggle plan active/inactive
- [ ] `yarn build` succeeds
- [ ] `yarn lint` passes
