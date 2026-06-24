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

// One-off backfill for the move to todo projects. Every existing todo without a
// project is moved into a per-user "General" project. Run once with
// npx tsx scripts/migrate-todo-collections.ts, before the migration that makes
// collectionId required. Raw SQL reads the then-nullable collectionId so the
// script still typechecks after that finalize migration.
type OrphanTodo = { id: string; userId: string };

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const todos = await prisma.$queryRaw<OrphanTodo[]>`
    SELECT id, "userId" FROM "Todo" WHERE "collectionId" IS NULL
  `;

  // Group orphan todos by user, one "General" project each.
  const byUser = new Map<string, string[]>();
  for (const todo of todos) {
    const list = byUser.get(todo.userId) ?? [];
    list.push(todo.id);
    byUser.set(todo.userId, list);
  }

  for (const [userId, ids] of byUser) {
    const project = await prisma.todoCollection.create({
      data: { userId, title: "General" },
    });
    for (const id of ids) {
      await prisma.$executeRaw`
        UPDATE "Todo" SET "collectionId" = ${project.id} WHERE id = ${id}
      `;
    }
  }

  console.log(`Backfilled ${todos.length} todos into ${byUser.size} projects`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
