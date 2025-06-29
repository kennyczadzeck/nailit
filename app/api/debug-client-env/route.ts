import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint helps debug environment variable availability
  const clientEnvVars = {
    // These should be available if properly configured
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME,
    
    // Show all NEXT_PUBLIC_ variables
    allNextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>),
    
    // Additional debugging - show all environment variable keys
    allEnvKeys: Object.keys(process.env).length,
    nextPublicKeysFound: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')),
    
    // Test direct access to what client would see
    clientSideTest: {
      googleMapsKey: typeof window === 'undefined' ? 'server-side' : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      buildTime: typeof window === 'undefined' ? 'server-side' : process.env.NEXT_PUBLIC_BUILD_TIME,
    },
    
    // Build-time vs runtime info
    buildInfo: {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      // This will show if we're in a server context
      hasProcess: typeof process !== 'undefined',
      isServer: typeof window === 'undefined',
    }
  };

  return NextResponse.json({
    success: true,
    clientEnvironmentVariables: clientEnvVars,
    message: 'This shows what NEXT_PUBLIC_ environment variables are available to the server at runtime'
  });
} 