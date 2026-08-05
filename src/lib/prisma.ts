import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL!
  // Neon's HTTP driver is only used for Neon connection strings;
  // any other Postgres (local, Docker, VPS) uses the standard TCP driver.
  if (url.includes("neon.tech")) {
    const adapter = new PrismaNeon({ connectionString: url })
    return new PrismaClient({ adapter })
  }
  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma