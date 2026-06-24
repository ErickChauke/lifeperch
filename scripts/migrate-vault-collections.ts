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

// One-off backfill for the move to vault collection cards. Every existing
// document is grouped into a card named after its old category (an empty
// category goes to "Other"), then its collectionId is set. Run once with
// npx tsx scripts/migrate-vault-collections.ts, before the migration that
// makes collectionId required and drops the category column.
// Raw SQL is used to read the old category column and the then-nullable
// collectionId: both are gone from the schema after the finalize migration, so
// the typed client can no longer name them. This is a one-off historical script.
type OrphanDoc = { id: string; userId: string; category: string | null };

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const documents = await prisma.$queryRaw<OrphanDoc[]>`
    SELECT id, "userId", category FROM "Document" WHERE "collectionId" IS NULL
  `;

  // Group orphan documents by user and old category.
  const groups = new Map<string, OrphanDoc[]>();
  for (const doc of documents) {
    const title = doc.category?.trim() || "Other";
    const key = `${doc.userId}::${title}`;
    const list = groups.get(key) ?? [];
    list.push(doc);
    groups.set(key, list);
  }

  let cards = 0;
  for (const [key, docs] of groups) {
    const [userId, title] = key.split("::");
    const card = await prisma.vaultCollection.create({
      data: { userId, title },
    });
    for (const doc of docs) {
      await prisma.$executeRaw`
        UPDATE "Document" SET "collectionId" = ${card.id} WHERE id = ${doc.id}
      `;
    }
    cards += 1;
  }

  console.log(`Backfilled ${documents.length} documents into ${cards} cards`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
