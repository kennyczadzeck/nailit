import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with explicit datasource URL to bypass schema env() issues
const createPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    console.error('Available env vars:', Object.keys(process.env).filter(key => 
      key.includes('DATABASE') || key.includes('NEON')
    ));
    
    // For Docker startup testing, return a mock client that throws on actual usage
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error('DATABASE_URL environment variable is required for database operations');
      }
    });
  }
  
  console.log('Creating Prisma client with DATABASE_URL:', databaseUrl.substring(0, 30) + '...');
  
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    },
    log: ['error', 'warn'] // Add logging to debug issues
  });
};

// Lazy initialization - only create client when accessed
let _prisma: PrismaClient | undefined;

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) {
      _prisma = globalForPrisma.prisma ?? createPrismaClient();
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prisma;
    }
    return _prisma[prop as keyof PrismaClient];
  }
}); 