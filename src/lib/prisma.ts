import { PrismaClient } from "@prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _prisma: PrismaClient | undefined

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (url && url.includes("neon.tech")) {
    const adapter = new PrismaNeon({ connectionString: url })
    return new PrismaClient({ adapter })
  }
  return new PrismaClient()
}

// Lazy proxy: prisma.chat.findMany() works transparently, but the client is
// only created on first use — avoiding crashes during Next.js build-time page
// data collection when DATABASE_URL is not yet available.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_prisma) {
      _prisma = globalForPrisma.prisma ?? createPrismaClient()
      if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prisma
    }
    return (_prisma as unknown as Record<string | symbol, unknown>)[prop]
  },
})
