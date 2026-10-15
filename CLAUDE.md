# SplitEase (expense-manager)

Splitwise-style expense sharing app. Next.js 16 App Router + TypeScript, MongoDB via Mongoose, Auth.js v5 (Google), Tailwind 4, TanStack Query. Full design in `docs/ARCHITECTURE.md`.

## Commands

```bash
npm ci               # install
npm run dev          # dev server on :3000 (needs .env.local)
npm run build        # production build
npm test             # Jest (uses mongodb-memory-server for model tests)
node scripts/seed-demo.mjs   # fictional demo data + login session (needs local mongod)
```

Env vars are listed in `.env.local.example`; copy to `.env.local`.

## Layout

- `src/app/(app)/` protected pages; `src/app/(auth)/` sign-in/error; `src/app/api/**/route.ts` REST handlers
- `src/lib/` pure domain logic (split-calculator, balance-calculator, debt-simplification, csv-export) and `db.ts`
- `src/models/` Mongoose schemas; `src/hooks/` React Query hooks; `src/components/` UI
- `src/__tests__/` Jest tests; `scripts/` dev tooling; `docs/media/` screenshots and GIF

## Conventions

- Money is **integer cents**. Never store floats; format with `formatCents`.
- Every API handler: `auth()` -> 401 if missing, validate body with Zod, `connectDB()`, then query; write an `Activity` row for user-visible changes.
- Keep business rules in `src/lib` as pure functions with tests; handlers stay thin.
- Hooks: mutations update the cache optimistically and invalidate `["expenses"]` and `["balances"]` on settle.
- Models use `mongoose.models.X ?? mongoose.model(...)` to survive hot reload.
- Path alias `@/` -> `src/`.

## Gotchas

- `middleware.ts` only checks that a session cookie exists; it is not authorization. Authorize in handlers.
- Auth uses database sessions: to log in without Google, insert a row in the `sessions` collection and set the `authjs.session-token` cookie (the seed script does this).
- Expenses are soft-deleted (`isDeleted`); always filter on it.
- Equal/percentage splits give leftover cents to the payer; tests depend on that.
- Group "Who owes who" uses simplified debts only when `simplifyDebts` is true.
- Demo login: set `DEMO_MODE=true` and visit `/api/demo-login` (404 otherwise); never enable in production.
- The dev script no longer sets `NODE_TLS_REJECT_UNAUTHORIZED=0`. If a corporate proxy breaks outbound TLS (e.g. Google OAuth), point `NODE_EXTRA_CA_CERTS` at the proxy CA bundle instead of disabling verification.
- `calculateBalances` returns only debts involving the requesting user (one netted entry per person).
- `mongodb-memory-server` downloads a mongod binary on first test run; offline/proxied environments need a local mongod instead.
