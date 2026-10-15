---
name: seed-demo-data
description: Reset the local database to fictional demo data (users, friends, groups, expenses, settlements, activity) and a ready login session. Use before taking screenshots or demoing the app.
---

# Seed demo data

Run `MONGODB_URI=mongodb://127.0.0.1:27017/splitease node scripts/seed-demo.mjs`.

- **Destructive:** it drops the target database first. Only point it at a throwaway local DB.
- Creates 6 fictional users (@example.com), the logged-in user "Aarav Sharma", 3 groups, ~20 expenses covering all split types and categories, 2 settlements, a pending friend request and activity entries. Dates are relative to now.
- Writes a session row; the token is `demo-session-token-0000` (cookie `authjs.session-token`).
- Prints JSON with group and user ids, useful for deep links like `/groups/<id>`.

To change the dataset edit `scripts/seed-demo.mjs`; keep amounts in cents (`rupees()` helper) and splits summing to the expense total.
