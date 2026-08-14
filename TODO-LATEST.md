# TODO-LATEST — Taekwondo Tournament Manager

Production-readiness work items from full-stack audit (2026-08-14).

**Status legend:** `[ ]` pending · `[x]` done · `[~]` in progress

---

## P0 — BLOCKERS (must fix before going live)

### P0-1 Connection pooling (crash risk at 100+ users)
- [ ] Switch `DATABASE_URL` to Neon pooled endpoint (`-pooler` host) + `?pgbouncer=true`
- [ ] Fix `src/lib/db.ts` — global cache currently only set in dev (`NODE_ENV !== "production"` guard). Always assign to global so prod gets one PrismaClient per instance.
- [ ] Update `.env.example` comment (currently advises unpooled — backwards for serverless)
- **Why:** unpooled endpoint caps connections (100 free tier). Each PrismaClient = pg pool (up to 10 conns). 10 serverless instances × 10 = exhaustion → 500s.
- **Files:** `src/lib/db.ts`, `.env`, `.env.example`
- **Effort:** ~30 min

### P0-2 Cloudinary must be guaranteed in prod (silent data loss risk)
- [ ] Verify `CLOUDINARY_URL` set in production env
- [ ] Make `saveUpload()` fail loudly (throw) when no Cloudinary AND no local fallback allowed — or add explicit `NODE_ENV=production` guard that forbids local `.uploads/` fallback
- **Why:** local `.uploads/` is ephemeral on serverless — files vanish on redeploy, `/uploads/[...path]` 404s. Payment proofs lost silently.
- **Files:** `src/lib/uploads.ts`, `.env.local`
- **Effort:** ~20 min

### P0-3 Payment proofs are public (privacy/security)
- [ ] Cloudinary: use signed URLs or private delivery for `proofs/` folder
- [ ] Or serve proofs through an authenticated route (check chapter ownership before streaming)
- **Why:** GCash screenshots = financial data. `secure_url` is public-by-URL.
- **Files:** `src/lib/uploads.ts`, `src/app/dashboard/payments/[id]/page.tsx`, `src/app/admin/payments/[id]/page.tsx`
- **Effort:** ~1–2 hr

### P0-4 Unique constraint on Chapter.headCoachEmail
- [ ] Add `@unique` to `Chapter.headCoachEmail` in `prisma/schema.prisma`
- [ ] Migration + dedupe existing rows first
- [ ] Fix `registerChapter` duplicate detection (currently catches a constraint error that can never fire → unlimited duplicate chapters per email)
- **Files:** `prisma/schema.prisma`, `src/app/register-chapter/actions.ts`
- **Effort:** ~1 hr

---

## P1 — HIGH (fix soon after launch)

### P1-1 Pagination on unbounded admin queries
- [ ] `admin/payments` — paginate `loadPayments()` (currently loads ALL payments)
- [ ] `admin/chapters` — paginate chapter list
- [ ] `admin/athletes` — paginate + limit (1000+ rows → huge HTML, slow TTFB)
- [ ] Add trigram index (`pg_trgm`) on `Athlete.name` for `contains + insensitive` search (currently full scan)
- **Files:** `src/app/admin/payments/page.tsx`, `src/app/admin/chapters/page.tsx`, `src/app/admin/athletes/page.tsx`, `prisma/schema.prisma`
- **Effort:** ~2–3 hr

### P1-2 Caching layer for hot reads
- [ ] `unstable_cache` on: published events list, brackets cells, chapter lookup
- [ ] Revalidate on mutations (already have `revalidatePath` calls — wire to cache tags)
- **Why:** every page is fully dynamic, zero caching. 100 users × 5 queries = 500 queries/sec burst.
- **Files:** `src/app/dashboard/events/page.tsx`, `src/app/dashboard/brackets/page.tsx`, `src/app/admin/brackets/page.tsx`, `src/lib/chapters.ts`
- **Effort:** ~2–3 hr

### P1-3 Rate limiting on server actions
- [ ] Add rate limit (e.g., upstash/redis or in-DB counter) on: `enrollAthletes`, `submitPayment`, `registerChapter`, `createAthlete`
- **Why:** abuse vector — no limits anywhere today.
- **Files:** all `actions.ts` files
- **Effort:** ~2 hr

### P1-4 Handle `submitPayment` race (unhandled P2002 → 500)
- [ ] Wrap create in try/catch for unique constraint → return friendly error
- [ ] Or use `upsert` instead of find-then-create
- **Files:** `src/app/dashboard/payments/actions.ts`
- **Effort:** ~20 min

### P1-5 Organizer role provisioning
- [ ] Add code path to set `role: "organizer"` (currently manual Clerk dashboard edit only)
- [ ] Document the manual step in README as fallback
- **Files:** `src/lib/chapters.ts`, README
- **Effort:** ~1 hr

### P1-6 Error monitoring + logging
- [ ] Add Sentry (or similar) — server actions + pages
- [ ] Structured logging for payment/bracket mutations
- **Effort:** ~1–2 hr

---

## P2 — MEDIUM (next iteration)

### P2-1 Bracket generation efficiency
- [ ] `generateBracket` re-queries ALL event enrollments per division — cache enrollments once per event, reuse across divisions
- [ ] `recordWinner` cascade is O(cells²) — build parent map once, walk it
- **Files:** `src/app/admin/brackets/actions.ts`
- **Effort:** ~1–2 hr

### P2-2 Upload pipeline
- [ ] Resize/compress images before Cloudinary upload (15MB originals stored today)
- [ ] Consider client-side compression for payment proofs
- [ ] Add cache headers to `/uploads/[...path]` route (local fallback)
- **Files:** `src/lib/uploads.ts`, `src/app/uploads/[...path]/route.ts`
- **Effort:** ~2 hr

### P2-3 Dashboard overview page — finish placeholder cards
- [ ] Real athlete count, payment status, next tournament (currently hardcoded "0", "—", "—")
- **Files:** `src/app/dashboard/page.tsx`
- **Effort:** ~1 hr

### P2-4 `claimChapterForUser` race
- [ ] Guard concurrent claims (transaction or conditional update)
- **Files:** `src/lib/chapters.ts`
- **Effort:** ~30 min

### P2-5 Tests
- [ ] Unit: `bracket-core`, `division-core`, form parsers
- [ ] Integration: server actions (enroll, payment, bracket gen)
- [ ] E2E: coach flow (register → enroll → pay → view bracket)
- **Effort:** ~1–2 days

---

## P3 — LOWER (backlog / nice to have)

### P3-1 CI/CD
- [ ] GitHub Actions: lint + typecheck + build on PR
- [ ] Auto-migrate on deploy (or `prisma migrate deploy` step)
- **Effort:** ~2 hr

### P3-2 Image optimization
- [ ] `next/image` for event images (currently raw `<img>`)
- **Effort:** ~1 hr

### P3-3 Notification fan-out optimization
- [ ] `setEventStatus` creates 1 row per chapter — fine at 100, batch at 1000+
- [ ] Consider polling/SSE for live bracket updates instead of full page refresh
- **Effort:** ~2–3 hr

### P3-4 Analytics
- [ ] Basic usage analytics (page views, registration funnel)
- **Effort:** ~1 hr

### P3-5 Backup/DR verification
- [ ] Confirm Neon backup schedule + test restore
- **Effort:** ~30 min

---

## Implementation order (recommended)

```
Phase 1 (before launch):  P0-1 → P0-2 → P0-3 → P0-4
Phase 2 (week 1):         P1-1 → P1-2 → P1-4 → P1-5
Phase 3 (week 2):         P1-3 → P1-6 → P2-1 → P2-2
Phase 4 (week 3+):        P2-3 → P2-4 → P2-5 → P3-*
```

Say **"implement P0"** / **"implement P1"** / etc. and I'll start on that section.