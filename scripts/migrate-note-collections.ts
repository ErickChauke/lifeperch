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

// One-off backfill for the move to notebooks. Every existing note without a
// notebook is moved into a per-user "General" notebook. Run once with
// npx tsx scripts/migrate-note-collections.ts, before the migration that makes
// collectionId required. Raw SQL reads the then-nullable collectionId so the
// script still typechecks after that finalize migration.
type OrphanNote = { id: string; userId: string };

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const notes = await prisma.$queryRaw<OrphanNote[]>`
    SELECT id, "userId" FROM "Note" WHERE "collectionId" IS NULL
  `;

  // Group orphan notes by user, one "General" notebook each.
  const byUser = new Map<string, string[]>();
  for (const note of notes) {
    const list = byUser.get(note.userId) ?? [];
    list.push(note.id);
    byUser.set(note.userId, list);
  }

  for (const [userId, ids] of byUser) {
    const notebook = await prisma.noteCollection.create({
      data: { userId, title: "General" },
    });
    for (const id of ids) {
      await prisma.$executeRaw`
        UPDATE "Note" SET "collectionId" = ${notebook.id} WHERE id = ${id}
      `;
    }
  }

  console.log(`Backfilled ${notes.length} notes into ${byUser.size} notebooks`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
