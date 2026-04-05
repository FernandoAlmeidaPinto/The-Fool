# Admin — Lista de Usuários

**Date:** 2026-04-05
**Status:** Approved

## Overview

Add an admin page at `/admin/users` that lists all users with their profile, subscription plan, and subscription dates. Server-side pagination, 20 per page.

## Page: `/admin/users`

- Permission: `admin:users`
- Paginated: 20 per page, `?page=N` URL param
- Sorted by `createdAt` descending (newest first)

## Table columns

| Column | Source | Notes |
|--------|--------|-------|
| Nome | `user.name` | |
| Email | `user.email` | |
| Perfil | `profile.name` via `user.profileId` | "Sem perfil" if null |
| Plano | `plan.name` via active subscription | "Free Tier" if no subscription |
| Início | `subscription.startsAt` | "—" if no subscription |
| Renova | `subscription.renewsAt` | "—" if no subscription |
| Cadastro | `user.createdAt` | Date formatted pt-BR |

## Data resolution

For each page of users:
1. Fetch users with pagination (`skip`/`limit`)
2. Collect distinct `profileId` values → batch fetch profiles → build map
3. Collect distinct `userId` values → batch fetch active subscriptions → build map
4. For subscriptions found, collect distinct `planId` values → batch fetch plans → build map
5. Render table joining the maps

This avoids N+1 queries — 4 queries total regardless of page size.

## Service

Add to `lib/users/service.ts`:
- `listUsers(page, perPage)` → `{ items: IUser[], total: number }`

Add to `lib/subscriptions/service.ts`:
- `getActiveSubscriptionsByUserIds(userIds: string[])` → `ISubscription[]`

## Files

### New
- `app/(dashboard)/admin/users/page.tsx` — Server Component, table + pagination

### Modified
- `lib/users/service.ts` — add `listUsers`
- `lib/subscriptions/service.ts` — add `getActiveSubscriptionsByUserIds`

## Out of Scope

- User detail page (future)
- Edit user from admin
- Usage statistics per user
- Search/filter
