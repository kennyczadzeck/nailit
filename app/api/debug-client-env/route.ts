import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint helps debug environment variable availability
  const clientEnvVars = {
    // These should be available if properly configured
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    
    // Show all NEXT_PUBLIC_ variables
    allNextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>),
    
    // Build-time vs runtime info
    buildInfo: {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      // This will show if we're in a server context
      hasProcess: typeof process !== 'undefined',
    }
  };

  return NextResponse.json({
    success: true,
    clientEnvironmentVariables: clientEnvVars,
    message: 'This shows what NEXT_PUBLIC_ environment variables are available to the server at runtime'
  });
} 