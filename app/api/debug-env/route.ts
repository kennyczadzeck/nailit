import { NextResponse } from 'next/server';

export async function GET() {
  // Get all environment variables that start with common prefixes
  const allEnvKeys = Object.keys(process.env);
  const relevantEnv = allEnvKeys.filter(key => 
    key.startsWith('DATABASE') || 
    key.startsWith('NEXTAUTH') || 
    key.startsWith('GOOGLE') || 
    key.startsWith('NAILIT') ||
    key.startsWith('NEXT_PUBLIC')
  );

  const envSnapshot: Record<string, string | undefined> = {};
  relevantEnv.forEach(key => {
    envSnapshot[key] = process.env[key] ? '***SET***' : undefined;
  });

  return NextResponse.json({ 
    status: 'Environment check',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    
    // Original checks
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    
    // New debugging info
    totalEnvVars: allEnvKeys.length,
    relevantEnvKeys: relevantEnv,
    envSnapshot: envSnapshot,
    
    // Raw values (first 20 chars for security)
    nextAuthUrl: process.env.NEXTAUTH_URL?.substring(0, 20) + '...', 
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
    
    // Check if any DATABASE_ or NEXTAUTH_ variants exist
    possibleVariants: allEnvKeys.filter(key => 
      key.toLowerCase().includes('database') || 
      key.toLowerCase().includes('nextauth') ||
      key.toLowerCase().includes('next_auth')
    )
  });
} 