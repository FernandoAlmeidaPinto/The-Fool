# Profiles, Permissions & Plans (CRUD) Design

**Date:** 2026-04-04
**Status:** Draft
**Scope:** Profile/permission system, plan CRUD, admin pages, seed script
**Depends on:** Foundation (auth, MongoDB, shadcn/ui)

---

## Overview

Role-based permission system for The Fool. Profiles define a set of permissions. Plans reference profiles and represent purchasable offerings (billing integration is out of scope). Users have exactly one profile; new users default to "free_tier".

**Approach:** Hybrid — profiles as MongoDB documents, permissions cached in JWT token for zero-query runtime checks.

## 1. Data Models

### Profile

```
Profile {
  _id: ObjectId
  name: string          // "Admin", "Free Tier", "Premium"
  slug: string (unique) // "admin", "free_tier", "premium"
  description: string
  permissions: string[] // ["readings:view", "admin:profiles"]
  createdAt: Date
  updatedAt: Date
}
```

### Plan

```
Plan {
  _id: ObjectId
  name: string          // "Plano Premium Mensal"
  description: string
  price: number         // in cents (e.g., 1990 = R$19.90)
  currency: string      // "BRL"
  profileId: ObjectId   // ref -> Profile
  active: boolean       // admin can deactivate without deleting
  createdAt: Date
  updatedAt: Date
}
```

### User (modify existing)

Add `profileId` field:

```
User {
  ...(existing fields)
  profileId: ObjectId   // ref -> Profile, default: free_tier._id
}
```

**Price in cents** avoids floating-point issues. `currency` field prepares for future i18n without adding complexity now.

**No hard deletes** — profiles and plans can be deactivated but not deleted (prevents broken references in users).

## 2. Permissions — Enum and Format

**Format:** `resource:action`

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

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
```

**Seed profiles:**

- **admin** — all permissions
- **free_tier** — `readings:view`, `readings:create`

The enum is extensible — new permissions are added to the object as features emerge. Checking is by string, so existing permissions in the database remain valid.

## 3. JWT Token — Permission Cache

**JWT callback** (modify `lib/auth/auth.ts`): On login (when `user` exists in the callback), fetch the user's Profile and inject `permissions` and `profileSlug` into the token.

```
JWT token {
  ...existing fields,
  profileSlug: "free_tier",
  permissions: ["readings:view", "readings:create"]
}
```

**Session callback** passes through to `session.user`:

```
session.user {
  ...existing fields,
  profileSlug: "free_tier",
  permissions: ["readings:view", "readings:create"]
}
```

**Propagation:** Permissions only update on next login. Acceptable for MVP. Future enhancement: refresh token every 15 minutes + push new token when plan changes (out of scope for this phase).

**Permission check helper:**

```typescript
// lib/permissions/check.ts
export function hasPermission(
  session: Session | null,
  permission: Permission
): boolean {
  return session?.user?.permissions?.includes(permission) ?? false;
}
```

Used in Server Components, Server Actions, and Route Handlers to protect routes.

## 4. Admin Pages

### Routes

- `/admin` — redirect to `/admin/profiles`
- `/admin/profiles` — list all profiles (table)
- `/admin/profiles/new` — create profile form (name, slug, description, permission checkboxes)
- `/admin/profiles/[id]/edit` — edit existing profile
- `/admin/plans` — list all plans (table)
- `/admin/plans/new` — create plan form (name, description, price, profile select, active toggle)
- `/admin/plans/[id]/edit` — edit existing plan

### Protection

All `/admin/*` routes check permissions via `hasPermission()`. Users without `admin:profiles` or `admin:plans` are redirected to home.

The admin layout (`app/admin/layout.tsx`) wraps all admin pages and performs the permission check once.

### UI

shadcn/ui components (Table, Card, Input, Button, Label, Select, Checkbox) with Ivory & Charcoal palette. Functional, not fancy.

## 5. Seed Script

**File:** `lib/db/seed.ts` + npm script `yarn seed`

- Creates Profile "admin" with all permissions from PERMISSIONS enum
- Creates Profile "free_tier" with `readings:view`, `readings:create`
- Idempotent — uses upsert by slug, safe to run multiple times

## 6. Registration Flow Change

Modify `register` in `lib/auth/auth-actions.ts`:

- After creating User, look up Profile with slug "free_tier" and assign its `_id` as `profileId`
- If free_tier profile doesn't exist (seed hasn't run), fail with a clear error message

## 7. Project Structure (new/modified files)

```
lib/
  permissions/
    constants.ts           # PERMISSIONS enum + Permission type
    check.ts               # hasPermission() helper
  profiles/
    model.ts               # Profile Mongoose schema
    service.ts             # CRUD: create, update, list, getBySlug
  plans/
    model.ts               # Plan Mongoose schema
    service.ts             # CRUD: create, update, list, toggleActive
  db/
    seed.ts                # Seed script (profiles)
  auth/
    auth.ts                # Modify JWT/session callbacks to include permissions
    auth-actions.ts        # Modify register to assign free_tier profile
  users/
    model.ts               # Add profileId field
app/
  admin/
    layout.tsx             # Permission check wrapper
    profiles/
      page.tsx             # List profiles
      new/page.tsx         # Create profile form
      [id]/edit/page.tsx   # Edit profile form
    plans/
      page.tsx             # List plans
      new/page.tsx         # Create plan form
      [id]/edit/page.tsx   # Edit plan form
```

## Out of Scope

- Billing / Stripe integration (separate sub-project)
- Token refresh every 15 minutes (future enhancement)
- Push new token on plan change (future enhancement)
- Hard delete of profiles or plans
- User self-service plan selection UI
