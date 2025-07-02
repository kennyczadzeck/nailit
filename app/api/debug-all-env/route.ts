import { NextRequest, NextResponse } from 'next/server'
import { withDebugSecurity, sanitizeEnvVars, debugSecurityHeaders } from '../../lib/security-middleware'

async function handleDebugAllEnv(request: NextRequest) {
  // Get all environment variables that might be relevant
  const allEnvVars = Object.keys(process.env).filter(key => 
    key.includes('DATABASE') || 
    key.includes('DIRECT') ||
    key.includes('NEXTAUTH') ||
    key.includes('GOOGLE') ||
    key.startsWith('NAILIT') ||
    key.startsWith('NEXT_PUBLIC_')
  );

  // Create safe snapshot of environment variables
  const envSnapshot: Record<string, string | undefined> = {};
  allEnvVars.forEach(key => {
    envSnapshot[key] = process.env[key];
  });

  // Sanitize for safe display
  const sanitizedVars = sanitizeEnvVars(envSnapshot);

  return NextResponse.json({
    foundVariables: allEnvVars.length,
    variables: sanitizedVars,
    // Safe checks - only boolean existence, not values or lengths
    checks: {
      DATABASE_URL_exists: !!process.env.DATABASE_URL,
      DIRECT_URL_exists: !!process.env.DIRECT_URL,
      DATABASE_DIRECT_URL_exists: !!process.env.DATABASE_DIRECT_URL,
      NEON_CONNECTION_URL_exists: !!process.env.NEON_CONNECTION_URL,
      NEXTAUTH_SECRET_exists: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID_exists: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET_exists: !!process.env.GOOGLE_CLIENT_SECRET,
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    nailItEnvironment: process.env.NAILIT_ENVIRONMENT,
    warning: 'This endpoint is for debugging only and should not be accessible in production'
  }, {
    headers: {
      ...debugSecurityHeaders,
      'Content-Type': 'application/json'
    },
  });
}

// Apply security middleware
export const GET = withDebugSecurity(handleDebugAllEnv) 