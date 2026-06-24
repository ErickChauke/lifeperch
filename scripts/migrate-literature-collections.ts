import { config } from "dotenv";

// Load env before constructing the Prisma client so the Neon adapter sees
// DATABASE_URL. This must run before importing anything that reads the env.
config({ path: ".env.local" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Neon needs an explicit WebSocket constructor on Node runtimes for writes.
neonConfig.webSocketConstructor = ws;

// One-off backfill for the move to literature topic folders. Every existing
// paper without a topic is moved into a per-user "General" topic. Run once with
// npx tsx scripts/migrate-literature-collections.ts, before the migration that
// makes collectionId required. Raw SQL reads the then-nullable collectionId so
// the script still typechecks after that finalize migration.
type OrphanPaper = { id: string; userId: string };

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const papers = await prisma.$queryRaw<OrphanPaper[]>`
    SELECT id, "userId" FROM "Literature" WHERE "collectionId" IS NULL
  `;

  // Group orphan papers by user, one "General" topic each.
  const byUser = new Map<string, string[]>();
  for (const paper of papers) {
    const list = byUser.get(paper.userId) ?? [];
    list.push(paper.id);
    byUser.set(paper.userId, list);
  }

  for (const [userId, ids] of byUser) {
    const topic = await prisma.literatureCollection.create({
      data: { userId, title: "General" },
    });
    for (const id of ids) {
      await prisma.$executeRaw`
        UPDATE "Literature" SET "collectionId" = ${topic.id} WHERE id = ${id}
      `;
    }
  }

  console.log(`Backfilled ${papers.length} papers into ${byUser.size} topics`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
