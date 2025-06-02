/**
 * Centralized Prisma Mocking Utilities
 * Standardized mocking patterns for database operations
 */

// Mock Prisma client structure
export const createMockPrisma = () => ({
  project: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  flaggedItem: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  timelineEntry: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  emailSettings: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
})

// Global mock Prisma instance
export const mockPrisma = createMockPrisma()

// Setup Prisma mocks for common scenarios
export const setupPrismaMocks = {
  // Project mocks
  projectCount: (count: number) => {
    mockPrisma.project.count.mockResolvedValue(count)
  },

  projectsList: (projects: any[]) => {
    mockPrisma.project.findMany.mockResolvedValue(projects)
    mockPrisma.project.count.mockResolvedValue(projects.length)
  },

  projectsEmpty: () => {
    mockPrisma.project.findMany.mockResolvedValue([])
    mockPrisma.project.count.mockResolvedValue(0)
  },

  projectCreate: (project: any) => {
    mockPrisma.project.create.mockResolvedValue(project)
  },

  projectCreateError: (error: Error) => {
    mockPrisma.project.create.mockRejectedValue(error)
  },

  // User mocks
  userFound: (user: any) => {
    mockPrisma.user.findUnique.mockResolvedValue(user)
  },

  userNotFound: () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
  },

  // Database error scenarios
  databaseError: (error: Error = new Error('Database connection failed')) => {
    mockPrisma.project.findMany.mockRejectedValue(error)
    mockPrisma.project.count.mockRejectedValue(error)
    mockPrisma.user.findUnique.mockRejectedValue(error)
  },

  // Reset all mocks
  reset: () => {
    Object.values(mockPrisma).forEach((table) => {
      Object.values(table).forEach((method) => {
        if (jest.isMockFunction(method)) {
          method.mockReset()
        }
      })
    })
  },
}

// BDD-style mock helpers
export const givenDatabaseHas = {
  projects: (projects: any[]) => {
    setupPrismaMocks.projectsList(projects)
  },

  noProjects: () => {
    setupPrismaMocks.projectsEmpty()
  },

  user: (user: any) => {
    setupPrismaMocks.userFound(user)
  },

  noUser: () => {
    setupPrismaMocks.userNotFound()
  },
}

export const givenDatabaseFails = {
  withError: (error?: Error) => {
    setupPrismaMocks.databaseError(error)
  },

  onProjectCreation: () => {
    setupPrismaMocks.projectCreateError(new Error('Failed to create project'))
  },
}

// Mock setup for Jest tests
export const setupMockPrisma = () => {
  // Mock the Prisma module
  jest.doMock('../../../app/lib/prisma', () => ({
    prisma: mockPrisma,
  }))

  // Reset mocks before each test
  beforeEach(() => {
    setupPrismaMocks.reset()
  })

  return mockPrisma
} 