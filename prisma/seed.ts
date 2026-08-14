import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ChapterStatus, Gender } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

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
    });
  }
  return athletes;
}

async function main() {
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