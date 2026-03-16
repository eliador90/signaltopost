import { PrismaClient } from "@prisma/client";

declare global {
  var __signalToPostPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__signalToPostPrisma__ ??
  new PrismaClient({
    datasourceUrl:
      process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/signaltopost?schema=public",
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__signalToPostPrisma__ = prisma;
}

export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "unknown_database_error" };
  }
}
