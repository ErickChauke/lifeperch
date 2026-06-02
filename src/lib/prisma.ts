import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 connects through a driver adapter. Neon serverless Postgres uses
// the Neon adapter with the DATABASE_URL connection string.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

// Reuses a single Prisma client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
