/**
 * Centralized API Response Test Fixtures
 * Used for mocking HTTP responses in tests
 */

import { testProjects, projectScenarios } from './projects'
import { testUsers } from './users'

// Success responses
export const successResponses = {
  // GET /api/projects responses
  projectsList: {
    status: 200,
    json: () => Promise.resolve(projectScenarios.userWithProjects.projects),
  },

  emptyProjectsList: {
    status: 200,
    json: () => Promise.resolve([]),
  },

  singleProject: {
    status: 200,
    json: () => Promise.resolve(testProjects.kitchenReno),
  },

  // POST /api/projects responses  
  projectCreated: {
    status: 201,
    json: () => Promise.resolve({
      id: 'new-project-123',
      name: 'New Test Project',
      userId: 'user-123',
      contractor: 'Test Contractor',
      createdAt: new Date().toISOString(),
    }),
  },

  // DELETE /api/projects/[id] responses
  projectDeleted: {
    status: 200,
    json: () => Promise.resolve({ success: true }),
  },

  // Generic success
  success: {
    status: 200,
    json: () => Promise.resolve({ success: true }),
  },
} as const

// Error responses
export const errorResponses = {
  // Authentication errors
  unauthorized: {
    status: 401,
    json: () => Promise.resolve({ error: 'Unauthorized' }),
  },

  // Authorization errors
  forbidden: {
    status: 403,
    json: () => Promise.resolve({ error: 'Forbidden' }),
  },

  // Not found errors
  notFound: {
    status: 404,
    json: () => Promise.resolve({ error: 'Not found' }),
  },

  // Validation errors
  badRequest: {
    status: 400,
    json: () => Promise.resolve({ 
      error: 'Validation failed',
      details: ['Name is required']
    }),
  },

  // Server errors
  internalError: {
    status: 500,
    json: () => Promise.resolve({ error: 'Internal server error' }),
  },

  // Database errors
  databaseError: {
    status: 500,
    json: () => Promise.resolve({ error: 'Database connection failed' }),
  },

  // Network errors
  networkError: {
    status: 0,
    json: () => Promise.reject(new Error('Network error')),
  },
} as const

// Form submission responses
export const formResponses = {
  projectCreation: {
    success: {
      status: 201,
      json: () => Promise.resolve({
        id: 'project-form-123',
        name: 'Kitchen Renovation',
        contractor: 'Mike Johnson Construction',
        architect: 'Sarah Chen Design',
        projectManager: 'Tom Wilson',
        redirectUrl: '/projects/project-form-123',
      }),
    },

    validationError: {
      status: 400,
      json: () => Promise.resolve({
        error: 'Validation failed',
        fieldErrors: {
          name: ['Project name is required'],
          contractor: ['Contractor is required'],
        },
      }),
    },

    duplicateName: {
      status: 409,
      json: () => Promise.resolve({
        error: 'Project name already exists',
      }),
    },
  },
} as const

// Utility functions for creating custom responses
export const createSuccessResponse = <T>(data: T, status: number = 200) => ({
  status,
  json: () => Promise.resolve(data),
})

export const createErrorResponse = (error: string, status: number = 500) => ({
  status,
  json: () => Promise.resolve({ error }),
})

// Mock fetch implementation
export const createMockFetch = (response: any) => {
  return jest.fn().mockResolvedValue(response)
}

// BDD response helpers
export const givenApiReturnsProjects = (projects: any[] = projectScenarios.userWithProjects.projects) => {
  return createSuccessResponse(projects)
}

export const givenApiReturnsNoProjects = () => {
  return createSuccessResponse([])
}

export const givenApiReturnsError = (status: number = 500, error: string = 'Internal server error') => {
  return createErrorResponse(error, status)
}

export const givenApiIsUnavailable = () => {
  return errorResponses.networkError
} 