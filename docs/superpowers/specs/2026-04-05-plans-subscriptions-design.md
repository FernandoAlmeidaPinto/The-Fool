# Página de Planos e Subscriptions

**Date:** 2026-04-05
**Status:** Approved

## Overview

Add a plans page where users see their current plan, available plans, and can subscribe (mockado, sem pagamento real). A new `subscriptions` collection tracks who subscribed to what and when, controlling the billing cycle for quota calculations. When Stripe enters, the subscription creation will be conditioned on payment confirmation.

## Data Model

### New collection: `subscriptions`

```typescript
interface ISubscription {
  _id: ObjectId;
  userId: ObjectId;
  planId: ObjectId;
  profileId: ObjectId;       // profile associated with the plan (denormalized for easy access)
  status: "active" | "expired" | "cancelled";
  startsAt: Date;
  renewsAt: Date;            // 30 days after startsAt
  createdAt: Date;
  updatedAt: Date;
}
```

- Index: `userId + status` (find active subscription)
- Only one active subscription per user at a time
- When subscribing: previous active subscription is cancelled
- `profileId` is denormalized from the Plan to avoid joins when checking permissions

### Subscription lifecycle

1. **Subscribe:** Create subscription (`status: "active"`, `startsAt: now`, `renewsAt: now + 30 days`), update `user.profileId` to the plan's profile
2. **Cancel:** Set `status: "cancelled"`, revert `user.profileId` to free_tier profile
3. **Expire:** When `renewsAt < now`, subscription is effectively expired. The status check should consider the date. Future: Stripe webhook renews by updating `renewsAt`.
4. **Change plan:** Cancel current, create new subscription

### Determining active subscription

A subscription is considered active when `status === "active" AND renewsAt > now`. If `renewsAt` has passed, the subscription should be treated as expired even if status hasn't been updated yet. The service should handle this gracefully.

## Quota Migration

### Current behavior
`countReadingsThisMonth` counts from day 1 of calendar month.

### New behavior
- If user has an active subscription: count readings between `startsAt` and `renewsAt`
- If no subscription (free_tier): keep current behavior (day 1 of month)
- `checkReadingQuota` signature changes to accept optional subscription dates

## Page: `/planos`

- Accessible by any authenticated user (no special permission)
- Shows current plan status at the top
- Grid of available plans below

### Current plan section
- If has active subscription: plan name, price, "Renova em {date}", button "Cancelar Assinatura"
- If no subscription (free_tier): "Você está no plano gratuito"

### Plan cards
- Each active plan displayed as a card: name, price formatted (R$ XX,XX/mês), description
- Current plan card: highlighted border, "Plano Atual" badge, no action button
- Other plans: "Assinar" button
- Free tier: not shown as a subscribable plan (it's the default fallback)

### Subscribe flow (mockado)
1. User clicks "Assinar" on a plan
2. Server action: cancels any existing subscription, creates new one, updates user profileId
3. Page refreshes showing new plan as current
4. Success message displayed

### Cancel flow
1. User clicks "Cancelar Assinatura"
2. Confirmation dialog
3. Server action: cancels subscription, reverts user to free_tier profileId
4. Page refreshes

## Sidebar

- New item "Planos" with `Crown` icon from lucide-react
- Positioned at the bottom of the sidebar, separated by a divider
- Below the "Conta" section, above the Admin section (if present)

## Files

### New
- `lib/subscriptions/model.ts` — Subscription schema
- `lib/subscriptions/service.ts` — getActiveSubscription, subscribe, cancel, isExpired
- `app/(dashboard)/planos/page.tsx` — plans page (Server Component)
- `app/(dashboard)/planos/actions.ts` — subscribeToPlanAction, cancelSubscriptionAction
- `components/plans/plan-card.tsx` — client component for plan card with subscribe button

### Modified
- `lib/readings/quota.ts` — use subscription dates for cycle-based counting
- `components/dashboard/sidebar.tsx` — add "Planos" item at bottom
- `app/(dashboard)/perfil/page.tsx` — use subscription dates for "Meu Plano" section display
- `lib/profiles/service.ts` — add `getFreeTierProfile()` helper to find free_tier by slug

## Out of Scope

- Stripe integration (checkout, webhooks, payment processing)
- CPF or billing data collection
- Plan comparison table with feature matrix
- Prorated billing for plan changes
- Auto-expiration cron job (status check is date-based)
- Yearly billing interval support (structure exists but not exposed in UI)
