/**
 * Centralized Test Fixtures Index
 * Single import point for all test fixtures
 */

// User fixtures
export * from './users'

// Project fixtures  
export * from './projects'

// API response fixtures
export * from './api-responses'

// Mock utilities
export * from '../helpers/mockPrisma'

// Common test utilities
export const testConfig = {
  // Default test dates
  dates: {
    past: new Date('2023-01-01T00:00:00Z'),
    recent: new Date('2024-01-01T00:00:00Z'),
    future: new Date('2024-12-31T00:00:00Z'),
  },

  // Test environment
  env: {
    testDatabaseUrl: 'postgresql://test:test@localhost:5432/nailit_test',
    jestTimeout: 30000,
  },

  // Mock configuration
  mocks: {
    defaultDelay: 100,
    networkTimeout: 5000,
  },
} as const

// Common test patterns
export const testPatterns = {
  // Database patterns
  database: {
    userId: /^user-\w+$/,
    projectId: /^project-\w+$/,
    email: /^[\w\.-]+@[\w\.-]+\.\w+$/,
  },

  // UI patterns
  ui: {
    buttonText: /^(Create|Save|Cancel|Delete|Edit)$/,
    loadingText: /^(Loading|Saving|Creating)\.\.\.$/,
    errorMessage: /^(Error|Failed|Unable to)/,
  },

  // API patterns
  api: {
    successStatus: [200, 201, 204],
    errorStatus: [400, 401, 403, 404, 500],
    jsonContentType: 'application/json',
  },
} as const

// BDD scenario builders
export const scenarios = {
  // Authentication scenarios
  auth: {
    authenticated: () => ({
      description: 'user is authenticated',
      setup: () => ({ authenticated: true }),
    }),
    unauthenticated: () => ({
      description: 'user is not authenticated', 
      setup: () => ({ authenticated: false }),
    }),
  },

  // Project scenarios
  projects: {
    hasProjects: (count: number = 3) => ({
      description: `user has ${count} project${count !== 1 ? 's' : ''}`,
      setup: () => ({ projectCount: count }),
    }),
    noProjects: () => ({
      description: 'user has no projects',
      setup: () => ({ projectCount: 0 }),
    }),
  },

  // API scenarios
  api: {
    success: (data: any) => ({
      description: 'API returns success',
      setup: () => ({ apiResponse: { status: 200, data } }),
    }),
    error: (status: number, message: string) => ({
      description: `API returns ${status} error`,
      setup: () => ({ apiResponse: { status, error: message } }),
    }),
  },
} as const

// Test assertion helpers
export const assertions = {
  // Common expectations
  shouldSeeText: (text: string) => 
    expect(document.body).toHaveTextContent(text),
  
  shouldSeeButton: (text: string) =>
    expect(document.querySelector(`button:contains("${text}")`)).toBeInTheDocument(),
  
  shouldNotSeeText: (text: string) =>
    expect(document.body).not.toHaveTextContent(text),

  // API expectations
  shouldCallApi: (mockFetch: jest.Mock, url: string, method: string = 'GET') => {
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(url),
      expect.objectContaining({ method })
    )
  },

  shouldNotCallApi: (mockFetch: jest.Mock) => {
    expect(mockFetch).not.toHaveBeenCalled()
  },
} as const 