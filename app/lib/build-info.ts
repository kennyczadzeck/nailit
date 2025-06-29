// Build information for debugging and verification
export const BUILD_INFO = {
  // These will be populated at build time - EXPLICITLY reference the env vars
  commitHash: process.env.NEXT_PUBLIC_COMMIT_HASH || process.env.NAILIT_ENVIRONMENT || 'unknown',
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown',
  environment: process.env.NAILIT_ENVIRONMENT || 'unknown',
  nodeEnv: process.env.NODE_ENV || 'unknown',
  
  // Check if Google Maps API key is available - EXPLICIT reference
  hasGoogleMapsKey: !!(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
  googleMapsKeyLength: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.length || 0,
  
  // EXPLICIT reference to force Next.js to embed these variables
  explicitGoogleMapsKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  explicitBuildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
  
  // All public env vars (works on both client and server)
  publicEnvVars: Object.keys(process.env || {}).filter(key => key.startsWith('NEXT_PUBLIC_')),
  
  // Debug info - show all env keys for debugging
  allEnvKeys: typeof window === 'undefined' ? Object.keys(process.env || {}).slice(0, 10) : ['client-side'],
  
  // Test: Direct string comparison to see if variables are actually embedded
  testEmbedding: {
    hasKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0',
    keyValue: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    buildTimeSet: !!process.env.NEXT_PUBLIC_BUILD_TIME,
    buildTimeValue: process.env.NEXT_PUBLIC_BUILD_TIME,
  }
};

/**
 * Gets client-side environment variables (only works in browser)
 */
export function getClientSideEnvVars() {
  if (typeof window === 'undefined') {
    return { available: false, vars: [], message: 'Server-side - no client env vars' };
  }
  
  const clientVars = Object.keys(process.env || {}).filter(key => key.startsWith('NEXT_PUBLIC_'));
  return {
    available: true,
    vars: clientVars,
    hasGoogleMaps: clientVars.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'),
    googleMapsValue: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Available' : 'Missing'
  };
}

/**
 * Logs build information to console for debugging
 */
export function logBuildInfo() {
  console.group('🔧 Build Information');
  console.log('Commit Hash:', BUILD_INFO.commitHash);
  console.log('Build Time:', BUILD_INFO.buildTime);
  console.log('Environment:', BUILD_INFO.environment);
  console.log('Node Environment:', BUILD_INFO.nodeEnv);
  console.log('Has Google Maps Key:', BUILD_INFO.hasGoogleMapsKey);
  console.log('Google Maps Key Length:', BUILD_INFO.googleMapsKeyLength);
  console.log('Public Env Vars:', BUILD_INFO.publicEnvVars);
  
  // Client-side specific info
  const clientInfo = getClientSideEnvVars();
  console.log('Client-side Check:', clientInfo);
  console.groupEnd();
}

/**
 * Returns a build verification string for comparison
 */
export function getBuildVerification(): string {
  return `${BUILD_INFO.commitHash}-${BUILD_INFO.buildTime}`;
} 