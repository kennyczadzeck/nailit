import { NextRequest } from 'next/server'
import { requireDevelopmentOrAuth, sanitizeEnvVars, withDebugSecurity } from '../../../app/lib/security-middleware'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

const mockGetServerSession = require('next-auth').getServerSession

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
    // Mock process.env
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('requireDevelopmentOrAuth', () => {
    it('should block access when debug endpoints are disabled', async () => {
      setEnv('DISABLE_DEBUG_ENDPOINTS', 'true')
      
      const request = new NextRequest('http://localhost:3000/api/debug-env')
      const response = await requireDevelopmentOrAuth(request)
      
      expect(response).not.toBeNull()
      expect(response?.status).toBe(404)
      
      const responseBody = await response?.json()
      expect(responseBody.error).toBe('Debug endpoints disabled')
    })

    it('should allow access in development environment', async () => {
      process.env.NODE_ENV = 'development'
      
      const request = new NextRequest('http://localhost:3000/api/debug-env')
      const response = await requireDevelopmentOrAuth(request)
      
      expect(response).toBeNull()
    })

    it('should require authentication in production without session', async () => {
      process.env.NODE_ENV = 'production'
      mockGetServerSession.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/debug-env')
      const response = await requireDevelopmentOrAuth(request)
      
      expect(response).not.toBeNull()
      expect(response?.status).toBe(401)
      
      const responseBody = await response?.json()
      expect(responseBody.error).toBe('Unauthorized')
    })

    it('should allow access in production with valid session', async () => {
      process.env.NODE_ENV = 'production'
      mockGetServerSession.mockResolvedValue({
        user: { id: 'test-user-id', email: 'test@example.com' }
      })
      
      const request = new NextRequest('http://localhost:3000/api/debug-env')
      const response = await requireDevelopmentOrAuth(request)
      
      expect(response).toBeNull()
    })
  })

  describe('sanitizeEnvVars', () => {
    it('should mask sensitive environment variables', () => {
      const envVars = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:password@host:5432/db',
        API_KEY: 'secret-key-12345',
        NEXTAUTH_SECRET: 'super-secret-value',
        PUBLIC_URL: 'https://example.com'
      }
      
      const sanitized = sanitizeEnvVars(envVars)
      
      expect(sanitized.NODE_ENV).toBe('production')
      expect(sanitized.PUBLIC_URL).toBe('https://example.com')
      expect(sanitized.DATABASE_URL).toMatch(/\[SET - \d+ chars\]/)
      expect(sanitized.API_KEY).toMatch(/\[SET - \d+ chars\]/)
      expect(sanitized.NEXTAUTH_SECRET).toMatch(/\[SET - \d+ chars\]/)
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
      process.env.DISABLE_DEBUG_ENDPOINTS = 'true'
      
      const mockHandler = jest.fn()
      const securedHandler = withDebugSecurity(mockHandler)
      
      const request = new NextRequest('http://localhost:3000/api/debug-env')
      const response = await securedHandler(request)
      
      expect(mockHandler).not.toHaveBeenCalled()
      expect(response.status).toBe(404)
    })

    it('should call handler when security check passes', async () => {
      process.env.NODE_ENV = 'development'
      
      const mockResponse = new Response('test')
      const mockHandler = jest.fn().mockResolvedValue(mockResponse)
      const securedHandler = withDebugSecurity(mockHandler)
      
      const request = new NextRequest('http://localhost:3000/api/debug-env')
      const response = await securedHandler(request)
      
      expect(mockHandler).toHaveBeenCalledWith(request)
      expect(response).toBe(mockResponse)
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

    testCases.forEach(({ env, expectMasked }) => {
      process.env.NODE_ENV = env
      
      const sensitiveEnvVars = {
        DATABASE_URL: 'postgresql://user:pass@host:5432/db',
        GOOGLE_CLIENT_SECRET: 'GOCSPX-secret123',
        NEXT_PUBLIC_API_KEY: 'public-api-key' // This one should be safe to show
      }
      
      const sanitized = sanitizeEnvVars(sensitiveEnvVars)
      
      if (expectMasked) {
        expect(sanitized.DATABASE_URL).toMatch(/\[SET - \d+ chars\]/)
        expect(sanitized.GOOGLE_CLIENT_SECRET).toMatch(/\[SET - \d+ chars\]/)
      }
      
      // Public keys should be handled consistently
      expect(sanitized.NEXT_PUBLIC_API_KEY).toBe('public-api-key')
    })
  })
}) 