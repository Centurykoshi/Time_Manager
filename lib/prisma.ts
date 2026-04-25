import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

declare global {
  var __prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to connect Prisma to Neon.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
