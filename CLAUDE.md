# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
yarn dev             # Start dev server (Next.js with hot reload)
yarn build           # Production build
yarn start           # Start production server
yarn lint            # ESLint (flat config, no args needed)
yarn seed            # Seed database (admin + free_tier profiles)
docker compose up -d # Start MongoDB + MinIO
docker compose down  # Stop MongoDB + MinIO
```

No test framework is configured yet.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript (strict)
- **Tailwind CSS 4** (v4 import syntax: `@import "tailwindcss"`)
- **shadcn/ui** (base-nova style) with Ivory & Charcoal design system
- **Auth.js v5** (NextAuth) — JWT sessions, Credentials + Google OAuth
- **MongoDB** with Mongoose — Docker Compose for local dev
- **MinIO** (S3-compatible) — Docker Compose for image storage
- **ESLint 9** flat config extending `core-web-vitals` + TypeScript
- **Package manager:** yarn

## Architecture

**The Fool** is a tarot learning platform, built as a Next.js fullstack monolith.

### Project layout

```
app/
  (dashboard)/              # Authenticated pages (sidebar + header layout)
    page.tsx                # Dashboard home
    baralhos/               # Public deck/card browsing
      [id]/                 # Card grid
        carta/[cardId]/     # Card detail with annotations viewer
    carta-do-dia/           # Daily card draw & reflection
      historico/            # History of past daily cards
        [date]/             # Specific day's card detail
    diario/                 # Spiritual diary (journal)
      nova/                 # Create new entry (daily-card, reading, free)
      [id]/                 # View single entry with archive toggle
      arquivadas/           # Archived entries list
    leituras/               # Tarot readings
      nova/                 # New reading wizard
      [id]/                 # Reading detail
    planos/                 # Available plans & subscriptions
    perfil/                 # User profile management
    cursos/                 # Stub: "Em breve"
    configuracoes/          # Stub: "Em breve"
    admin/                  # Admin pages (permission-gated)
      profiles/             # Profile CRUD
      plans/                # Plan CRUD
      decks/                # Deck + Card + Annotation CRUD
        [id]/combinacoes/   # Card combination review
      practice-questions/   # Practice question CRUD
      users/                # User management
  auth/                     # Login/register (outside dashboard layout)
  api/                      # Route Handlers
    auth/[...nextauth]/     # Auth.js handler
    health/                 # Health check
components/
  ui/                       # shadcn/ui components (+ rich-text-editor, rich-text-viewer)
  dashboard/                # Sidebar, header, page-title, mobile-sidebar
  admin/                    # Admin components (annotation-editor, combination-review-list)
  daily-card/               # Card view, editorial layout, widget
  diary/                    # Entry form
  readings/                 # New reading wizard, path choice, practice step
  plans/                    # Plan card
  profile/                  # Profile form
  card-thumbnail.tsx        # Reusable card grid item
  card-annotations-viewer.tsx # Public annotations display
  image-crop-upload.tsx     # Image crop before upload
  aspect-ratio-select.tsx   # Aspect ratio picker with presets + custom
lib/
  db/mongoose.ts            # Mongoose singleton (serverless connection reuse)
  db/seed.ts                # Seed script (admin + free_tier profiles)
  auth/auth.ts              # Auth.js config, JWT callbacks with permissions
  auth/auth-actions.ts      # Server Actions: register, login, logout
  users/model.ts            # User schema (profileId ref)
  users/service.ts          # User CRUD
  permissions/constants.ts  # PERMISSIONS enum (resource:action format)
  permissions/check.ts      # hasPermission(), hasAnyPermission()
  profiles/model.ts         # Profile schema (name, slug, permissions[])
  profiles/service.ts       # Profile CRUD
  plans/model.ts            # Plan schema (price in cents, profileId ref)
  plans/service.ts          # Plan CRUD
  subscriptions/model.ts    # Subscription schema (userId, planId, status, dates)
  subscriptions/service.ts  # Subscription management
  decks/model.ts            # Deck schema with Card + Annotation subdocs
  decks/constants.ts        # DECK_TYPES, ASPECT_RATIO_PRESETS, parseAspectRatio
  decks/service.ts          # Deck/Card/Annotation CRUD
  daily-card/model.ts       # DailyCard schema (one draw per user per day)
  daily-card/service.ts     # Daily card draw & history
  daily-card/date.ts        # Date utilities (America/Sao_Paulo timezone)
  daily-card/reflection.ts  # Reflection generation/storage
  diary/model.ts            # DiaryEntry schema (types: daily-card, reading, free)
  diary/service.ts          # Diary CRUD and archive/unarchive
  readings/service.ts       # Reading workflow (uses AI provider)
  readings/combination-model.ts    # CardCombination schema (AI-generated meanings)
  readings/interpretation-model.ts # UserInterpretation schema (reading sessions)
  readings/practice-question-model.ts   # PracticeQuestion schema
  readings/practice-question-service.ts # Practice question CRUD
  readings/quota.ts         # Reading quota management (per-plan limits)
  ai/provider.ts            # AIProvider interface (interpretation, reflection, feedback)
  ai/mock-provider.ts       # Mock AI provider for development
  storage/s3.ts             # S3/MinIO wrapper (upload, delete, validate, processCardImage)
  html/sanitize.ts          # HTML sanitization (sanitize-html)
  html/strip.ts             # Strip HTML tags to plain text
types/
  next-auth.d.ts            # Session type augmentation (profileSlug, permissions)
```

### Key conventions

- **All Mongoose queries live in `lib/`**, not in components. Server Actions are thin wrappers.
- **Domain separation:** `lib/<domain>/` contains services, types, and data access. No JSX.
- **Permissions:** `resource:action` format cached in JWT token. Check via `hasPermission()`.
- **Profiles:** User has one profile (free_tier default). Profiles hold permission arrays.
- **Images:** Upload to MinIO via `lib/storage/s3.ts`. Use `<img>` tags (not `next/image`) for MinIO URLs.
- **Card images:** Auto-processed on upload (resize + center-crop to deck's aspect ratio via sharp).
- **Timestamps:** Mongoose `timestamps: true` for `createdAt`/`updatedAt`.
- **Language:** All frontend UI text in Portuguese (pt-BR). Code identifiers in English.
- **Path alias:** `@/*` maps to project root.

### Next.js 16 specifics

- `params` is async — always `await params` in page components
- `headers()`, `cookies()` are async — must `await` them
- `middleware.ts` renamed to `proxy.ts` with `export function proxy()`
- Server Components cannot pass functions as children to Client Components
- `buttonVariants()` is client-only — use Tailwind classes in Server Components
- Always check `node_modules/next/dist/docs/` before using any Next.js API

## Current state

Core platform complete with daily card, readings, diary, and admin features:

- **Design system:** Ivory & Charcoal palette, Geist + Playfair Display fonts, shadcn/ui (base-nova)
- **Auth:** Email/password + Google OAuth, JWT sessions with cached permissions
- **Profiles & Permissions:** Role-based (admin, free_tier), admin CRUD
- **Plans & Subscriptions:** Plan CRUD with price in cents, subscription management (billing integration pending)
- **Dashboard:** Sidebar with sections (nav, conta, admin accordion), header with page title, mobile overlay
- **Decks & Cards:** Admin CRUD with image upload to MinIO, configurable aspect ratio per deck, image crop on upload
- **Annotations:** Interactive annotations on cards — admin click-to-place editor, public viewer with SVG lines (desktop) and numbered dots (mobile)
- **Carta do Dia:** Daily card draw (one per user per day, São Paulo timezone), reflection, history with date navigation
- **Leituras:** Reading wizard with AI interpretation, practice mode with feedback, card combinations, per-plan quota
- **Diário Espiritual:** Journal entries (types: daily-card, reading, free), pagination, archive/unarchive
- **Perfil:** User profile management (name, avatar, birth date)
- **Planos:** Plans listing page
- **AI integration:** Provider interface with mock implementation for development
- **Rich text:** TipTap editor/viewer with HTML sanitization
- **Admin extras:** Practice question CRUD, card combination review, user management
- **Stub pages:** Cursos, Configurações ("Em breve")
