import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'

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
 * Wrapper for debug endpoints that applies security middleware
 */
export function withDebugSecurity(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async function securedHandler(request: NextRequest): Promise<NextResponse> {
    const securityResponse = await requireDevelopmentOrAuth(request)
    if (securityResponse) {
      return securityResponse
    }
    
    return handler(request)
  }
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
      sanitized[key] = `[SET - ${value.length} chars]`
    } else {
      // Safe to show (like NODE_ENV, URLs that aren't connection strings)
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Check if current environment allows debug operations
 */
export function isDebugEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || 
         process.env.NAILIT_ENVIRONMENT === 'development'
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
 * Get appropriate security headers based on environment
 */
export function getSecurityHeaders(): Record<string, string> {
  if (process.env.SECURITY_HEADERS_ENABLED === 'true' || process.env.NODE_ENV === 'production') {
    return enhancedSecurityHeaders
  }
  return debugSecurityHeaders
} 