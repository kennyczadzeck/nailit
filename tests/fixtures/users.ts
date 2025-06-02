/**
 * Centralized User Test Fixtures
 * Used across BDD, integration, and unit tests
 */

export interface TestUser {
  id: string
  email: string
  name: string
  image?: string
  emailVerified?: Date
  createdAt?: Date
  updatedAt?: Date
}

export const testUsers = {
  // Primary test user - homeowner with projects
  john: {
    id: 'user-123',
    email: 'john.homeowner@example.com',
    name: 'John Homeowner',
    image: 'https://example.com/john.jpg',
    emailVerified: new Date('2024-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },

  // Secondary user - homeowner with no projects
  jane: {
    id: 'user-456',
    email: 'jane.newuser@example.com', 
    name: 'Jane New User',
    image: 'https://example.com/jane.jpg',
    emailVerified: new Date('2024-01-15T00:00:00Z'),
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
  },

  // Test user for error scenarios
  error: {
    id: 'user-error',
    email: 'error@example.com',
    name: 'Error Test User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },

  // Unauthenticated user scenario
  unauthenticated: null,
} as const

export const userScenarios = {
  authenticated: {
    user: testUsers.john,
    status: 'authenticated' as const,
  },
  unauthenticated: {
    user: null,
    status: 'unauthenticated' as const,
  },
  newUser: {
    user: testUsers.jane,
    status: 'authenticated' as const,
  },
}

// Utility functions for creating users
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  ...testUsers.john,
  ...overrides,
})

export const createUnauthenticatedSession = () => ({
  data: null,
  status: 'unauthenticated' as const,
})

export const createAuthenticatedSession = (user: TestUser = testUsers.john) => ({
  data: { user },
  status: 'authenticated' as const,
}) 