import { PrismaClient } from '../generated/prisma'

const globalForPrisma = global as unknown as {
    prisma: PrismaClient
}

/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloads create new PrismaClient instances
 * which can exhaust connection pools. We store the client on `global`
 * to prevent this. In production, the global is always used to ensure
 * a single connection pool across serverless function invocations.
 */
export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
// Always store for production too — prevents pool exhaustion on warm starts
if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = prisma

export default prisma
