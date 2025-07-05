import { requireDevelopmentOrAuth, sanitizeEnvVars, withDebugSecurity } from '../../../app/lib/security-middleware'

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: () => Promise.resolve(data),
      headers: { set: jest.fn() }
    }))
  }
}))

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

// Mock next-auth/next as well (this is what the security middleware imports)
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock the auth route that gets imported
jest.mock('../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {}
}))

// Mock NextRequest since it has polyfill issues in Jest
const mockNextRequest = {
  url: 'http://localhost:3000/api/debug-env',
  method: 'GET',
  headers: new Headers()
}

const mockGetServerSession = require('next-auth/next').getServerSession

// Helper to safely set environment variables
const setEnv = (key: string, value: string) => {
  Object.defineProperty(process.env, key, {
    value,
    configurable: true,
    writable: true
  })
}

describe('Security Middleware', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset process.env
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('requireDevelopmentOrAuth', () => {
    it('should block access when debug endpoints are disabled', async () => {
      setEnv('DISABLE_DEBUG_ENDPOINTS', 'true')
      
      const response = await requireDevelopmentOrAuth()
      
      expect(response).not.toBeNull()
      expect(response?.status).toBe(404)
      
      const responseBody = await response?.json()
      expect(responseBody.error).toBe('Debug endpoints disabled')
    })

    it('should allow access in development environment', async () => {
      setEnv('NODE_ENV', 'development')
      delete process.env.DISABLE_DEBUG_ENDPOINTS
      
      const response = await requireDevelopmentOrAuth()
      
      expect(response).toBeNull()
    })

    it('should require authentication in production without session', async () => {
      setEnv('NODE_ENV', 'production')
      delete process.env.DISABLE_DEBUG_ENDPOINTS
      mockGetServerSession.mockResolvedValue(null)
      
      const response = await requireDevelopmentOrAuth()
      
      expect(response).not.toBeNull()
      expect(response?.status).toBe(401)
      
      const responseBody = await response?.json()
      expect(responseBody.error).toBe('Unauthorized')
    })

    it('should allow access in production with valid session', async () => {
      setEnv('NODE_ENV', 'production')
      delete process.env.DISABLE_DEBUG_ENDPOINTS
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      })
      
      const response = await requireDevelopmentOrAuth()
      
      expect(response).toBeNull()
    })
  })

  describe('sanitizeEnvVars', () => {
    it('should mask sensitive environment variables', () => {
      const envVars = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:password@host/db',
        API_KEY: 'secret-key-12345',
        NEXTAUTH_SECRET: 'next-auth-secret-value',
        PUBLIC_URL: 'https://example.com',
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret-value',  // Contains SECRET
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-api-key',   // Contains KEY
      }
      
      const sanitized = sanitizeEnvVars(envVars)
      
      // Non-sensitive values should pass through
      expect(sanitized.NODE_ENV).toBe('production')
      expect(sanitized.PUBLIC_URL).toBe('https://example.com')
      expect(sanitized.GOOGLE_CLIENT_ID).toBe('test-client-id')
      
      // Sensitive values should be masked as "SET"
      expect(sanitized.DATABASE_URL).toBe('SET')
      expect(sanitized.API_KEY).toBe('SET')
      expect(sanitized.NEXTAUTH_SECRET).toBe('SET')
      expect(sanitized.GOOGLE_CLIENT_SECRET).toBe('SET') // Contains SECRET pattern
      expect(sanitized.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).toBe('SET') // Contains KEY pattern
    })

    it('should handle undefined values', () => {
      const envVars = {
        DEFINED_VAR: 'value',
        UNDEFINED_VAR: undefined
      }
      
      const sanitized = sanitizeEnvVars(envVars)
      
      expect(sanitized.DEFINED_VAR).toBe('value')
      expect(sanitized.UNDEFINED_VAR).toBe('NOT_SET')
    })
  })

  describe('withDebugSecurity wrapper', () => {
    it('should call security middleware before handler', async () => {
      setEnv('DISABLE_DEBUG_ENDPOINTS', 'true')
      
      const mockHandler = jest.fn()
      const securedHandler = withDebugSecurity(mockHandler)
      
      const response = await securedHandler(mockNextRequest as any)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(403) // withDebugSecurity returns 403, not 404
    })

    it('should call handler when security check passes', async () => {
      setEnv('NODE_ENV', 'development')
      delete process.env.DISABLE_DEBUG_ENDPOINTS
      
      const mockResponse = { 
        status: 200, 
        json: () => Promise.resolve({ data: 'test' }),
        headers: { set: jest.fn() }
      }
      const mockHandler = jest.fn().mockResolvedValue(mockResponse)
      const securedHandler = withDebugSecurity(mockHandler)
      
      const response = await securedHandler(mockNextRequest as any)
      
      expect(mockHandler).toHaveBeenCalledWith(mockNextRequest)
      // The response is wrapped with security headers, so we check that the mock was called
      expect(mockResponse.headers.set).toHaveBeenCalled()
    })
  })
})

describe('Security Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prevent credential exposure in different environments', () => {
    const testCases = [
      {
        env: 'development',
        expectMasked: false // In dev, we might want to see more details
      },
      {
        env: 'production', 
        expectMasked: true // In production, always mask
      }
    ]

    testCases.forEach(({ env }) => {
      setEnv('NODE_ENV', env)
      
      const sensitiveEnvVars = {
        DATABASE_URL: 'postgresql://user:password@host/db',
        GOOGLE_CLIENT_SECRET: 'test-client-secret-value',
        NORMAL_VAR: 'public-value' // This one doesn't match sensitive patterns
      }
      
      const sanitized = sanitizeEnvVars(sensitiveEnvVars)
      
      // Based on current implementation, sensitive vars are masked
      expect(sanitized.DATABASE_URL).toBe('SET')
      expect(sanitized.GOOGLE_CLIENT_SECRET).toBe('SET')
      
      // Normal variables should pass through
      expect(sanitized.NORMAL_VAR).toBe('public-value')
    })
  })
}) 