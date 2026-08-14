import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  BeltType,
  ChapterStatus,
  EventStatus,
  EventType,
  Gender,
} from "../src/generated/prisma/client";
import {
  ageForEventYear,
  ageWithinGroup,
  buildDivisions,
  weightWithinClass,
} from "../src/lib/division-core";
import { generateBracketCells, resolveByeWinners } from "../src/lib/bracket-core";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const WEIGHT_CLASSES = [
  // WT Senior — Kyorugi (reused across Cadet/Junior/Senior per M10 decision)
  { gender: Gender.MALE, name: "Fin", minKg: null, maxKg: 54, sortOrder: 1 },
  { gender: Gender.MALE, name: "Fly", minKg: null, maxKg: 58, sortOrder: 2 },
  { gender: Gender.MALE, name: "Feather", minKg: null, maxKg: 63, sortOrder: 3 },
  { gender: Gender.MALE, name: "Light", minKg: null, maxKg: 68, sortOrder: 4 },
  { gender: Gender.MALE, name: "Welter", minKg: null, maxKg: 74, sortOrder: 5 },
  { gender: Gender.MALE, name: "Middle", minKg: null, maxKg: 80, sortOrder: 6 },
  { gender: Gender.MALE, name: "Heavy", minKg: null, maxKg: 87, sortOrder: 7 },
  { gender: Gender.MALE, name: "Super Heavy", minKg: 87, maxKg: null, sortOrder: 8 },
  { gender: Gender.FEMALE, name: "Fin", minKg: null, maxKg: 46, sortOrder: 1 },
  { gender: Gender.FEMALE, name: "Fly", minKg: null, maxKg: 49, sortOrder: 2 },
  { gender: Gender.FEMALE, name: "Feather", minKg: null, maxKg: 53, sortOrder: 3 },
  { gender: Gender.FEMALE, name: "Light", minKg: null, maxKg: 57, sortOrder: 4 },
  { gender: Gender.FEMALE, name: "Welter", minKg: null, maxKg: 62, sortOrder: 5 },
  { gender: Gender.FEMALE, name: "Middle", minKg: null, maxKg: 67, sortOrder: 6 },
  { gender: Gender.FEMALE, name: "Heavy", minKg: null, maxKg: 73, sortOrder: 7 },
  { gender: Gender.FEMALE, name: "Super Heavy", minKg: 73, maxKg: null, sortOrder: 8 },
];

const COACHES = [
  {
    name: "Manila Smashers",
    province: "Metro Manila",
    city: "Manila",
    gcashNumber: "09171234567",
    headCoachName: "Coach Ramon Santos",
    headCoachEmail: "coach.ramon@example.com",
  },
  {
    name: "Cebu Kicks",
    province: "Cebu",
    city: "Cebu City",
    gcashNumber: "09182345678",
    headCoachName: "Coach Maria Reyes",
    headCoachEmail: "coach.maria@example.com",
  },
  {
    name: "Davao Dynamite",
    province: "Davao del Sur",
    city: "Davao City",
    gcashNumber: "09193456789",
    headCoachName: "Coach Jose Dela Cruz",
    headCoachEmail: "coach.jose@example.com",
  },
  {
    name: "Iloilo Invincibles",
    province: "Iloilo",
    city: "Iloilo City",
    gcashNumber: "09204567890",
    headCoachName: "Coach Ana Garcia",
    headCoachEmail: "coach.ana@example.com",
  },
];

const MALE_NAMES = [
  "John Paul",
  "Mark Anthony",
  "Carlo Miguel",
  "Rafael",
  "Nathaniel",
  "Sebastian",
  "Andrei",
  "Joshua",
];

const FEMALE_NAMES = [
  "Gabriella",
  "Sofia",
  "Isabella",
  "Carmela",
  "Alyssa",
  "Kristine",
  "Danica",
  "Lara",
];

const BELTS = [
  BeltType.WHITE,
  BeltType.YELLOW,
  BeltType.GREEN,
  BeltType.BLUE,
  BeltType.RED,
  BeltType.BLACK,
];

function athletesForChapter(chapterIndex: number) {
  const athletes = [];
  for (let i = 0; i < 8; i++) {
    const isFemale = i % 2 === 1;
    const first = isFemale ? FEMALE_NAMES[i] : MALE_NAMES[i];
    athletes.push({
      name: `${first} ${COACHES[chapterIndex].headCoachName.split(" ").pop()}`,
      gender: isFemale ? Gender.FEMALE : Gender.MALE,
      birthYear: 2008 + i,
      weightKg: 45 + i * 5,
      beltType: BELTS[i % BELTS.length],
    });
  }
  return athletes;
}

async function main() {
  for (const wc of WEIGHT_CLASSES) {
    await prisma.weightClass.upsert({
      where: { gender_name: { gender: wc.gender, name: wc.name } },
      create: wc,
      update: { minKg: wc.minKg, maxKg: wc.maxKg, sortOrder: wc.sortOrder },
    });
  }

  const coachEmails = COACHES.map((c) => c.headCoachEmail);

  await prisma.chapter.deleteMany({ where: { headCoachEmail: { in: coachEmails } } });

  let chapterCount = 0;
  for (const coach of COACHES) {
    const chapter = await prisma.chapter.create({
      data: {
        name: coach.name,
        province: coach.province,
        city: coach.city,
        gcashNumber: coach.gcashNumber,
        headCoachName: coach.headCoachName,
        headCoachEmail: coach.headCoachEmail,
        status: ChapterStatus.APPROVED,
      },
    });

    await prisma.athlete.createMany({
      data: athletesForChapter(chapterCount).map((a) => ({
        ...a,
        chapterId: chapter.id,
      })),
    });
    chapterCount++;
  }

  const playersArg = process.argv.find((a) => a.startsWith("--players="));
  if (playersArg) {
    const players = Number(playersArg.split("=")[1]);
    if (Number.isFinite(players) && players > 0) {
      await seedPlayers(players);
      return;
    }
  }

  const chapters = await prisma.chapter.findMany({
    select: { id: true, name: true, _count: { select: { athletes: true } } },
  });
  console.log(`Seeded ${chapters.length} chapters:`);
  for (const c of chapters) {
    console.log(`  - ${c.name}: ${c._count.athletes} athletes`);
  }
}

const SURNAMES = [
  "Santos",
  "Reyes",
  "Dela Cruz",
  "Garcia",
  "Ramos",
  "Mendoza",
  "Torres",
  "Flores",
  "Aquino",
  "Villanueva",
  "Castillo",
  "Navarro",
  "Romero",
  "Bautista",
  "Domingo",
  "Salazar",
];

const MALE_FIRST = [
  "John Paul",
  "Mark Anthony",
  "Carlo Miguel",
  "Rafael",
  "Nathaniel",
  "Sebastian",
  "Andrei",
  "Joshua",
  "Miguel",
  "Adrian",
  "Paolo",
  "Ethan",
  "Lucas",
  "Gabriel",
  "Francis",
  "Renzo",
  "Kyle",
  "Nathan",
  "Josh",
  "Dan",
  "Marco",
  "Joaquin",
  "Xavier",
  "Tristan",
  "Keanu",
  "Diego",
  "Marvin",
  "Jerome",
  "Vincent",
  "Nico",
  "Ramon",
  "Alejandro",
  "Ivan",
  "Kenji",
  "Philip",
  "Bryan",
  "Jerald",
  "Christian",
  "Emmanuel",
  "Lawrence",
];

const FEMALE_FIRST = [
  "Gabriella",
  "Sofia",
  "Isabella",
  "Carmela",
  "Alyssa",
  "Kristine",
  "Danica",
  "Lara",
  "Mikaela",
  "Angela",
  "Trisha",
  "Bea",
  "Camille",
  "Ella",
  "Hannah",
  "Julia",
  "Kyla",
  "Lea",
  "Mia",
  "Nicole",
  "Patricia",
  "Rianne",
  "Samantha",
  "Tiffany",
  "Valerie",
  "Zoe",
  "Chloe",
  "Daphne",
  "Erika",
  "Faye",
  "Gemma",
  "Jasmine",
  "Katrina",
  "Lianne",
  "Margaux",
  "Nina",
  "Odessa",
  "Piper",
  "Quinn",
  "Sage",
];

/**
 * Seed `players` athletes spread across all chapters, enroll them in a
 * published event, then generate divisions and brackets. Idempotent: clears
 * any existing seed athletes + enrollments so re-runs replace, not accumulate.
 * Run with: npx prisma db seed -- --players=100
 */
async function seedPlayers(players: number) {
  const chapters = await prisma.chapter.findMany({
    where: { status: ChapterStatus.APPROVED },
    select: { id: true },
  });
  if (chapters.length === 0) {
    console.log("No APPROVED chapters — aborting player seed.");
    return;
  }

  const event = await prisma.event.findFirst({
    where: { status: EventStatus.PUBLISHED },
    orderBy: { eventDate: "asc" },
  });
  if (!event) {
    console.log("No PUBLISHED event — aborting player seed.");
    return;
  }

  await prisma.enrollment.deleteMany({});
  await prisma.athlete.deleteMany({});

  const eventYear = event.eventDate.getFullYear();

  const rng = mulberry32(1337);

  const data = [];
  for (let i = 0; i < players; i += 1) {
    const isFemale = rng() < 0.5;
    const first = isFemale
      ? FEMALE_FIRST[Math.floor(rng() * FEMALE_FIRST.length)]
      : MALE_FIRST[Math.floor(rng() * MALE_FIRST.length)];
    const surname = SURNAMES[Math.floor(rng() * SURNAMES.length)];
    data.push({
      chapterId: chapters[Math.floor(rng() * chapters.length)].id,
      name: `${first} ${surname}`,
      gender: isFemale ? Gender.FEMALE : Gender.MALE,
      birthYear: eventYear - (4 + Math.floor(rng() * 30)),
      weightKg: isFemale
        ? 38 + Math.floor(rng() * 38)
        : 48 + Math.floor(rng() * 44),
      beltType: BELTS[Math.floor(rng() * BELTS.length)],
    });
  }

  await prisma.athlete.createMany({ data });

  const athletes = await prisma.athlete.findMany({
    select: {
      id: true,
      chapterId: true,
      gender: true,
      birthYear: true,
      weightKg: true,
      beltType: true,
    },
  });

  await prisma.enrollment.createMany({
    data: athletes.map((a) => ({
      eventId: event.id,
      athleteId: a.id,
      chapterId: a.chapterId,
    })),
    skipDuplicates: true,
  });

  const weightClasses = await prisma.weightClass.findMany({
    orderBy: [{ gender: "asc" }, { sortOrder: "asc" }],
  });
  const eventTypes = [
    EventType.KYORUGI,
    EventType.POOMSAE,
    EventType.FREESTYLE_POOMSAE,
    EventType.BREAKING,
  ];

  const divisions = buildDivisions(eventYear, athletes, weightClasses, eventTypes);

  await prisma.$transaction([
    prisma.division.deleteMany({ where: { eventId: event.id } }),
    prisma.division.createMany({
      data: divisions.map((d) => ({ ...d, eventId: event.id })),
    }),
  ]);

  const created = await prisma.division.findMany({
    where: { eventId: event.id },
    include: { weightClass: true },
  });

  let bracketCount = 0;
  for (const division of created) {
    const members = athletes
      .filter((a) => a.gender === division.gender)
      .filter((a) =>
        ageWithinGroup(ageForEventYear(a.birthYear, eventYear), {
          minAge: division.minAge,
          maxAge: division.maxAge,
        }),
      )
      .filter((a) =>
        division.eventType === EventType.KYORUGI
          ? division.weightClass != null &&
            weightWithinClass(a.weightKg, division.weightClass)
          : division.eventType === EventType.POOMSAE
            ? (a.beltType ?? null) === division.beltType
            : true,
      );
    const cells = resolveByeWinners(
      generateBracketCells(members, () => crypto.randomUUID()),
    );
    if (cells.length === 0) continue;
    await prisma.$transaction([
      prisma.bracketCell.deleteMany({ where: { divisionId: division.id } }),
      prisma.bracketCell.createMany({
        data: cells.map((c) => ({ ...c, divisionId: division.id })),
      }),
    ]);
    bracketCount += 1;
  }

  const athleteCount = await prisma.athlete.count();
  const enrollmentCount = await prisma.enrollment.count({
    where: { eventId: event.id },
  });
  console.log(`Seeded ${athletes.length} athletes across ${chapters.length} chapters.`);
  console.log(`Total athletes: ${athleteCount}, enrollments: ${enrollmentCount}`);
  console.log(`Event "${event.name}" (${eventYear}):`);
  console.log(`  ${divisions.length} divisions, ${bracketCount} brackets generated.`);
  const byGender = {
    MALE: athletes.filter((a) => a.gender === Gender.MALE).length,
    FEMALE: athletes.filter((a) => a.gender === Gender.FEMALE).length,
  };
  console.log(`  Gender split: ${byGender.MALE} M / ${byGender.FEMALE} F`);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });