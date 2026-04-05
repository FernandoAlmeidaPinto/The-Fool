# Dashboard Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the post-login dashboard shell with sidebar navigation, top header, mobile support, stub pages, and migrate existing admin pages into the new layout.

**Architecture:** Next.js 16 route group `(dashboard)` wraps all authenticated pages. Sidebar is a Server Component with Client Component internals for accordion and mobile overlay. Header shows page title and user info. Admin pages migrate from `app/admin/` into `app/(dashboard)/admin/` and lose their standalone layout.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Button), lucide-react (icons)

**Next.js 16 breaking changes to respect:**
- `headers()`, `cookies()`, `params`, `searchParams` are **async** — always `await` them
- Always read `node_modules/next/dist/docs/` before using any Next.js API

---

## File Map

```
components/
  dashboard/
    sidebar.tsx              # Main sidebar, receives session
    sidebar-item.tsx         # Individual nav link (Client Component)
    sidebar-section.tsx      # Collapsible accordion section (Client Component)
    header.tsx               # Top header bar (Client Component for mobile toggle)
    mobile-sidebar.tsx       # Mobile overlay wrapper (Client Component)
app/
  (dashboard)/
    layout.tsx               # Dashboard shell: auth check, sidebar + header + content
    page.tsx                 # Dashboard home (welcome message)
    leituras/page.tsx        # Stub
    cursos/page.tsx          # Stub
    perfil/page.tsx          # Stub
    configuracoes/page.tsx   # Stub
    admin/                   # Migrated from app/admin/
      page.tsx
      profiles/              # Existing files moved as-is
        page.tsx
        actions.ts
        new/page.tsx
        [id]/edit/page.tsx
      plans/                 # Existing files moved as-is
        page.tsx
        actions.ts
        new/page.tsx
        [id]/edit/page.tsx
  layout.tsx                 # Modify: lang="pt-BR", metadata title
```

Files deleted after migration:
- `app/page.tsx` (replaced by `app/(dashboard)/page.tsx`)
- `app/admin/layout.tsx` (replaced by dashboard sidebar)
- `app/admin/page.tsx` (moved)
- `app/admin/profiles/*` (moved)
- `app/admin/plans/*` (moved)

---

### Task 1: Install lucide-react + Update Root Layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install lucide-react for icons**

```bash
yarn add lucide-react
```

- [ ] **Step 2: Update root layout**

In `app/layout.tsx`:
- Change `lang="en"` to `lang="pt-BR"`
- Update metadata title from "Create Next App" to "The Fool"
- Update metadata description to "Plataforma de aprendizado de tarot"

- [ ] **Step 3: Verify:** `yarn build`

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx package.json yarn.lock
git commit -m "feat: install lucide-react and update root layout to pt-BR"
```

---

### Task 2: Sidebar Item Component

**Files:**
- Create: `components/dashboard/sidebar-item.tsx`

- [ ] **Step 1: Create `components/dashboard/sidebar-item.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface SidebarItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  onNavigate?: () => void;
}

export function SidebarItem({ href, label, icon: Icon, onNavigate }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
```

`onNavigate` callback is used by mobile sidebar to close on link click.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar-item.tsx
git commit -m "feat: add SidebarItem component"
```

---

### Task 3: Sidebar Section (Accordion) Component

**Files:**
- Create: `components/dashboard/sidebar-section.tsx`

- [ ] **Step 1: Create `components/dashboard/sidebar-section.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface SidebarSectionProps {
  label: string;
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function SidebarSection({
  label,
  storageKey,
  defaultOpen = false,
  children,
}: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsOpen(stored === "true");
    }
  }, [storageKey]);

  function toggle() {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(storageKey, String(next));
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        {label}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar-section.tsx
git commit -m "feat: add SidebarSection accordion component"
```

---

### Task 4: Mobile Sidebar Component

**Files:**
- Create: `components/dashboard/mobile-sidebar.tsx`

- [ ] **Step 1: Create `components/dashboard/mobile-sidebar.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileSidebarProps {
  children: (onNavigate: () => void) => React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border md:hidden overflow-y-auto">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="sm" onClick={close} aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            {children(close)}
          </div>
        </>
      )}
    </>
  );
}
```

Uses render prop pattern — `children(onNavigate)` passes the close function so `SidebarItem` can call `onNavigate` on link click to close the mobile sidebar.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/mobile-sidebar.tsx
git commit -m "feat: add MobileSidebar overlay component"
```

---

### Task 5: Header Component

**Files:**
- Create: `components/dashboard/header.tsx`

- [ ] **Step 1: Create `components/dashboard/header.tsx`**

```tsx
import { logout } from "@/lib/auth/auth-actions";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  userName: string;
  mobileMenuButton: React.ReactNode;
}

export function Header({ title, userName, mobileMenuButton }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        {mobileMenuButton}
        <h1 className="text-sm font-medium text-muted-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
```

`mobileMenuButton` is passed from the layout so the MobileSidebar Client Component controls it.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/header.tsx
git commit -m "feat: add Header component with logout"
```

---

### Task 6: Main Sidebar Component

**Files:**
- Create: `components/dashboard/sidebar.tsx`

- [ ] **Step 1: Create `components/dashboard/sidebar.tsx`**

```tsx
import type { Session } from "next-auth";
import {
  LayoutDashboard,
  Sparkles,
  BookOpen,
  User,
  Settings,
  Shield,
  CreditCard,
} from "lucide-react";
import { hasAnyPermission } from "@/lib/permissions/check";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { SidebarItem } from "./sidebar-item";
import { SidebarSection } from "./sidebar-section";

const ADMIN_PERMISSIONS = [
  PERMISSIONS.ADMIN_PROFILES,
  PERMISSIONS.ADMIN_PLANS,
  PERMISSIONS.ADMIN_USERS,
];

interface SidebarContentProps {
  session: Session;
  onNavigate?: () => void;
}

export function SidebarContent({ session, onNavigate }: SidebarContentProps) {
  const isAdmin = hasAnyPermission(session, ADMIN_PERMISSIONS);

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="px-3 py-4 text-lg font-bold text-foreground">
        🃏 The Fool
      </div>

      <nav className="space-y-1">
        <SidebarItem href="/" label="Dashboard" icon={LayoutDashboard} onNavigate={onNavigate} />
        <SidebarItem href="/leituras" label="Leituras" icon={Sparkles} onNavigate={onNavigate} />
        <SidebarItem href="/cursos" label="Cursos" icon={BookOpen} onNavigate={onNavigate} />
      </nav>

      <div className="my-2 border-t border-border" />

      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Conta
      </p>
      <nav className="space-y-1">
        <SidebarItem href="/perfil" label="Meu Perfil" icon={User} onNavigate={onNavigate} />
        <SidebarItem href="/configuracoes" label="Configurações" icon={Settings} onNavigate={onNavigate} />
      </nav>

      {isAdmin && (
        <>
          <div className="my-2 border-t border-border" />
          <SidebarSection label="Admin" storageKey="sidebar-admin-open" defaultOpen={false}>
            <SidebarItem href="/admin/profiles" label="Perfis" icon={Shield} onNavigate={onNavigate} />
            <SidebarItem href="/admin/plans" label="Planos" icon={CreditCard} onNavigate={onNavigate} />
          </SidebarSection>
        </>
      )}
    </div>
  );
}
```

This is not a Client Component — it receives session as a prop from the layout. The Client Components (`SidebarItem`, `SidebarSection`) handle their own interactivity.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat: add main Sidebar component with nav structure"
```

---

### Task 7: Dashboard Layout + Page Title Helper

**Files:**
- Create: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create `app/(dashboard)/layout.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/leituras": "Leituras",
  "/cursos": "Cursos",
  "/perfil": "Meu Perfil",
  "/configuracoes": "Configurações",
  "/admin": "Admin",
  "/admin/profiles": "Perfis",
  "/admin/profiles/new": "Novo Perfil",
  "/admin/plans": "Planos",
  "/admin/plans/new": "Novo Plano",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/admin\/profiles\/[^/]+\/edit$/.test(pathname)) return "Editar Perfil";
  if (/^\/admin\/plans\/[^/]+\/edit$/.test(pathname)) return "Editar Plano";
  return "Dashboard";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const headersList = await headers();
  const pathname = headersList.get("x-next-pathname") ?? headersList.get("x-invoke-path") ?? "/";
  const title = getPageTitle(pathname);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-card overflow-y-auto">
        <SidebarContent session={session} />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          userName={session.user.name ?? ""}
          mobileMenuButton={
            <MobileSidebar>
              {(onNavigate) => <SidebarContent session={session} onNavigate={onNavigate} />}
            </MobileSidebar>
          }
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

IMPORTANT: Next.js 16 `headers()` is async — must `await` it. The pathname detection uses `x-next-pathname` or `x-invoke-path` headers. If neither is available, the implementer should check `node_modules/next/dist/docs/` for the correct way to get the current pathname in a Server Component layout. An alternative approach is to use `usePathname()` in a Client Component wrapper for the header title.

- [ ] **Step 2: Verify:** `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/layout.tsx
git commit -m "feat: add dashboard layout with sidebar, header, and auth check"
```

---

### Task 8: Dashboard Home Page + Stub Pages

**Files:**
- Create: `app/(dashboard)/page.tsx`
- Create: `app/(dashboard)/leituras/page.tsx`
- Create: `app/(dashboard)/cursos/page.tsx`
- Create: `app/(dashboard)/perfil/page.tsx`
- Create: `app/(dashboard)/configuracoes/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/page.tsx`**

```tsx
import { auth } from "@/lib/auth/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground">
        Bem-vindo, {session?.user?.name}
      </h2>
      <p className="mt-2 text-muted-foreground">
        Esta é a sua dashboard. Novas funcionalidades aparecerão aqui em breve.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create the 4 stub pages**

Each stub follows the same pattern. Create:

`app/(dashboard)/leituras/page.tsx`:
```tsx
export default function LeiturasPage() {
  return (
    <div className="text-center text-muted-foreground py-20">
      <h2 className="text-xl font-semibold text-foreground mb-2">Leituras</h2>
      <p>Em breve</p>
    </div>
  );
}
```

`app/(dashboard)/cursos/page.tsx`:
```tsx
export default function CursosPage() {
  return (
    <div className="text-center text-muted-foreground py-20">
      <h2 className="text-xl font-semibold text-foreground mb-2">Cursos</h2>
      <p>Em breve</p>
    </div>
  );
}
```

`app/(dashboard)/perfil/page.tsx`:
```tsx
export default function PerfilPage() {
  return (
    <div className="text-center text-muted-foreground py-20">
      <h2 className="text-xl font-semibold text-foreground mb-2">Meu Perfil</h2>
      <p>Em breve</p>
    </div>
  );
}
```

`app/(dashboard)/configuracoes/page.tsx`:
```tsx
export default function ConfiguracoesPage() {
  return (
    <div className="text-center text-muted-foreground py-20">
      <h2 className="text-xl font-semibold text-foreground mb-2">Configurações</h2>
      <p>Em breve</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify:** `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/
git commit -m "feat: add dashboard home and stub pages (leituras, cursos, perfil, config)"
```

---

### Task 9: Migrate Admin Pages

**Files:**
- Move: `app/admin/*` → `app/(dashboard)/admin/*`
- Delete: `app/admin/layout.tsx` (replaced by dashboard sidebar)
- Delete: `app/page.tsx` (replaced by `app/(dashboard)/page.tsx`)

- [ ] **Step 1: Move admin pages into dashboard route group**

```bash
mkdir -p app/\(dashboard\)/admin
cp -r app/admin/page.tsx app/\(dashboard\)/admin/
cp -r app/admin/profiles app/\(dashboard\)/admin/
cp -r app/admin/plans app/\(dashboard\)/admin/
```

- [ ] **Step 2: Delete old admin directory and old home page**

```bash
rm -rf app/admin
rm app/page.tsx
```

Note: `app/admin/layout.tsx` is NOT migrated — the dashboard layout replaces it. Individual admin pages already have their own permission checks.

- [ ] **Step 3: Verify admin pages still work**

Check that the admin page imports are correct. The pages use relative imports for `actions.ts` (`../actions`, `../../actions`) which should still work after the move since the internal structure is preserved.

```bash
yarn build
```

All admin routes (`/admin`, `/admin/profiles`, `/admin/plans`, etc.) should appear in the build output under the `(dashboard)` group.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: migrate admin pages into dashboard layout, remove old layout"
```

---

### Task 10: Final Cleanup + Lint + Build

**Files:**
- Possibly modify: any files with issues found in lint/build

- [ ] **Step 1: Run lint**

```bash
yarn lint
```

Fix any errors.

- [ ] **Step 2: Run build**

```bash
yarn build
```

Expected routes:
```
/                         (dashboard home)
/leituras                 (stub)
/cursos                   (stub)
/perfil                   (stub)
/configuracoes            (stub)
/admin                    (redirect)
/admin/profiles           (list)
/admin/profiles/new       (create)
/admin/profiles/[id]/edit (edit)
/admin/plans              (list)
/admin/plans/new          (create)
/admin/plans/[id]/edit    (edit)
/api/auth/[...nextauth]
/api/health
/auth/login
/auth/register
```

Fix any errors.

- [ ] **Step 3: Manual test**

```bash
docker compose up -d
yarn dev
```

1. Open `http://localhost:3000` → should show dashboard with sidebar
2. Click sidebar links → pages should load with correct titles in header
3. Admin section should be visible only for admin users (accordion, collapsed by default)
4. On mobile viewport (< 768px) → sidebar should be hidden, hamburger should open overlay
5. "Sair" button should log out

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address lint and build issues"
```

---

## Completion Checklist

After all tasks are done, verify:

- [ ] `yarn build` succeeds with all expected routes
- [ ] `yarn lint` passes
- [ ] Dashboard loads with sidebar (desktop) after login
- [ ] Sidebar shows: Dashboard, Leituras, Cursos, Conta (Meu Perfil, Configurações), Admin (Perfis, Planos)
- [ ] Active item is highlighted in sidebar
- [ ] Admin section only visible for admin users
- [ ] Admin accordion collapsed by default, persists state in localStorage
- [ ] Header shows page title, user name, "Sair" button
- [ ] Mobile: hamburger opens sidebar overlay, clicking link closes it
- [ ] Stub pages show "Em breve"
- [ ] Admin pages still work (/admin/profiles, /admin/plans CRUD)
- [ ] Auth pages (/auth/login, /auth/register) are NOT wrapped in dashboard layout
- [ ] All UI text is in Portuguese
