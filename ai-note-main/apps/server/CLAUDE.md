# INote Auth Server

## Overview
Minimal authentication server for INote. Manages user accounts only.
NO user data is stored on the server.

## Tech Stack
- Fastify 5 + TypeScript
- better-sqlite3 (single-file DB)
- bcryptjs (password hashing)
- @fastify/jwt (token management)

## Commands
```bash
pnpm dev        # Start dev server with watch mode (tsx)
pnpm build      # Compile TypeScript
pnpm start      # Run compiled server
```

## API Endpoints
- POST /api/auth/register — Create account
- POST /api/auth/login — Login, get JWT
- GET /api/auth/validate — Validate JWT (Bearer)
- GET /api/user/profile — Get profile (Bearer)
- PUT /api/user/profile — Update profile (Bearer)
- GET /api/health — Health check

## Database
Single SQLite file at `data/inote-auth.sqlite`. Contains only a `users` table.

## Security
- Passwords hashed with bcrypt (10 rounds)
- JWT with 30-day expiry
- Rate limiting: 5 req/min on auth endpoints
- JWT secret auto-generated on first run, stored in `data/secret.key`
