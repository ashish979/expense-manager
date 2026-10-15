---
name: add-feature
description: Add a new resource or endpoint to SplitEase following the repo's patterns (model, Zod-validated route handler, React Query hook, page, test). Use when extending the API or UI.
---

# Add a feature the SplitEase way

1. **Model** in `src/models/<Name>.ts` with timestamps and indexes for the query paths; reuse the `mongoose.models.X ??` guard. Amounts are integer cents.
2. **Pure logic** that is not I/O goes in `src/lib/<name>.ts` with a test in `src/__tests__/lib/`.
3. **Route handler** `src/app/api/<name>/route.ts`: `auth()` (401), Zod `safeParse` (400), `connectDB()`, query scoped to the session user, `Activity.create` for user-visible changes. Add a new `ActivityType` in `src/models/Activity.ts` (schema enum and the type union) if needed.
4. **Hook** in `src/hooks/use<Name>.ts`: `useQuery` with a stable key; mutations use optimistic `onMutate`, rollback `onError`, and invalidate `["expenses"]`/`["balances"]` where totals change.
5. **UI** under `src/app/(app)/<name>/page.tsx` using `src/components/ui/*`; add the route prefix to `src/middleware.ts` and an entry in `Sidebar.tsx`/`MobileNav.tsx`.
6. **Verify:** `npm test`, `npm run build`, then exercise the page via the `run-locally` skill.
