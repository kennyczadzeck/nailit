import { NextRequest, NextResponse } from 'next/server'

// Conditional import to avoid Jest issues
let getServerSession: any;
let authOptions: any;

try {
  const nextAuth = require('next-auth/next');
  getServerSession = nextAuth.getServerSession;
  authOptions = require('../api/auth/[...nextauth]/route').authOptions;
} catch (error) {
  // Fallback for testing environments
  getServerSession = () => Promise.resolve(null);
  authOptions = {};
}

/**
 * Security middleware for debug and test endpoints
 * Ensures these endpoints are only accessible in development or with proper authentication
 */
export async function requireDevelopmentOrAuth(request: NextRequest) {
  // Check if debug endpoints are explicitly disabled
  if (process.env.DISABLE_DEBUG_ENDPOINTS === 'true') {
    return NextResponse.json(
      { 
        error: 'Debug endpoints disabled',
        message: 'Debug endpoints are disabled in this environment for security' 
      }, 
      { status: 404 }  // Return 404 to hide endpoint existence
    )
  }

  // Allow in development environment
  if (process.env.NODE_ENV === 'development') {
    return null // No restrictions in development
  }

  // In staging/production, require authentication
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { 
        error: 'Unauthorized', 
        message: 'Debug endpoints require authentication in non-development environments' 
      }, 
      { status: 401 }
    )
  }

  // Optional: Add additional checks for admin users or specific permissions
  // For now, any authenticated user can access debug endpoints in staging
  return null
}

/**
 * Sanitize environment variables for safe display
 * Shows only safe information and masks sensitive values
 */
export function sanitizeEnvVars(envVars: Record<string, string | undefined>) {
  const sanitized: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      sanitized[key] = 'NOT_SET'
      continue
    }

    // List of sensitive patterns that should be masked
    const sensitivePatterns = [
      'SECRET', 'PASSWORD', 'TOKEN', 'KEY', 'CREDENTIAL',
      'DATABASE_URL', 'DIRECT_URL', 'CONNECTION'
    ]

    const isSensitive = sensitivePatterns.some(pattern => 
      key.toUpperCase().includes(pattern)
    )

    if (isSensitive) {
      // Show only that it's set, not the value
      sanitized[key] = 'SET'
    } else {
      // Safe to show (like NODE_ENV, URLs that aren't connection strings)
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Security headers for debug endpoints
 */
export const debugSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}

/**
 * Enhanced security headers for production
 */
export const enhancedSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.neon.tech https://*.amazonaws.com;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

/**
 * Get appropriate security headers based on environment
 */
export function getSecurityHeaders(): Record<string, string> {
  if (process.env.SECURITY_HEADERS_ENABLED === 'true' || process.env.NODE_ENV === 'production') {
    return enhancedSecurityHeaders
  }
  return debugSecurityHeaders
}

/**
 * Add security headers to a response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = getSecurityHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Wrapper for debug endpoints that applies security middleware
 */
export function withDebugSecurity(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const env = process.env.NODE_ENV || 'development';
    
    // Check if debug endpoints are disabled
    if (process.env.DISABLE_DEBUG_ENDPOINTS === 'true') {
      return NextResponse.json(
        { error: 'Debug endpoints are disabled' },
        { status: 403, headers: debugSecurityHeaders }
      );
    }

    // In development, allow all access
    if (env === 'development') {
      const response = await handler(req);
      return addSecurityHeaders(response);
    }

    // In staging/production, require authentication
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401, headers: debugSecurityHeaders }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication system unavailable' },
        { status: 503, headers: debugSecurityHeaders }
      );
    }

    const response = await handler(req);
    return addSecurityHeaders(response);
  };
}

/**
 * Check if current environment allows debug operations
 */
export function isDebugEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.NAILIT_ENVIRONMENT === 'development'
} 