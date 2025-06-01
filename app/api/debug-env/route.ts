import { NextResponse } from 'next/server';

export async function GET() {
  // Function to show secret info safely
  const secretInfo = (secret: string | undefined) => {
    if (!secret) return { status: 'NOT_SET', length: 0, preview: 'NOT_SET' };
    return {
      status: 'SET',
      length: secret.length,
      preview: `${secret.slice(0, 4)}...${secret.slice(-4)}`,
      firstChar: secret.charAt(0),
      lastChar: secret.charAt(secret.length - 1),
    };
  };

  // Detect environment based on DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
  let detectedEnvironment = 'unknown';
  
  if (dbUrl.includes('misty-frog')) {
    detectedEnvironment = 'production';
  } else if (dbUrl.includes('raspy-sound')) {
    detectedEnvironment = 'staging';
  } else if (dbUrl.includes('still-paper')) {
    detectedEnvironment = 'development';
  }

  const envConfig = {
    // Environment Detection
    detectedEnvironment,
    nodeEnv: process.env.NODE_ENV,
    
    // NextAuth Configuration
    nextauth: {
      url: process.env.NEXTAUTH_URL || 'NOT_SET',
      secret: secretInfo(process.env.NEXTAUTH_SECRET),
      urlMatches: checkUrlMatch(process.env.NEXTAUTH_URL, detectedEnvironment),
      expectedUrl: getExpectedUrl(detectedEnvironment),
    },
    
    // Database Configuration
    database: {
      url: secretInfo(dbUrl),
      migrationUrl: secretInfo(process.env.DATABASE_MIGRATION_URL),
      bothSet: !!(process.env.DATABASE_URL && process.env.DATABASE_MIGRATION_URL),
      
      // Non-database-related name tests
      backupConnection: secretInfo(process.env.BACKUP_CONNECTION_STRING),
      secondaryApp: secretInfo(process.env.SECONDARY_APP_URL),
      prismaConfig: secretInfo(process.env.PRISMA_CONFIG_URL),
      
      // Diagnostic tests
      testMigrationUrl: secretInfo(process.env.TEST_MIGRATION_URL),
      shortMigrationUrl: secretInfo(process.env.DATABASE_MIGRATION_URL_SHORT),
    },
    
    // Google OAuth (when you set it up)
    google: {
      clientId: secretInfo(process.env.GOOGLE_CLIENT_ID),
      clientSecret: secretInfo(process.env.GOOGLE_CLIENT_SECRET),
      bothSet: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    
    // Quick Health Check
    healthCheck: {
      allNextAuthVarsSet: !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET),
      allDatabaseVarsSet: !!(process.env.DATABASE_URL && process.env.DATABASE_MIGRATION_URL),
      urlConfigCorrect: checkUrlMatch(process.env.NEXTAUTH_URL, detectedEnvironment),
      readyForAuth: !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET && checkUrlMatch(process.env.NEXTAUTH_URL, detectedEnvironment)),
    },
    
    timestamp: new Date().toISOString(),
  };

  return Response.json(envConfig, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function checkUrlMatch(nextauthUrl: string | undefined, environment: string): boolean {
  if (!nextauthUrl) return false;
  
  const expectedUrl = getExpectedUrl(environment);
  return nextauthUrl === expectedUrl;
}

function getExpectedUrl(environment: string): string {
  switch (environment) {
    case 'production':
      return 'https://main.d1rq0k9js5lwg3.amplifyapp.com';
    case 'staging':
      return 'https://staging.d1rq0k9js5lwg3.amplifyapp.com';
    case 'development':
      return 'https://develop.d1rq0k9js5lwg3.amplifyapp.com';
    default:
      return 'http://localhost:3000'; // Local development
  }
} 