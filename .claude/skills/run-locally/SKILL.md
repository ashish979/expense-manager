---
name: run-locally
description: Start SplitEase locally with a MongoDB and log in without Google OAuth. Use when asked to run, preview or screenshot the app.
---

# Run SplitEase locally

1. `npm ci`
2. Start MongoDB (local `mongod --dbpath <dir>` or an Atlas URI).
3. Create `.env.local` from `.env.example`. For local-only use any non-empty values for `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; set `MONGODB_URI=mongodb://127.0.0.1:27017/splitease` and `AUTH_TRUST_HOST=true`.
4. Seed demo data: `MONGODB_URI=<same uri> node scripts/seed-demo.mjs` (see the `seed-demo-data` skill).
5. `npm run dev`, open http://localhost:3000.
6. To bypass Google: set cookie `authjs.session-token=demo-session-token-0000` on `localhost` (e.g. Playwright `context.addCookies`), then visit `/dashboard`.

Verify with `curl -b "authjs.session-token=demo-session-token-0000" localhost:3000/api/balances`. Never commit `.env.local`.
