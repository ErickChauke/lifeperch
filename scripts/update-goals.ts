import { config } from "dotenv";

// Load env before constructing the Prisma client so the Neon adapter sees
// DATABASE_URL. This must run before importing anything that reads the env.
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randToCents } from "../src/lib/money";

// Neon needs an explicit WebSocket constructor on Node runtimes for writes.
neonConfig.webSocketConstructor = ws;

// The single user this app belongs to. Sign in once with Google before
// running this script so the user row exists.
const USER_EMAIL = "erickchauke0217@gmail.com";

// Optional bulk-loader. The primary way goals enter LifePerch is the Money UI
// (add/edit/delete). Use this only to wipe and reload all savings goals in one
// go, then run: npx tsx scripts/update-goals.ts
// Amounts are in rand; they are stored as cents. monthly drives the ETA.
const GOALS: {
  name: string;
  target: number;
  current: number;
  monthly: number;
}[] = [
  { name: "Emergency fund", target: 50000, current: 32000, monthly: 3000 },
  { name: "New laptop", target: 22000, current: 4000, monthly: 1500 },
];

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    throw new Error(`No user found for ${USER_EMAIL}. Sign in with Google once first.`);
  }

  await prisma.savingsGoal.deleteMany({ where: { userId: user.id } });
  await prisma.savingsGoal.createMany({
    data: GOALS.map((g) => ({
      userId: user.id,
      name: g.name,
      targetAmount: randToCents(g.target),
      currentAmount: randToCents(g.current),
      monthlyAmount: randToCents(g.monthly),
    })),
  });

  console.log(`Seeded ${GOALS.length} goals for ${USER_EMAIL}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
