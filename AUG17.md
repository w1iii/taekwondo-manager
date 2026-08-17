# AUG17 — Division-on-demand & Registration Rework (implemented)

Status: **IMPLEMENTED**. This file tracks the final shipped design as it exists in
the code today. Schema drift: `prisma/schema.prisma` + migration
`20260817030745_add_event_divisions` (one migration, not three).

## Goal

Stop pre-generating thousands of `Division` rows up front. Instead:
- Organizer configures a *pool* of available divisions per event.
- Coach picks divisions per athlete during registration.
- A live `Division` row is created only when an athlete is actually approved into it.

## Model changes

Removed (migration drops the tables):
- `Enrollment`
- `TeamPayment` (payment data now lives on `PaymentAttempt`)
- `ApprovedAthlete.teamPaymentId`

Added:
- `EventDivision` — admin-curated pool per event. One row per candidate
  division (`divisionKey` unique per event). Auto-seeded from
  `enumerateDivisions` at event create/edit based on the selected event types
  + weight classes.
- `OrderItemDivision` — which divisions each order line (athlete) asked for.
- `ApprovedAthleteDivision` — which divisions an approved athlete is entered
  in. Uniqueness `[approvedAthleteId, divisionId]`; a single approval row can
  span multiple divisions.

`Division` remains the *live* bracket unit (bracket cells, winner recording all
hang off it). `Division.eventDivisionId` links live row → pool row (nullable,
for provenance).

## Registration flow

1. **Coach** (`dashboard/events/[id]`) picks athletes from My Roster and, per
   athlete, a division multi-select populated from the event's `EventDivision`
   pool (`dashboard/events/actions.ts#submitOrder`).
2. Order created: `Order` + `OrderItem` per athlete + `OrderItemDivision`.
3. **Organizer** approves the `PaymentAttempt` (`admin/payments/actions.ts`):
   - marks `Order` APPROVED,
   - for each `OrderItemDivision`: finds-or-creates the live `Division` from
     the pool row (lazy materialization) and inserts `ApprovedAthlete` +
     `ApprovedAthleteDivision`,
   - deletes the `OrderItem`/`OrderItemDivision`/`Order` rows (no backlog).
4. Bracket draw (`admin/brackets/actions.ts#generateBracket`) reads
   `ApprovedAthleteDivision` members directly and seeds `BracketCell`s.

## Division catalog (`src/lib/division-core.ts`)

- `AGE_GROUPS` — 11 WT age groups (Under 10 → Veteran 50+). Kyorugi-eligible:
  Cadet, Junior, Under 21, Senior, Veteran 30–39, 40–49, 50+.
- `enumerateDivisions(weightClasses, eventTypes)` — full candidate set for an
  event, *no* athlete filtering; admin curates from this. Kyorugi = per weight
  class; Poomsae = per belt (incl. no-belt); Freestyle/Breaking = one per
  age group × gender.
- `buildDivisions(eventYear, athletes, weightClasses, eventTypes)` — legacy
  per-athlete-set generator. Still exported (integration tests) but no longer
  called by the app.
- `athletesInDivision` — used only in tests now; live brackets derive members
  from `ApprovedAthleteDivision`.
- Division naming keys: `EVENT|GENDER|min/max|weightClassId|belt`.

## Caching

- `getEventEntries` (`src/lib/enrollments.ts`) — cached approved athletes per
  event, tag `event-registrations`, invalidated on approval. Now also includes
  the approved athlete's divisions.
- Bracket cells cached under tag `brackets-cells`.

## UI

- `admin/events/event-form.tsx` — event-type checkboxes; availability section
  toggling which `EventDivision` pool rows are on.
- `dashboard/events/[id]/enroll-form.tsx` — per-athlete division multi-select
  (only options the athlete is eligible for by gender/age/weight/belt).
- `dashboard/events/[id]/page.tsx` — pending-order summary (`Pending order · n`).
- `admin/brackets/events/[eventId]/divisions/page.tsx` — live divisions + members
  from `ApprovedAthleteDivision`; no more `getEventEntries` filtering.

## Tests

- `src/lib/division-core.test.ts` — enumerator covers full age range, kyorugi
  per weight class, poomsae per belt, one per age group for freestyle/breaking,
  unique keys across event types, no kyorugi without weight classes.
- `tests/integration/actions.test.ts` + `helpers.ts` — rewritten against the
  EventDivision pool + approved-division model.
- `e2e/helpers/db.mts` — seeded pool + live-division helpers,
  `approvePayment`/`createEnrollment` now create `ApprovedAthleteDivision`,
  `seedDivisionAndBracket` mirrors `generateBracket`.
- `e2e/coach-flow.spec.mts` — coach selects division in enroll form and asserts
  pending order item.

## Known gaps / follow-ups

- `dashboard/brackets/[eventId]/page.tsx` may still reference old per-division
  entry counts — verify against `ApprovedAthleteDivision` on next touch.
- E2E covers the single kyorugi path only; poomsae/belt and multi-division
  approvals untested.
- `buildDivisions`/`athletesInDivision` are dead code kept for tests — could be
  removed once integration tests stop using them.

---

# AthleteClub / Roster membership (implemented)

## Model

- `AthleteClub` — explicit club-member join (unique `[athleteId, chapterId]`):
  `status` (ACTIVE/INACTIVE), `joinedAt`, `leftAt`. Relation added on both
  `Athlete.clubMemberships` and `Chapter.clubMemberships`.
- `Athlete.chapterId` kept as the athlete's *current club* (ownership).
- Migration `20260817050000_add_athlete_club` creates the table and backfills
  every existing athlete as an ACTIVE member of their chapter (joinedAt = the
  athlete's createdAt).

## Flow

- `createAthlete` (`dashboard/roster/actions.ts`) now creates the athlete with a
  nested `clubMemberships` create → every roster athlete is a club member.
- `deleteAthlete` relies on FK `ON DELETE CASCADE`.
- New dashboard page `/dashboard/roster-members` — the club roster view. Lists
  ACTIVE members (avatar, gender · belt · age, joined date), notes inactive
  count. My Roster (`/dashboard/roster`) unchanged: it keeps managing athletes
  (add/edit/delete/search) for the coach's chapter.
- Dashboard nav gained `Roster Members` (IdCard icon) between My Roster and
  Register for Event.

## Tests

- Integration: `createAthlete` creates the athlete + an ACTIVE membership.
- `seedAthletes` and the e2e `createAthlete` helper mirror the membership write;
  `resetDb`/TRUNCATE cover `AthleteClub`.

## Decisions (from design Q&A)

- Keep `Athlete.chapterId` as source of ownership; `AthleteClub` is the
  membership record. There is no draft-enrollment/pooled-entry concept in this
  codebase, so My Roster = chapter athletes only, same population as Roster
  members for now.
- Membership properties intentionally minimal: status + joined/left timestamps.
