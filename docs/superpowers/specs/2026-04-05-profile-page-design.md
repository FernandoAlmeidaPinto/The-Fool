# Página Meu Perfil

**Date:** 2026-04-05
**Status:** Approved

## Overview

Replace the "Em breve" stub at `/perfil` with a profile page where the user can view and edit their personal info (name, avatar, birth date) and see their plan limits.

## Sections

### Section 1: Personal Info

**Avatar:**
- Circular photo display (128x128)
- If no avatar: show user initials in a colored circle
- Edit button overlays the circle
- Click opens the existing `ImageCropUpload` component with 1:1 aspect ratio
- Upload to MinIO at `users/avatars/{userId}.jpg`
- Image processed with sharp: resize to 256x256, JPEG

**Name:**
- Editable input, pre-filled with current name
- Required

**Email:**
- Displayed as read-only text (from auth, not editable here)

**Birth date:**
- Native `<input type="date">` with label
- Optional, nullable
- Stored as Date in MongoDB

**Save button:**
- Submits name, birthDate, and avatar (if changed) via server action
- Success feedback: inline message or page refresh

### Section 2: Meu Plano

**Plan name:**
- Resolved from user's profile (e.g. "Free Tier", "Admin")
- If no profile assigned: "Sem plano"

**Limits:**
- **Leituras:** "X de Y usadas este mês" with a visual progress bar. If `readingsMonthlyLimit` is null: "Ilimitado" with no bar.
- Structure ready to add more limit rows in the future (courses, etc.)

## Model Changes

### User schema (`lib/users/model.ts`)

Add two fields to `IUser` interface and `UserSchema`:
- `birthDate: Date | null` — default null
- `avatar: string | null` — default null (URL to MinIO image)

## Service Layer

### `lib/users/service.ts` (new)

- `getUserById(id: string): Promise<IUser | null>` — fetch user by ID
- `updateUser(id: string, data: { name?: string; birthDate?: Date | null; avatar?: string }): Promise<IUser | null>` — update user fields

## Server Action

### `app/(dashboard)/perfil/actions.ts`

- `updateProfileAction(formData: FormData)` — authenticated action that:
  1. Gets current user from session
  2. Extracts name (required), birthDate (optional), avatar file (optional)
  3. If avatar file: validate image, resize to 256x256 with sharp, upload to MinIO at `users/avatars/{userId}.jpg`
  4. Calls `updateUser` with extracted data
  5. Revalidates `/perfil`

## Pages

### `app/(dashboard)/perfil/page.tsx` (Server Component)

- Fetches user data (including avatar, birthDate)
- Fetches profile for plan name and limits
- Fetches reading quota (used this month)
- Passes serialized data to client component

### `components/profile/profile-form.tsx` (Client Component)

- Receives user data, plan info, quota
- Section 1: Avatar display/upload + name input + email display + birthDate input + save button
- Section 2: Plan name + limits display with progress bar
- Uses `ImageCropUpload` for avatar with 1:1 ratio
- Uses `useTransition` for form submission

## Files

### New
- `lib/users/service.ts` — user CRUD
- `app/(dashboard)/perfil/actions.ts` — updateProfileAction
- `components/profile/profile-form.tsx` — client component

### Modified
- `lib/users/model.ts` — add birthDate, avatar fields
- `app/(dashboard)/perfil/page.tsx` — replace stub

## Out of Scope

- Change password
- Change email
- Delete account
- Predefined avatar gallery
- Plan upgrade/billing
