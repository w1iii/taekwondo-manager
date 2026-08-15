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

## Operations notes

- Rate limits (in-DB fixed window, see `src/lib/rate-limit.ts`) apply per user
  to `enrollAthletes`, `submitPayment`, `registerChapter`, `createAthlete`.
- Caches: event/bracket/chapter reads are cached with tags
  (`events-published`, `brackets-cells`, `chapters`); mutations revalidate the
  matching tag. Never remove a `revalidateTag` from a mutation without
  understanding which page reads that tag.