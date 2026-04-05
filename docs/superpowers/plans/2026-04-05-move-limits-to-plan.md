# Move Limits to Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `readingsMonthlyLimit` from Profile to Plan, simplifying the quota flow so consumers just call `checkReadingQuota(userId)`.

**Architecture:** Add field to Plan model, remove from Profile model, rewrite quota to self-resolve the limit from the user's subscription's plan, update all consumers to use the simplified signature, add limit field to plan admin forms.

**Tech Stack:** Next.js 16, Mongoose, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-05-move-limits-to-plan-design.md`

---

### Task 1: Model changes (Plan + Profile)

**Files:**
- Modify: `lib/plans/model.ts`
- Modify: `lib/profiles/model.ts`
- Modify: `lib/db/seed.ts`

- [ ] **Step 1: Add readingsMonthlyLimit to Plan**

In `lib/plans/model.ts`, add to `IPlan` interface after `active`:

```typescript
readingsMonthlyLimit: number | null;
```

Add to `PlanSchema` after `active`:

```typescript
readingsMonthlyLimit: { type: Number, default: null },
```

- [ ] **Step 2: Remove readingsMonthlyLimit from Profile**

In `lib/profiles/model.ts`, remove `readingsMonthlyLimit: number | null;` from `IProfile` interface and remove `readingsMonthlyLimit: { type: Number, default: null },` from `ProfileSchema`.

- [ ] **Step 3: Update seed**

In `lib/db/seed.ts`, remove `readingsMonthlyLimit: null` from admin profile seed and `readingsMonthlyLimit: 5` from free_tier profile seed.

- [ ] **Step 4: Verify build**

```bash
yarn build
```

This WILL fail because consumers still reference `profile.readingsMonthlyLimit`. That's expected — we fix consumers in the next tasks.

Actually, build may still pass if the consumers use optional chaining (`profile?.readingsMonthlyLimit ?? null`). Verify and proceed either way.

- [ ] **Step 5: Commit**

```bash
git add lib/plans/model.ts lib/profiles/model.ts lib/db/seed.ts
git commit -m "refactor: move readingsMonthlyLimit from Profile to Plan"
```

---

### Task 2: Rewrite quota service

**Files:**
- Modify: `lib/readings/quota.ts`

- [ ] **Step 1: Replace entire file**

Replace the entire contents of `lib/readings/quota.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { UserInterpretation } from "./interpretation-model";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { Plan } from "@/lib/plans/model";

const FREE_TIER_READINGS_LIMIT = 5;

/**
 * Count user readings within a date range.
 */
async function countReadingsInRange(
  userId: string,
  from: Date,
  to: Date
): Promise<number> {
  await connectDB();
  return UserInterpretation.countDocuments({
    userId,
    createdAt: { $gte: from, $lt: to },
  });
}

/**
 * Get the readings monthly limit for a user.
 * If subscribed: from the plan. If not: FREE_TIER_READINGS_LIMIT.
 */
async function getReadingsLimit(
  userId: string
): Promise<{ limit: number | null; subscription: Awaited<ReturnType<typeof getActiveSubscription>> }> {
  const subscription = await getActiveSubscription(userId);

  if (subscription) {
    await connectDB();
    const plan = await Plan.findById(subscription.planId).lean();
    return { limit: plan?.readingsMonthlyLimit ?? null, subscription };
  }

  return { limit: FREE_TIER_READINGS_LIMIT, subscription: null };
}

/**
 * Check if user can create a new reading.
 * Self-resolves the limit from the user's subscription plan.
 * Returns { allowed, used, limit, cycleEnd } for quota display.
 */
export async function checkReadingQuota(
  userId: string
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  cycleEnd: Date | null;
}> {
  const { limit, subscription } = await getReadingsLimit(userId);

  if (limit === null) {
    return { allowed: true, used: 0, limit: null, cycleEnd: null };
  }

  let from: Date;
  let to: Date;

  if (subscription) {
    from = new Date(subscription.startsAt);
    to = new Date(subscription.renewsAt);
  } else {
    // Fallback: calendar month for free tier
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const used = await countReadingsInRange(userId, from, to);

  return {
    allowed: used < limit,
    used,
    limit,
    cycleEnd: subscription ? to : null,
  };
}
```

Key change: `checkReadingQuota` now takes only `userId` — it resolves the limit internally.

- [ ] **Step 2: Verify build**

```bash
yarn build
```

Will likely fail because consumers pass 2 args. Fix in next task.

- [ ] **Step 3: Commit**

```bash
git add lib/readings/quota.ts
git commit -m "refactor: quota self-resolves limit from subscription plan"
```

---

### Task 3: Update all quota consumers

**Files:**
- Modify: `app/(dashboard)/leituras/page.tsx`
- Modify: `app/(dashboard)/leituras/nova/page.tsx`
- Modify: `app/(dashboard)/leituras/actions.ts`
- Modify: `app/(dashboard)/perfil/page.tsx`

- [ ] **Step 1: Update leituras page**

In `app/(dashboard)/leituras/page.tsx`:

Remove the `getProfileBySlug` import (line 6). Remove the `profilePromise` variable and the Promise.all that includes it. Simplify to:

```typescript
// Replace lines 30-45 with:
  const historyPromise = listUserInterpretations(session.user.id, page, PER_PAGE);
  const { items: readings, total } = await historyPromise;

  let quota: { allowed: boolean; used: number; limit: number | null } | null = null;
  if (canCreate) {
    quota = await checkReadingQuota(session.user.id);
  }
```

Remove the unused `getProfileBySlug` import.

- [ ] **Step 2: Update leituras/nova page**

In `app/(dashboard)/leituras/nova/page.tsx`:

Remove the `getProfileBySlug` import (line 6). Replace lines 18-22:

```typescript
// Before:
  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;
  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
  const quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);

// After:
  const quota = await checkReadingQuota(session.user.id);
```

- [ ] **Step 3: Update leituras actions**

In `app/(dashboard)/leituras/actions.ts`:

Remove the `getProfileBySlug` import (line 8). Replace lines 20-27:

```typescript
// Before:
  // Check quota
  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;

  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;

  const quota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);

// After:
  // Check quota
  const quota = await checkReadingQuota(session.user.id);
```

- [ ] **Step 4: Update perfil page**

In `app/(dashboard)/perfil/page.tsx`:

Remove the `getProfileBySlug` import (line 4). Replace lines 20-29:

```typescript
// Before:
  // Fetch profile for plan info
  const profile = session.user.profileSlug
    ? await getProfileBySlug(session.user.profileSlug)
    : null;

  // Fetch reading quota
  const readingsMonthlyLimit = profile?.readingsMonthlyLimit ?? null;
  const readingQuota = await checkReadingQuota(session.user.id, readingsMonthlyLimit);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const subscription = await getActiveSubscription(session.user.id);

// After:
  const readingQuota = await checkReadingQuota(session.user.id);
```

Also update the `planName` line — since we no longer fetch profile here, we need to get the plan name differently. Use `getActiveSubscription` + plan lookup:

```typescript
  // After readingQuota, add:
  const subscription = await getActiveSubscription(session.user.id);
  let planName = "Free Tier";
  if (subscription) {
    const { getPlanById } = await import("@/lib/plans/service");
    const plan = await getPlanById(subscription.planId.toString());
    planName = plan?.name ?? "Plano";
  }
```

Remove the old `const planName = profile?.name ?? "Sem plano";` line.

Also remove the `getProfileBySlug` import and the `getActiveSubscription` import is already there — keep it.

- [ ] **Step 5: Verify build**

```bash
yarn build
```

Expected: Build passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/leituras/page.tsx" "app/(dashboard)/leituras/nova/page.tsx" "app/(dashboard)/leituras/actions.ts" "app/(dashboard)/perfil/page.tsx"
git commit -m "refactor: simplify all quota consumers to checkReadingQuota(userId)"
```

---

### Task 4: Add limit field to plan admin forms

**Files:**
- Modify: `app/(dashboard)/admin/plans/new/page.tsx`
- Modify: `app/(dashboard)/admin/plans/[id]/edit/page.tsx`
- Modify: `app/(dashboard)/admin/plans/actions.ts`

- [ ] **Step 1: Add field to new plan page**

In `app/(dashboard)/admin/plans/new/page.tsx`, after the interval field and before the profile select, add:

```tsx
          <div className="space-y-2">
            <Label htmlFor="readingsMonthlyLimit">Leituras por mês</Label>
            <Input
              id="readingsMonthlyLimit"
              name="readingsMonthlyLimit"
              type="number"
              min="0"
              placeholder="Vazio = ilimitado"
            />
            <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado.</p>
          </div>
```

- [ ] **Step 2: Add field to edit plan page**

In `app/(dashboard)/admin/plans/[id]/edit/page.tsx`, same position, add:

```tsx
          <div className="space-y-2">
            <Label htmlFor="readingsMonthlyLimit">Leituras por mês</Label>
            <Input
              id="readingsMonthlyLimit"
              name="readingsMonthlyLimit"
              type="number"
              min="0"
              defaultValue={plan.readingsMonthlyLimit?.toString() ?? ""}
              placeholder="Vazio = ilimitado"
            />
            <p className="text-xs text-muted-foreground">Deixe vazio para ilimitado.</p>
          </div>
```

- [ ] **Step 3: Update plan actions to process the field**

In `app/(dashboard)/admin/plans/actions.ts`:

In `createPlanAction`, after `const profileId = ...` (line 25), add:

```typescript
  const readingsLimitStr = formData.get("readingsMonthlyLimit") as string;
  const readingsMonthlyLimit = readingsLimitStr ? parseInt(readingsLimitStr, 10) : null;
```

Add `readingsMonthlyLimit` to the `createPlan` call:

```typescript
  await createPlan({
    name,
    description: sanitizeHtml(description ?? ""),
    price,
    currency: currency || "BRL",
    interval: interval || "monthly",
    profileId,
    readingsMonthlyLimit,
  });
```

Same for `updatePlanAction` — after `const profileId = ...` (line 53), add:

```typescript
  const readingsLimitStr = formData.get("readingsMonthlyLimit") as string;
  const readingsMonthlyLimit = readingsLimitStr ? parseInt(readingsLimitStr, 10) : null;
```

Add to the `updatePlan` call:

```typescript
  await updatePlan(id, {
    name,
    description: sanitizeHtml(description ?? ""),
    price,
    currency: currency || "BRL",
    interval: interval || "monthly",
    profileId,
    readingsMonthlyLimit,
  });
```

- [ ] **Step 4: Update plan service types**

In `lib/plans/service.ts`, add `readingsMonthlyLimit` to the `createPlan` data parameter type:

Add `readingsMonthlyLimit?: number | null;` to the create function's data type.

Add `readingsMonthlyLimit?: number | null;` to the update function's data type.

- [ ] **Step 5: Verify build and lint**

```bash
yarn build && yarn lint
```

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/admin/plans/new/page.tsx" "app/(dashboard)/admin/plans/[id]/edit/page.tsx" "app/(dashboard)/admin/plans/actions.ts" lib/plans/service.ts
git commit -m "feat: add readingsMonthlyLimit field to plan admin forms"
```
