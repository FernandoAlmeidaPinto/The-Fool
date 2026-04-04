# Foundation Design — The Fool

**Date:** 2026-04-04
**Status:** Draft
**Scope:** Design system, authentication, MongoDB setup, health check

---

## Overview

Initial foundation for The Fool, a tarot learning platform. This phase establishes the visual identity, authentication system, database infrastructure, and project structure before any tarot-specific features are built.

**Approach:** Design-first — define visual tokens before building UI, so all code is visually consistent from the start.

## 1. Design System — Ivory & Charcoal + shadcn/ui

### Color Palette

Elegant, minimalist, editorial. Light background with dark typography and earthy accents.

| Token                  | Value     | Usage                          |
|------------------------|-----------|--------------------------------|
| `--background`         | `#FAFAF7` | Page background                |
| `--foreground`         | `#2C2C2C` | Primary text                   |
| `--card`               | `#F0EDE8` | Card surfaces                  |
| `--card-foreground`    | `#2C2C2C` | Card text                      |
| `--primary`            | `#4A4540` | Primary buttons, links         |
| `--primary-foreground` | `#FAFAF7` | Text on primary buttons        |
| `--secondary`          | `#F0EDE8` | Secondary buttons              |
| `--secondary-foreground` | `#4A4540` | Text on secondary buttons    |
| `--muted`              | `#E2DCD5` | Subtle backgrounds             |
| `--muted-foreground`   | `#8A7F72` | Secondary text, placeholders   |
| `--accent`             | `#B8A99A` | Hover, light emphasis          |
| `--accent-foreground`  | `#2C2C2C` | Text on accent                 |
| `--border`             | `#E2DCD5` | Borders                        |
| `--input`              | `#E2DCD5` | Input borders                  |
| `--ring`               | `#8A7F72` | Focus ring                     |
| `--destructive`        | `#DC2626` | Errors, destructive actions    |

### Typography

**Font:** Geist (already included in Next.js boilerplate). Clean, modern, good readability. Fits the editorial aesthetic.

### Component Library

**shadcn/ui** — components copied into the project (not a runtime dependency). Uses CSS variables by design, so the Ivory & Charcoal palette is applied by overriding the default CSS variables in `globals.css`.

**Setup:** `npx shadcn@latest init` → override CSS variables → install components as needed (Button, Input, Card, Label, etc.).

## 2. Docker Compose — MongoDB Local

### Service

Single service: **MongoDB 7** on port `27017` with a named volume for data persistence.

```yaml
# docker-compose.yml (conceptual)
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### Environment Variables

Documented in `.env.example`:

```
MONGODB_URI=mongodb://root:root@localhost:27017/the_fool?authSource=admin
AUTH_SECRET=<generate with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<Google OAuth client ID>
AUTH_GOOGLE_SECRET=<Google OAuth client secret>
```

### Usage

```bash
docker compose up -d   # start MongoDB
yarn dev               # start Next.js app
```

The app runs locally (not containerized) for hot reload during development.

## 3. Authentication — Auth.js v5 + Mongoose

### Providers

1. **Credentials** — email + password (bcryptjs hash)
2. **Google OAuth** — via Auth.js Google provider

### User Model (minimum)

```typescript
User {
  _id: ObjectId
  name: string
  email: string (unique)
  emailVerified: Date | null
  password: string (hash) — credentials only
  image: string | null — avatar URL
  createdAt: Date
  updatedAt: Date
}
```

Auth.js auxiliary models (Account, Session, VerificationToken) are created automatically by the Mongoose adapter.

### Pages

- **`/auth/login`** — email/password form + "Sign in with Google" button
- **`/auth/register`** — name, email, password form

Both pages use shadcn/ui components (Card, Input, Button, Label) styled with Ivory & Charcoal palette.

### Session Strategy

**JWT sessions**. Auth.js v5 Credentials provider does not trigger the adapter's `createSession` method, so database sessions would silently fail for email/password logins. JWT strategy works for both Credentials and OAuth flows, while the MongoDB adapter still handles user/account persistence for Google OAuth.

### Account Linking

When a user registers with credentials and later signs in with Google using the same email (or vice versa), accounts are **not auto-linked**. Each auth method creates a separate Account record. Auto-linking can be revisited later if user feedback warrants it.

### Auth Flow

1. **Register** → create User with hashed password → auto login
2. **Login (credentials)** → validate email/password → create session
3. **Login (Google)** → Auth.js handles OAuth → create/link Account
4. **Logout** → destroy session → redirect to login

### Mongoose Connection

Singleton in `lib/db/mongoose.ts` with connection reuse (serverless pattern). Connects using `MONGODB_URI` from `.env`.

## 4. Health Check

**Endpoint:** `GET /api/health`

- Pings MongoDB connection
- Returns `{ status: "ok", db: "connected", timestamp }` or `{ status: "error", db: "disconnected" }`

## 5. Project Structure

```
app/
  api/
    health/route.ts
  auth/
    login/page.tsx
    register/page.tsx
  layout.tsx
  page.tsx
  globals.css              # Ivory & Charcoal CSS variables
components/
  ui/                      # shadcn/ui components
lib/
  db/mongoose.ts           # Mongoose singleton connection
  auth/auth.ts             # Auth.js config, providers, callbacks
  users/model.ts           # User Mongoose schema
docker-compose.yml
.env.example
```

## 6. Package Manager

**yarn** is the default package manager for this project.

## Out of Scope

- Database seeds / population scripts
- AI provider stubs
- Billing / payment stubs
- User preferences, audit logging
- Any tarot-specific features (decks, cards, readings, spreads)
- Dark mode (can be added later)

## Implementation Order

1. Design tokens (shadcn/ui init + Ivory & Charcoal CSS variables + Geist font)
2. Docker Compose (MongoDB)
3. Mongoose connection singleton
4. Auth.js v5 config + User model
5. Auth pages (login + register)
6. Health check endpoint
