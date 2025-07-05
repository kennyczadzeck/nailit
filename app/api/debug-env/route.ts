import { NextResponse } from 'next/server'
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware'

async function handleDebugEnv() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    NAILIT_ENVIRONMENT: process.env.NAILIT_ENVIRONMENT,
    // Only show existence, not values
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT_SET',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT_SET',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT_SET',
    // Safe to show public environment variables
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT_SET',
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME || 'NOT_SET'
  }
  
  return NextResponse.json({
    environment: envVars,
    timestamp: new Date().toISOString(),
    warning: 'This endpoint is for debugging only and should not be accessible in production'
  }, {
    headers: debugSecurityHeaders
  })
}

// Apply security middleware
export const GET = withDebugSecurity(handleDebugEnv) 