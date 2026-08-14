import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { BeltType, ChapterStatus, Gender } from "../src/generated/prisma/client";

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

  const chapters = await prisma.chapter.findMany({
    select: { id: true, name: true, _count: { select: { athletes: true } } },
  });
  console.log(`Seeded ${chapters.length} chapters:`);
  for (const c of chapters) {
    console.log(`  - ${c.name}: ${c._count.athletes} athletes`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });