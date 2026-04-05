# Plans & Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plans page where users see available plans and can subscribe (mockado), with a subscriptions model that tracks billing cycles and controls quota.

**Architecture:** New Subscription model + service, server actions for subscribe/cancel, a plans page with plan cards, quota migration to use subscription dates, and sidebar update.

**Tech Stack:** Next.js 16, Mongoose, Tailwind CSS 4, lucide-react

**Spec:** `docs/superpowers/specs/2026-04-05-plans-subscriptions-design.md`

---

### Task 1: Subscription model

**Files:**
- Create: `lib/subscriptions/model.ts`

- [ ] **Step 1: Create the model**

Create `lib/subscriptions/model.ts`:

```typescript
import mongoose, { Schema, models, model } from "mongoose";
import type { Model } from "mongoose";

export interface ISubscription {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  status: "active" | "expired" | "cancelled";
  startsAt: Date;
  renewsAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startsAt: { type: Date, required: true },
    renewsAt: { type: Date, required: true },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1, status: 1 });

export const Subscription: Model<ISubscription> =
  models.Subscription ?? model<ISubscription>("Subscription", SubscriptionSchema);
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/subscriptions/model.ts
git commit -m "feat: add Subscription model"
```

---

### Task 2: Subscription service

**Files:**
- Create: `lib/subscriptions/service.ts`
- Modify: `lib/profiles/service.ts`

- [ ] **Step 1: Add getFreeTierProfile helper**

Add to the end of `lib/profiles/service.ts`:

```typescript
export async function getFreeTierProfile(): Promise<IProfile | null> {
  await connectDB();
  return Profile.findOne({ slug: "free_tier" }).lean();
}
```

- [ ] **Step 2: Create subscription service**

Create `lib/subscriptions/service.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { Subscription } from "./model";
import type { ISubscription } from "./model";
import { User } from "@/lib/users/model";
import { Plan } from "@/lib/plans/model";
import { getFreeTierProfile } from "@/lib/profiles/service";

const CYCLE_DAYS = 30;

/**
 * Get the user's active subscription (status=active AND not expired).
 */
export async function getActiveSubscription(
  userId: string
): Promise<ISubscription | null> {
  await connectDB();

  const sub = await Subscription.findOne({
    userId,
    status: "active",
  }).lean();

  if (!sub) return null;

  // Check if expired by date
  if (new Date(sub.renewsAt) < new Date()) {
    // Mark as expired in background (don't block)
    Subscription.findByIdAndUpdate(sub._id, { status: "expired" }).exec();
    return null;
  }

  return sub;
}

/**
 * Subscribe user to a plan. Cancels any existing active subscription.
 */
export async function subscribeToPlan(
  userId: string,
  planId: string
): Promise<ISubscription> {
  await connectDB();

  const plan = await Plan.findById(planId).lean();
  if (!plan) throw new Error("Plano não encontrado");
  if (!plan.active) throw new Error("Plano não está disponível");

  // Cancel any existing active subscription
  await Subscription.updateMany(
    { userId, status: "active" },
    { status: "cancelled" }
  );

  const now = new Date();
  const renewsAt = new Date(now.getTime() + CYCLE_DAYS * 24 * 60 * 60 * 1000);

  // Create new subscription
  const subscription = await Subscription.create({
    userId,
    planId: plan._id,
    profileId: plan.profileId,
    status: "active",
    startsAt: now,
    renewsAt,
  });

  // Update user's profile to the plan's profile
  await User.findByIdAndUpdate(userId, { profileId: plan.profileId });

  return subscription.toObject();
}

/**
 * Cancel user's active subscription. Reverts to free_tier profile.
 */
export async function cancelSubscription(
  userId: string
): Promise<boolean> {
  await connectDB();

  const result = await Subscription.updateMany(
    { userId, status: "active" },
    { status: "cancelled" }
  );

  if (result.modifiedCount === 0) return false;

  // Revert user to free_tier profile
  const freeTier = await getFreeTierProfile();
  if (freeTier) {
    await User.findByIdAndUpdate(userId, { profileId: freeTier._id });
  }

  return true;
}
```

- [ ] **Step 3: Verify build**

```bash
yarn build
```

- [ ] **Step 4: Commit**

```bash
git add lib/subscriptions/service.ts lib/profiles/service.ts
git commit -m "feat: add subscription service with subscribe and cancel"
```

---

### Task 3: Migrate quota to use subscription dates

**Files:**
- Modify: `lib/readings/quota.ts`

- [ ] **Step 1: Update quota to support subscription cycle**

Replace the entire contents of `lib/readings/quota.ts`:

```typescript
import { connectDB } from "@/lib/db/mongoose";
import { UserInterpretation } from "./interpretation-model";
import { getActiveSubscription } from "@/lib/subscriptions/service";

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
 * Check if user can create a new reading.
 * Uses subscription cycle dates if available, otherwise calendar month.
 * Returns { allowed, used, limit, cycleStart, cycleEnd } for quota display.
 */
export async function checkReadingQuota(
  userId: string,
  readingsMonthlyLimit: number | null
): Promise<{
  allowed: boolean;
  used: number;
  limit: number | null;
  cycleEnd: Date | null;
}> {
  if (readingsMonthlyLimit === null) {
    return { allowed: true, used: 0, limit: null, cycleEnd: null };
  }

  // Try to use subscription cycle dates
  const subscription = await getActiveSubscription(userId);

  let from: Date;
  let to: Date;

  if (subscription) {
    from = new Date(subscription.startsAt);
    to = new Date(subscription.renewsAt);
  } else {
    // Fallback: calendar month
    const now = new Date();
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const used = await countReadingsInRange(userId, from, to);

  return {
    allowed: used < readingsMonthlyLimit,
    used,
    limit: readingsMonthlyLimit,
    cycleEnd: subscription ? to : null,
  };
}
```

- [ ] **Step 2: Update all consumers of checkReadingQuota**

The return type now includes `cycleEnd`. Consumers that destructure the result need to handle it. Check these files — they should still work because they only access `allowed`, `used`, and `limit` which are unchanged. The new `cycleEnd` field is additive.

Verify by building:

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add lib/readings/quota.ts
git commit -m "feat: migrate quota to use subscription cycle dates"
```

---

### Task 4: Server actions

**Files:**
- Create: `app/(dashboard)/planos/actions.ts`

- [ ] **Step 1: Create the actions**

Create `app/(dashboard)/planos/actions.ts`:

```typescript
"use server";

import { auth } from "@/lib/auth/auth";
import { subscribeToPlan, cancelSubscription } from "@/lib/subscriptions/service";
import { revalidatePath } from "next/cache";

export async function subscribeToPlanAction(
  planId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    await subscribeToPlan(session.user.id, planId);
    revalidatePath("/planos");
    revalidatePath("/perfil");
    revalidatePath("/leituras");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao assinar" };
  }
}

export async function cancelSubscriptionAction(): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Não autenticado" };
  }

  try {
    const cancelled = await cancelSubscription(session.user.id);
    if (!cancelled) {
      return { success: false, error: "Nenhuma assinatura ativa encontrada" };
    }
    revalidatePath("/planos");
    revalidatePath("/perfil");
    revalidatePath("/leituras");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao cancelar" };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/planos/actions.ts"
git commit -m "feat: add subscribe and cancel server actions"
```

---

### Task 5: Plan card component

**Files:**
- Create: `components/plans/plan-card.tsx`

- [ ] **Step 1: Create the component**

Create `components/plans/plan-card.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { subscribeToPlanAction, cancelSubscriptionAction } from "@/app/(dashboard)/planos/actions";
import { useRouter } from "next/navigation";

interface PlanCardProps {
  plan: {
    _id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: string;
  };
  isCurrent: boolean;
  hasSubscription: boolean;
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "/mês",
  yearly: "/ano",
  one_time: " (único)",
};

export function PlanCard({ plan, isCurrent, hasSubscription }: PlanCardProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: plan.currency,
  }).format(plan.price / 100);

  const handleSubscribe = () => {
    startTransition(async () => {
      const result = await subscribeToPlanAction(plan._id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleCancel = () => {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura? Você voltará para o plano gratuito.")) {
      return;
    }
    startTransition(async () => {
      const result = await cancelSubscriptionAction();
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div
      className={`rounded-lg border bg-card p-6 shadow-sm ${
        isCurrent
          ? "border-primary ring-2 ring-primary/20"
          : "border-border"
      }`}
    >
      <div className="space-y-4">
        <div>
          {isCurrent && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
              Plano Atual
            </span>
          )}
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {plan.description && (
            <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
          )}
        </div>

        <div>
          <span className="text-3xl font-bold">{formattedPrice}</span>
          <span className="text-sm text-muted-foreground">
            {INTERVAL_LABELS[plan.interval] ?? ""}
          </span>
        </div>

        {isCurrent ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? "Cancelando..." : "Cancelar Assinatura"}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleSubscribe}
            disabled={isPending}
          >
            {isPending ? "Assinando..." : "Assinar"}
          </Button>
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
git add components/plans/plan-card.tsx
git commit -m "feat: add PlanCard client component"
```

---

### Task 6: Plans page

**Files:**
- Create: `app/(dashboard)/planos/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(dashboard)/planos/page.tsx`:

```tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { listPlans } from "@/lib/plans/service";
import { getActiveSubscription } from "@/lib/subscriptions/service";
import { PlanCard } from "@/components/plans/plan-card";

export default async function PlanosPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const [plans, subscription] = await Promise.all([
    listPlans(),
    getActiveSubscription(session.user.id),
  ]);

  // Only show active plans
  const activePlans = plans.filter((p) => p.active);

  // Format renewal date
  const renewsAt = subscription
    ? new Date(subscription.renewsAt).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-foreground mb-2">Planos</h2>

      {/* Current plan status */}
      <div className="mb-8">
        {subscription ? (
          <p className="text-sm text-muted-foreground">
            Sua assinatura renova em <strong>{renewsAt}</strong>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você está no plano gratuito
          </p>
        )}
      </div>

      {/* Plan cards */}
      {activePlans.length === 0 ? (
        <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePlans.map((plan) => (
            <PlanCard
              key={plan._id.toString()}
              plan={{
                _id: plan._id.toString(),
                name: plan.name,
                description: plan.description,
                price: plan.price,
                currency: plan.currency,
                interval: plan.interval,
              }}
              isCurrent={
                subscription?.planId.toString() === plan._id.toString()
              }
              hasSubscription={!!subscription}
            />
          ))}
        </div>
      )}
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
git add "app/(dashboard)/planos/page.tsx"
git commit -m "feat: add plans page with subscription status"
```

---

### Task 7: Sidebar update

**Files:**
- Modify: `components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add Crown import and Planos item**

In `components/dashboard/sidebar.tsx`:

Add `Crown` to the lucide-react import:

```typescript
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  Layers,
  User,
  Settings,
  Shield,
  CreditCard,
  Crown,
} from "lucide-react";
```

Add the "Planos" section between the "Conta" section and the Admin section. After the closing `</nav>` of the Conta section (line 54), add:

```tsx
      <div className="my-2 border-t border-border" />

      <nav className="space-y-1">
        <SidebarItem href="/planos" label="Planos" icon={Crown} onNavigate={onNavigate} />
      </nav>
```

- [ ] **Step 2: Verify build**

```bash
yarn build
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat: add Planos item with Crown icon to sidebar"
```

---

### Task 8: Update profile page to show subscription cycle

**Files:**
- Modify: `app/(dashboard)/perfil/page.tsx`

- [ ] **Step 1: Update profile page to use subscription dates**

In `app/(dashboard)/perfil/page.tsx`:

Add import:
```typescript
import { getActiveSubscription } from "@/lib/subscriptions/service";
```

After the `readingQuota` line, add:
```typescript
  const subscription = await getActiveSubscription(session.user.id);
```

Update the `limits` array to include cycle info:
```typescript
  const limits = [
    {
      label: "Leituras" + (readingQuota.cycleEnd
        ? ` (renova em ${new Date(readingQuota.cycleEnd).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })})`
        : " este mês"),
      used: readingQuota.used,
      limit: readingQuota.limit,
    },
  ];
```

Note: The `cycleEnd` field was added to the `checkReadingQuota` return type in Task 3.

- [ ] **Step 2: Verify build and lint**

```bash
yarn build && yarn lint
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/perfil/page.tsx"
git commit -m "feat: show subscription cycle dates in profile plan section"
```
