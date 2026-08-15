# TODO-LATEST — Taekwondo Tournament Manager

Production-readiness work items from full-stack audit (2026-08-14).

**Status legend:** `[ ]` pending · `[x]` done · `[~]` in progress

---

## P0 — BLOCKERS (must fix before going live)

### P0-1 Connection pooling (crash risk at 100+ users)
- [x] Switch `DATABASE_URL` to Neon pooled endpoint (`-pooler` host) + `?pgbouncer=true`
- [x] Fix `src/lib/db.ts` — global cache currently only set in dev (`NODE_ENV !== "production"` guard). Always assign to global so prod gets one PrismaClient per instance.
- [x] Update `.env.example` comment (currently advises unpooled — backwards for serverless)
- **Why:** unpooled endpoint caps connections (100 free tier). Each PrismaClient = pg pool (up to 10 conns). 10 serverless instances × 10 = exhaustion → 500s.
- **Files:** `src/lib/db.ts`, `.env`, `.env.example`
- **Effort:** ~30 min

### P0-2 Cloudinary must be guaranteed in prod (silent data loss risk)
- [x] Verify `CLOUDINARY_URL` set in production env
- [x] Make `saveUpload()` fail loudly (throw) when no Cloudinary AND no local fallback allowed — or add explicit `NODE_ENV=production` guard that forbids local `.uploads/` fallback
- **Why:** local `.uploads/` is ephemeral on serverless — files vanish on redeploy, `/uploads/[...path]` 404s. Payment proofs lost silently.
- **Files:** `src/lib/uploads.ts`, `.env.local`
- **Effort:** ~20 min
- **Done:** local fallback now guarded by `ALLOW_LOCAL_UPLOADS` env (default: forbidden in `NODE_ENV=production`); `saveUpload` throws loud error otherwise.

### P0-3 Payment proofs are public (privacy/security)
- [x] Cloudinary: use signed URLs or private delivery for `proofs/` folder
- [x] Or serve proofs through an authenticated route (check chapter ownership before streaming)
- **Why:** GCash screenshots = financial data. `secure_url` is public-by-URL.
- **Files:** `src/lib/uploads.ts`, `src/app/dashboard/payments/[id]/page.tsx`, `src/app/admin/payments/[id]/page.tsx`
- **Effort:** ~1–2 hr
- **Done:** proofs uploaded as Cloudinary `private` type; rendered via authed `GET /api/payments/[id]/proof` that checks chapter ownership (coach: own chapter; organizer: any), streams bytes through a short-lived signed URL. `ProofView` now takes `paymentId`. Local dev files streamed from `.uploads`.

### P0-4 Unique constraint on Chapter.headCoachEmail
- [x] Add `@unique` to `Chapter.headCoachEmail` in `prisma/schema.prisma`
- [x] Migration + dedupe existing rows first
- [x] Fix `registerChapter` duplicate detection (currently catches a constraint error that can never fire → unlimited duplicate chapters per email)
- **Files:** `prisma/schema.prisma`, `src/app/register-chapter/actions.ts`
- **Effort:** ~1 hr
- **Done (deviation):** a **partial** unique index on `(headCoachEmail) WHERE status IN ('PENDING','APPROVED')` already existed since migration `20260813173221` — it allows REJECTED rows to free the email for re-registration. A full `@unique` would break that flow, and Prisma can't express partial indexes in the schema, so no new constraint was added. Verified no duplicate emails in the live DB (6 chapters, 0 dupes). `registerChapter` now pre-checks for an active registration and catches `P2002` by code (robust vs string matching) as race protection. Schema documented.

---

## P1 — HIGH (fix soon after launch)

### P1-1 Pagination on unbounded admin queries
- [x] `admin/payments` — paginate `loadPayments()` (currently loads ALL payments)
- [x] `admin/chapters` — paginate chapter list
- [x] `admin/athletes` — paginate + limit (1000+ rows → huge HTML, slow TTFB)
- [x] Add trigram index (`pg_trgm`) on `Athlete.name` for `contains + insensitive` search (currently full scan)
- **Files:** `src/app/admin/payments/page.tsx`, `src/app/admin/chapters/page.tsx`, `src/app/admin/athletes/page.tsx`, `prisma/schema.prisma`
- **Effort:** ~2–3 hr
- **Done:** added shared `Pagination` component + `src/lib/pagination.ts` helpers; per-status pagination for payments/chapters (keys `pending`/`approved`/`rejected`), single `page` param for athletes preserving all filters; `pg_trgm` GIN index on `Athlete.name` (migration `20260814162848_add_athlete_trgm` with `CREATE EXTENSION IF NOT EXISTS pg_trgm`). PAGE_SIZE = 25.

### P1-2 Caching layer for hot reads
- [x] `unstable_cache` on: published events list, brackets cells, chapter lookup
- [x] Revalidate on mutations (already have `revalidatePath` calls — wire to cache tags)
- **Why:** every page is fully dynamic, zero caching. 100 users × 5 queries = 500 queries/sec burst.
- **Files:** `src/app/dashboard/events/page.tsx`, `src/app/dashboard/brackets/page.tsx`, `src/app/admin/brackets/page.tsx`, `src/lib/chapters.ts`
- **Effort:** ~2–3 hr
- **Done:** reads already cached (`events-published`, `brackets-cells`, `chapters` tags). Wired tag revalidation into all mutations: brackets (`generateDivisions`/`generateBracket`/`resetBracket`/`recordWinner`), chapters (`approveChapter`/`rejectChapter`), events (`createEvent`/`updateEvent`/`deleteEvent`/`setEventStatus`). Note: this Next version deprecated 1-arg `revalidateTag` — use `revalidateTag(tag, "max")` in Server Actions (stale-while-revalidate) — see `node_modules/next/dist/docs/` for the 2-arg form.

### P1-3 Rate limiting on server actions
- [x] Add rate limit (e.g., upstash/redis or in-DB counter) on: `enrollAthletes`, `submitPayment`, `registerChapter`, `createAthlete`
- **Why:** abuse vector — no limits anywhere today.
- **Files:** all `actions.ts` files
- **Effort:** ~2 hr
- **Done:** in-DB fixed-window limiter (`RateLimit` model, migration `20260815021716_add_rate_limit`). `src/lib/rate-limit.ts` uses a single atomic `INSERT … ON CONFLICT` upsert so concurrent requests can't race the counter (count++ is server-side), then checks `count <= limit`. Per-user keys, friendly "Try again" errors. Limits: enroll 20/min, payment 5/min, register-chapter 3/hr, create-athlete 30/min.

### P1-4 Handle `submitPayment` race (unhandled P2002 → 500)
- [x] Wrap create in try/catch for unique constraint → return friendly error
- [x] Or use `upsert` instead of find-then-create
- **Files:** `src/app/dashboard/payments/actions.ts`
- **Effort:** ~20 min
- **Done:** wrapped the `create` in try/catch for `P2002` (TOCTOU backstop — a second request can't slip between the existence check and the insert) and `deleteUpload(proofUrl)` so the failed race doesn't orphan a private proof file in Cloudinary.

### P1-5 Organizer role provisioning
- [x] Add code path to set `role: "organizer"` (currently manual Clerk dashboard edit only)
- [x] Document the manual step in README as fallback
- **Files:** `src/lib/chapters.ts`, README
- **Effort:** ~1 hr
- **Done:** `scripts/grant-organizer.mjs <email> [--revoke]` hits Clerk's Backend API (user lookup → `public_metadata.role`), the exact key `auth.ts` reads — takes effect next request, no re-login. README documents both the script and the manual Dashboard fallback.

### P1-6 Error monitoring + logging
- [x] Add Sentry (or similar) — server actions + pages
- [x] Structured logging for payment/bracket mutations
- **Effort:** ~1–2 hr
- **Done:** lightweight structured logger `src/lib/log.ts` (`logInfo`/`reportError`, JSON lines in prod) — no new dependency; swap bodies for `Sentry.captureException` later is one line per function. Wired into `submitPayment`, `approvePayment`, `rejectPayment`, `generateDivisions`, `generateBracket`, `recordWinner` (errors re-thrown after logging so UI still gets the failure). Added `app/global-error.tsx` top-level boundary that reports unexpected errors.

---

## P2 — MEDIUM (next iteration)

### P2-1 Bracket generation efficiency
- [x] `generateBracket` re-queries ALL event enrollments per division — cache enrollments once per event, reuse across divisions
- [x] `recordWinner` cascade is O(cells²) — build parent map once, walk it
- **Files:** `src/app/admin/brackets/actions.ts`
- **Effort:** ~1–2 hr
- **Done:** new `src/lib/enrollments.ts` — `getEventEnrollments(eventId)` via `unstable_cache` (tag `event-enrollments`, 1h TTL), used by `generateDivisions` and `generateBracket` so the query runs once per event instead of once per division. Chapter IDs for bracket-published notifications derived from the same cached rows (dropped the second `findMany`). Cache invalidated (`revalidateTag(EVENT_ENROLLMENTS_TAG, "max")`) on `enrollAthletes`, `unenrollAthlete`, `deleteAthlete`. `recordWinner` now builds a `parentByChild` Map once and walks it — O(n) instead of O(cells²) `cells.find` per hop.

### P2-2 Upload pipeline
- [x] Resize/compress images before Cloudinary upload (15MB originals stored today)
- [x] Consider client-side compression for payment proofs
- [x] Add cache headers to `/uploads/[...path]` route (local fallback)
- **Files:** `src/lib/uploads.ts`, `src/app/uploads/[...path]/route.ts`
- **Effort:** ~2 hr
- **Done:** `src/lib/client-image.ts` — `compressImageFile()` downscales to max 1600px in the browser (canvas + `createImageBitmap`), returns original if already small/undecodable, never grows the file. Wired into `PaymentForm` (proof) and `EventForm` (event image). Server backstop in `saveUpload`: Cloudinary `transformation: [{ crop: "limit", width: 1600, height: 1600 }]` caps stored dimensions for any upload that skips client compression. `/uploads/[...path]` route now sends `Cache-Control: public, max-age=31536000, immutable` (UUID filenames are content-addressed).

### P2-3 Dashboard overview page — finish placeholder cards
- [x] Real athlete count, payment status, next tournament (currently hardcoded "0", "—", "—")
- **Files:** `src/app/dashboard/page.tsx`
- **Effort:** ~1 hr
- **Done:** athlete count via `db.athlete.count({ chapterId })`; payment status card reads the chapter's latest non-rejected payment (badge + ₱ per-athlete hint, with "Not submitted" state); next tournament card shows the next published event (name, date, location, link). All three query in parallel; placeholder branches kept when no chapter/event exists.

### P2-4 `claimChapterForUser` race
- [x] Guard concurrent claims (transaction or conditional update)
- **Files:** `src/lib/chapters.ts`
- **Effort:** ~30 min
- **Done:** claim now uses `updateMany({ where: { id, headCoachUserId: null } })` and only writes Clerk metadata when `count === 1` — a concurrent dashboard visit or second device can't double-claim or clobber another coach's link.

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

**Done:** P0 all · P1 all · P2-1, P2-2, P2-3, P2-4 (2026-08-15). Remaining: P2-5 tests, P3-* backlog.

Say **"implement P0"** / **"implement P1"** / etc. and I'll start on that section.