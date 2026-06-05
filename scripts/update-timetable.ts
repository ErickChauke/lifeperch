import { config } from "dotenv";

// Load env before constructing the Prisma client so the Neon adapter sees
// DATABASE_URL. This must run before importing anything that reads the env.
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { typeColor } from "../src/lib/timetable";

// Neon needs an explicit WebSocket constructor on Node runtimes for writes.
neonConfig.webSocketConstructor = ws;

// The single user this app belongs to. Sign in once with Google before
// running this script so the user row exists.
const USER_EMAIL = "erickchauke0217@gmail.com";

// Optional bulk-loader. The primary way events enter LifePerch is the timetable
// UI (add/edit/delete). Use this only to wipe and reload a whole week in one go,
// then run: npx tsx scripts/update-timetable.ts
// The rows below are generic examples — replace them with whatever your week holds
// (lessons, shifts, personal blocks). Any "type" in EVENT_TYPES works.
// dayOfWeek: 0 = Monday ... 6 = Sunday. Times are "HH:MM" (24 hour).
const EVENTS: {
  title: string;
  type: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
}[] = [
  { title: "Piano lesson", type: "lecture", dayOfWeek: 0, startTime: "09:00", endTime: "10:00", location: "Studio" },
  { title: "Work shift", type: "work", dayOfWeek: 2, startTime: "14:00", endTime: "18:00", location: "Office" },
  { title: "Gym", type: "personal", dayOfWeek: 4, startTime: "07:00", endTime: "08:00", location: "Home" },
];

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    throw new Error(`No user found for ${USER_EMAIL}. Sign in with Google once first.`);
  }

  await prisma.timetableEvent.deleteMany({ where: { userId: user.id } });
  await prisma.timetableEvent.createMany({
    data: EVENTS.map((e) => ({
      userId: user.id,
      title: e.title,
      type: e.type,
      color: typeColor(e.type),
      dayOfWeek: e.dayOfWeek,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location ?? null,
      isRecurring: true,
    })),
  });

  console.log(`Seeded ${EVENTS.length} events for ${USER_EMAIL}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
