export async function GET() {
  // Get all environment variables that might be relevant
  const allEnvVars = Object.keys(process.env).filter(key => 
    key.includes('DATABASE') || 
    key.includes('DIRECT') ||
    key.includes('NEXTAUTH') ||
    key.includes('GOOGLE') ||
    key.startsWith('NAILIT')
  );

  const envSnapshot: Record<string, string> = {};
  allEnvVars.forEach(key => {
    const value = process.env[key];
    if (value) {
      // Show first and last 4 characters for debugging
      envSnapshot[key] = value.length > 8 ? 
        `${value.slice(0, 4)}...${value.slice(-4)} (length: ${value.length})` : 
        '***HIDDEN*** (short)';
    } else {
      envSnapshot[key] = 'NOT_SET';
    }
  });

  return Response.json({
    foundVariables: allEnvVars.length,
    variables: envSnapshot,
    // Specific checks
    checks: {
      DATABASE_URL_exists: !!process.env.DATABASE_URL,
      DIRECT_URL_exists: !!process.env.DIRECT_URL,
      DATABASE_DIRECT_URL_exists: !!process.env.DATABASE_DIRECT_URL,
      NEON_CONNECTION_URL_exists: !!process.env.NEON_CONNECTION_URL,
      DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
      DIRECT_URL_length: process.env.DIRECT_URL?.length || 0,
      DATABASE_DIRECT_URL_length: process.env.DATABASE_DIRECT_URL?.length || 0,
      NEON_CONNECTION_URL_length: process.env.NEON_CONNECTION_URL?.length || 0,
    },
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
} 