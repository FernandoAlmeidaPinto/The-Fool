# Dashboard Layout Design

**Date:** 2026-04-04
**Status:** Draft
**Scope:** Post-login dashboard shell — sidebar, header, page stubs, admin migration
**Depends on:** Foundation + Profiles/Permissions

---

## Overview

Post-login dashboard layout with a left sidebar, top header, and content area. Replaces the current minimal home page with a proper app shell. All UI text in Portuguese (pt-BR). Existing admin pages migrate into the dashboard layout.

**Style:** Sidebar Mista — sidebar uses card/muted tone (`#F0EDE8`), logo at top of sidebar, header is clean background (`#FAFAF7`). Active item uses `primary`/`primary-foreground`.

## 1. Layout Structure

**Route group:** `app/(dashboard)/` — does not affect URLs.

```
app/
  (dashboard)/
    layout.tsx              # Sidebar + Header + content area, auth check
    page.tsx                # Dashboard principal
    leituras/page.tsx       # Stub: "Em breve"
    cursos/page.tsx         # Stub: "Em breve"
    perfil/page.tsx         # Stub: "Em breve"
    configuracoes/page.tsx  # Stub: "Em breve"
    admin/                  # Migrated from app/admin/
      page.tsx              # Redirect to /admin/profiles
      profiles/             # Existing pages (unchanged)
      plans/                # Existing pages (unchanged)
  auth/                     # Login/register — outside dashboard layout
    login/page.tsx
    register/page.tsx
  layout.tsx                # Root layout (Geist font, globals.css)
```

**Dashboard layout** (`(dashboard)/layout.tsx`):
- Checks auth — redirects to `/auth/login` if unauthenticated
- Renders: sidebar (left, 256px) + header (top) + content area (scroll independent)
- Passes session to sidebar and header components

**Admin layout removal:** The current `app/admin/layout.tsx` with its own nav bar is removed. The sidebar handles all navigation. Permission checks remain on individual admin pages.

## 2. Sidebar

### Menu Structure

```
🃏 The Fool                       ← Logo (top of sidebar)
──────────
📊 Dashboard                      ← /
🔮 Leituras                       ← /leituras
📚 Cursos                         ← /cursos
──────────
Conta                             ← Section label
  👤 Meu Perfil                   ← /perfil
  ⚙️ Configurações                ← /configuracoes
──────────
Admin ▼                           ← Accordion (only if has admin:* permission)
  🛡️ Perfis                      ← /admin/profiles
  💰 Planos                       ← /admin/plans
```

### Behavior

- Active item: highlighted with `primary` background and `primary-foreground` text
- "Admin" section: accordion (expand/collapse), state persisted in localStorage, collapsed by default on first visit
- "Admin" section: only visible if user has any `admin:*` permission
- Separator lines between main nav, "Conta" section, and "Admin" section

### Mobile (< 768px)

- Sidebar hidden by default
- Hamburger button in header opens sidebar as overlay with backdrop
- Clicking a link or the backdrop closes the sidebar

### Components

```
components/
  dashboard/
    sidebar.tsx            # Main sidebar, receives session
    sidebar-item.tsx       # Individual link (icon, label, active state)
    sidebar-section.tsx    # Accordion with label and children (Client Component)
    header.tsx             # Top header bar
    mobile-sidebar.tsx     # Mobile overlay wrapper (Client Component)
```

Sidebar is a Server Component at the structure level. Accordion toggle and mobile overlay are Client Components (local state only).

## 3. Header

```
[☰ mobile only]   Título da Página              Fernando   [Sair]
```

- **Left:** hamburger button (mobile only, toggles sidebar overlay)
- **Left/center:** current page title
- **Right:** user name + "Sair" button (logout)

**Page title mapping** — simple route-to-title object in the layout:

```typescript
const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leituras": "Leituras",
  "/cursos": "Cursos",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/admin/profiles": "Perfis",
  "/admin/profiles/new": "Novo Perfil",
  "/admin/plans": "Planos",
  "/admin/plans/new": "Novo Plano",
};
// Dynamic routes: /admin/profiles/[id]/edit → "Editar Perfil"
// Dynamic routes: /admin/plans/[id]/edit → "Editar Plano"
// Fallback for unmatched routes: "Dashboard"
```

Falls back to "Dashboard" for unknown routes.

**Component:** `components/dashboard/header.tsx` — receives session and page title.

## 4. Migration

### What moves

| From | To |
|------|----|
| `app/page.tsx` | `app/(dashboard)/page.tsx` (simplified — remove logout button, welcome only) |
| `app/admin/layout.tsx` | Removed (sidebar replaces it) |
| `app/admin/page.tsx` | `app/(dashboard)/admin/page.tsx` |
| `app/admin/profiles/*` (incl. actions.ts, [id]/edit/) | `app/(dashboard)/admin/profiles/*` |
| `app/admin/plans/*` (incl. actions.ts, [id]/edit/) | `app/(dashboard)/admin/plans/*` |

### What stays

- `app/auth/*` — login/register pages remain outside dashboard layout
- `app/layout.tsx` — root layout unchanged
- `app/api/*` — route handlers unchanged

### Admin permission checks

Individual admin pages keep their own `hasPermission` checks. The sidebar controls visibility of admin links, but doesn't replace server-side authorization.

## 5. Stub Pages

New pages (`leituras`, `cursos`, `perfil`, `configuracoes`) are stubs showing "Em breve":

```tsx
export default function Page() {
  return (
    <div className="text-center text-muted-foreground py-20">
      <h2 className="text-xl font-semibold mb-2">[Page Name]</h2>
      <p>Em breve</p>
    </div>
  );
}
```

## 6. Language

All frontend UI text in Portuguese (pt-BR): navigation items, button labels, page titles, placeholder messages. Code identifiers (variable names, file names) remain in English.

## Out of Scope

- Home/landing page (public, pre-login)
- Dashboard content (charts, stats, recent activity)
- Responsive sidebar collapsing to icons-only mode
- Dark mode toggle
- User avatar/image in header
- Breadcrumbs
