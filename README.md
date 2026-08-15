# taekwondo-client

Tournament manager for taekwondo (WT) events — coach registration, rosters,
payments, event enrollment, and bracket generation. Next.js App Router,
Clerk auth, Prisma + PostgreSQL (Neon), Cloudinary.

## Getting Started

```bash
npm install
npm run dev # or: npx prisma generate && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Env vars: copy `.env.example` to `.env.local` and fill in Clerk, one Cloudinary,
and the `DATABASE_URL`. Local uploads fall back to `.uploads/` in dev only —
production requires Cloudinary (`ALLOW_LOCAL_UPLOADS` must not be truthy).

## Roles

Two roles live in Clerk **public metadata** under `publicMetadata.role`:
`coach` (default) and `organizer`.

- **Grant organizer (programmatic):**
  ```bash
  node scripts/grant-organizer.mjs organizer@example.com
  # revoke back to coach:
  node scripts/grant-organizer.mjs organizer@example.com --revoke
  ```
  Requires `CLERK_SECRET_KEY`. The role takes effect on the user's next request.

- **Manual fallback (same effect):** Clerk Dashboard → Users → edit the user →
  Public metadata: `{ "role": "organizer" }`.

The app reads the key in `src/lib/auth.ts` (`getCurrentUser`). Keep the literal
lowercase values — `isRole` in `src/lib/roles.ts` is case-sensitive.

## Database

Prisma 7 with a generated client in `src/generated/prisma`.

```bash
npx prisma migrate dev            # apply pending migrations
npx prisma migrate deploy         # CI/CD: apply without prompts
npx prisma studio                 # inspect data
```

The `DATABASE_URL` should point at Neon's **pooled** endpoint (`-pooler`) with
`?pgbouncer=true` — see P0-1 in `TODO-LATEST.md` for why.

## Backups & disaster recovery

- **This app does not own the data layer.** Production lives on Neon, which
  provides point-in-time recovery out of the box. See P3-5 in `TODO-LATEST.md`
  for the confirmed schedule and the restore runbook.
- The schema is entirely reproducible from `prisma/migrations/` — a bare
  database can always be rebuilt with `npx prisma migrate deploy` (this path
  is verified against a throwaway database). Uploaded files live in
  Cloudinary and are not in Postgres; proofs stored there are covered by
  Cloudinary's own retention, not by a Postgres restore.

## Testing

```bash
npm test                 # all tests (unit + integration)
npm run test:unit        # pure-logic unit tests (no DB)
npm run test:integration # server-action integration tests
npm run test:e2e         # Playwright coach-flow E2E (builds + starts on :3100)
```

Integration tests hit a real Postgres test database. Set up once:

```bash
createdb taekwondo_test
DATABASE_URL="postgresql://<user>@localhost:5432/taekwondo_test" npx prisma migrate deploy
```

The default test URL in `tests/setup.ts` is `postgresql://wii@localhost:5432/taekwondo_test`
(override with the `DATABASE_URL` env var). Clerk auth and `next/cache` are mocked
(`tests/setup.ts`); every test wipes the tables in `beforeEach`.

E2E uses the same `taekwondo_test` DB (override with `E2E_DATABASE_URL`). It needs:
- a Clerk dev instance with keys in `.env.local` (tests use Clerk test-mode sign-in tickets)
- `npx playwright install chromium` once
- ports 3000 and 3100 free (the suite builds and serves a production build on 3100;
  stop your local `next dev` first — a second dev server won't start)

`e2e/global.setup.mts` provisions a unique Clerk user and seeds a deterministic
published event; `e2e/global.teardown.mts` deletes the created users afterwards.

## CI/CD

GitHub Actions (see `.github/workflows/`):

- **CI** (PRs + pushes to `main`): lint, `tsc --noEmit`, production `next build`,
  and unit + integration tests against a Postgres 17 service container. The build
  uses dummy env — no real secrets are needed to compile.
- **Deploy** (pushes to `main`): applies pending migrations via
  `npx prisma migrate deploy`, then triggers the Vercel production deploy.

Set up these GitHub secrets for the deploy workflow:

- `DATABASE_URL_MIGRATE` — Neon **direct** (non-pooled) endpoint. Migrations use
  this instead of the pooled `DATABASE_URL` because pooled/pgbouncer connections
  can interfere with migration advisory locks.
- `VERCEL_DEPLOY_HOOK_URL` — a Vercel Deploy Hook URL
  (Vercel → Settings → Git → Deploy Hooks).

E2E tests are intentionally excluded from CI — they need Clerk test-mode keys;
add them behind secrets if you want them in CI.

## Operations notes

- Analytics: page views are tracked in-DB (see `/admin/analytics`, roles-only).
  The beacon (`/api/analytics/view`, mounted in the root layout) is
  fire-and-forget and writes one `PageView` row per load — best-effort, so it
  can never break navigation or auth.
- Rate limits (in-DB fixed window, see `src/lib/rate-limit.ts`) apply per user
  to `enrollAthletes`, `submitPayment`, `registerChapter`, `createAthlete`.
- Caches: event/bracket/chapter reads are cached with tags
  (`events-published`, `brackets-cells`, `chapters`); mutations revalidate the
  matching tag. Never remove a `revalidateTag` from a mutation without
  understanding which page reads that tag.