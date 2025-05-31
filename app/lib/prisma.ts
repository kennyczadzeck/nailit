import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with explicit datasource URL to bypass schema env() issues
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  console.log('Creating Prisma client with DATABASE_URL:', databaseUrl.substring(0, 30) + '...');
  
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma 