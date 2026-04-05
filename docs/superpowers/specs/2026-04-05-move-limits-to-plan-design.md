# Move Limits from Profile to Plan

**Date:** 2026-04-05
**Status:** Approved

## Overview

Move `readingsMonthlyLimit` from the Profile schema to the Plan schema. Profiles hold only permissions (what you can do), Plans hold limits (how much you can do). The quota system reads limits from the user's active subscription's plan instead of from the profile.

## Model Changes

### Plan schema (`lib/plans/model.ts`)
- Add: `readingsMonthlyLimit: Number | null` (default null = unlimited)
- Add to `IPlan` interface

### Profile schema (`lib/profiles/model.ts`)
- Remove: `readingsMonthlyLimit` from `IProfile` and `ProfileSchema`

### Subscription — no changes
Already has `planId` which links to the plan with limits.

## Free Tier Default

Users without a subscription (free_tier) get a hardcoded limit:

```typescript
const FREE_TIER_READINGS_LIMIT = 5;
```

Defined as a constant in `lib/readings/quota.ts`. No need to query a "free plan" — free_tier is not a subscribable plan.

## Quota Flow (new)

`checkReadingQuota` changes signature — no longer receives `readingsMonthlyLimit` as a parameter. Instead:

1. Get active subscription for the user
2. If subscription exists → fetch the plan → use `plan.readingsMonthlyLimit`
3. If no subscription → use `FREE_TIER_READINGS_LIMIT` (5)
4. If limit is null → unlimited

This simplifies all consumers — they just call `checkReadingQuota(userId)` without fetching the profile first.

## Admin UI

Plan create/edit pages get a new field:
- Label: "Leituras por mês"
- Type: number input, optional
- Empty = null (unlimited)
- Server action: parse and save as `readingsMonthlyLimit`

## Seed Changes

- Remove `readingsMonthlyLimit` from admin and free_tier profile seeds (field no longer exists on Profile)

## Files Modified

- `lib/plans/model.ts` — add `readingsMonthlyLimit` to IPlan + schema
- `lib/profiles/model.ts` — remove `readingsMonthlyLimit` from IProfile + schema
- `lib/readings/quota.ts` — new signature `checkReadingQuota(userId)`, fetch limit from plan via subscription
- `lib/db/seed.ts` — remove `readingsMonthlyLimit` from profile seeds
- `app/(dashboard)/admin/plans/new/page.tsx` — add readings limit field
- `app/(dashboard)/admin/plans/[id]/edit/page.tsx` — add readings limit field
- `app/(dashboard)/admin/plans/actions.ts` — process readingsMonthlyLimit field
- `app/(dashboard)/leituras/page.tsx` — simplify to `checkReadingQuota(userId)`
- `app/(dashboard)/leituras/nova/page.tsx` — simplify to `checkReadingQuota(userId)`
- `app/(dashboard)/leituras/actions.ts` — simplify to `checkReadingQuota(userId)`
- `app/(dashboard)/perfil/page.tsx` — simplify to `checkReadingQuota(userId)`

## Out of Scope

- Per-feature limits beyond readings (courses, etc.)
- Configurable free tier limits via admin
