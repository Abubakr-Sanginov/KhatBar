import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) return new PrismaClient()
  if (url.includes("neon.tech")) {
    const adapter = new PrismaNeon({ connectionString: url })
    return new PrismaClient({ adapter })
  }
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

// Lazy proxy — the client is only created on first use, so build-time
// page-data collection (which imports this module but never queries) does
// not crash when DATABASE_URL is absent.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    const value = (globalForPrisma.prisma as unknown as Record<string, unknown>)[prop as string]
    if (typeof value === "function") {
      return (value as Function).bind(globalForPrisma.prisma)
    }
    return value
  },
})
