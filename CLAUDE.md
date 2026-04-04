# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
yarn dev             # Start dev server (Next.js with hot reload)
yarn build           # Production build
yarn start           # Start production server
yarn lint            # ESLint (flat config, no args needed)
docker compose up -d # Start MongoDB
docker compose down  # Stop MongoDB
```

No test framework is configured yet.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript (strict)
- **Tailwind CSS 4** (v4 import syntax: `@import "tailwindcss"`)
- **ESLint 9** flat config (`eslint.config.mjs`) extending `core-web-vitals` + TypeScript
- **Target database:** MongoDB with Mongoose (not yet wired — see Phase 0 spec)
- **Target auth:** Auth.js / NextAuth v5 (not yet wired)

## Architecture

This is a **tarot divination platform with AI interpretations**, built as a Next.js fullstack monolith. Implementation follows two phases defined in `docs/`:

- `docs/spec-fase-0-fundacao-nextjs-mongodb.md` — Foundation: auth, MongoDB, seeds, stubs
- `docs/spec-fase-1-nextjs-mvp.md` — MVP: tarot readings, AI interpretation, content, billing

### Intended project layout (from specs)

```
app/                    # Pages, layouts, route handlers
  api/                  # Route Handlers (webhooks, health, external APIs)
components/             # Shared React components
lib/                    # Domain logic — NO JSX here
  db/mongoose.ts        # Mongoose singleton (serverless connection reuse)
  auth/                 # Auth.js config
  users/                # User domain
  tarot/                # Decks, cards, readings, spreads
  billing/              # Plans, subscriptions, entitlements
  preferences/          # User preferences
  audit/                # Audit logging
```

### Key conventions (from specs)

- **All Mongoose queries live in `lib/`**, not in components. Server Actions should be thin wrappers that delegate to `lib/` functions.
- **Domain separation:** `lib/<domain>/` contains services, types, and data access. No JSX.
- **AI and payments use adapter pattern:** `AIProvider` and payment gateway interfaces with swappable implementations.
- **Entitlements are centralized** — limits by plan, not scattered `if` checks in UI.
- **Ownership filtering:** all user-scoped queries filter by `userId`.
- **Timestamps:** Mongoose `timestamps: true` for `createdAt`/`updatedAt`.
- **Path alias:** `@/*` maps to project root.

## Current state

Foundation complete: Ivory & Charcoal design system (shadcn/ui), Auth.js v5 with Credentials + Google OAuth (JWT sessions), MongoDB via Docker Compose, Mongoose singleton, register/login pages, health check endpoint. Ready for Phase 1 feature development.
