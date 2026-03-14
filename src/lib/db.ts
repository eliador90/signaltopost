import { PrismaClient } from "@prisma/client";

declare global {
  var __signalToPostPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__signalToPostPrisma__ ??
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL ?? "file:./dev.db",
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__signalToPostPrisma__ = prisma;
}
