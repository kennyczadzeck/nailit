/**
 * Centralized Project Test Fixtures
 * Used across BDD, integration, and unit tests
 */

import { testUsers } from './users'

export interface TestProject {
  id: string
  name: string
  userId: string
  contractor?: string
  architect?: string
  projectManager?: string
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'
  budget?: number
  startDate?: Date
  expectedEndDate?: Date
  createdAt?: Date
  updatedAt?: Date
  user?: any
  emailSettings?: any
  _count?: {
    flaggedItems: number
    timelineEntries: number
  }
}

export const testProjects = {
  // Main test project - kitchen renovation
  kitchenReno: {
    id: 'project-1',
    name: 'Kitchen Renovation',
    userId: 'user-123',
    contractor: 'Mike Johnson Construction',
    architect: 'Sarah Chen Design',
    status: 'ACTIVE' as const,
    budget: 75000,
    startDate: new Date('2024-02-01T00:00:00Z'),
    expectedEndDate: new Date('2024-04-01T00:00:00Z'),
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    user: testUsers.john,
    emailSettings: { enabled: true },
    _count: {
      flaggedItems: 3,
      timelineEntries: 7,
    },
  },

  // Secondary project - bathroom remodel
  bathroomRemodel: {
    id: 'project-2', 
    name: 'Master Bathroom Remodel',
    userId: 'user-123',
    contractor: 'Lopez Brothers Construction',
    status: 'ACTIVE' as const,
    budget: 25000,
    startDate: new Date('2024-03-01T00:00:00Z'),
    expectedEndDate: new Date('2024-05-01T00:00:00Z'),
    createdAt: new Date('2024-02-01T00:00:00Z'),
    updatedAt: new Date('2024-02-01T00:00:00Z'),
    user: testUsers.john,
    emailSettings: { enabled: true },
    _count: {
      flaggedItems: 1,
      timelineEntries: 3,
    },
  },

  // Completed project for historical data
  deckAddition: {
    id: 'project-3',
    name: 'Deck Addition',
    userId: 'user-123',
    contractor: 'Outdoor Spaces LLC',
    projectManager: 'Tom Wilson',
    status: 'COMPLETED' as const,
    budget: 15000,
    startDate: new Date('2023-08-01T00:00:00Z'),
    expectedEndDate: new Date('2023-10-01T00:00:00Z'),
    createdAt: new Date('2023-07-15T00:00:00Z'),
    updatedAt: new Date('2023-10-15T00:00:00Z'),
    user: testUsers.john,
    emailSettings: { enabled: false },
    _count: {
      flaggedItems: 0,
      timelineEntries: 12,
    },
  },

  // Minimal project for new user scenarios
  simple: {
    id: 'project-simple',
    name: 'Simple Home Project',
    userId: 'user-456',
    contractor: 'Basic Construction',
    status: 'ACTIVE' as const,
    createdAt: new Date('2024-01-15T00:00:00Z'),
    updatedAt: new Date('2024-01-15T00:00:00Z'),
    user: testUsers.jane,
    emailSettings: { enabled: true },
    _count: {
      flaggedItems: 0,
      timelineEntries: 1,
    },
  },
} as const

export const projectScenarios = {
  // User has multiple projects
  userWithProjects: {
    userId: 'user-123',
    projects: [testProjects.kitchenReno, testProjects.bathroomRemodel, testProjects.deckAddition],
    count: 3,
  },

  // New user with no projects
  userWithoutProjects: {
    userId: 'user-456', 
    projects: [],
    count: 0,
  },

  // User with single project
  userWithSingleProject: {
    userId: 'user-456',
    projects: [testProjects.simple],
    count: 1,
  },

  // Active projects only
  activeProjects: {
    userId: 'user-123',
    projects: [testProjects.kitchenReno, testProjects.bathroomRemodel],
    count: 2,
  },
}

// Utility functions for creating projects
export const createTestProject = (overrides: Partial<TestProject> = {}): TestProject => ({
  ...testProjects.kitchenReno,
  ...overrides,
})

export const createProjectWithUser = (userId: string, projectOverrides: Partial<TestProject> = {}) => ({
  ...testProjects.kitchenReno,
  userId,
  user: userId === 'user-123' ? testUsers.john : testUsers.jane,
  ...projectOverrides,
})

export const createProjectsForUser = (userId: string, count: number): TestProject[] => {
  return Array.from({ length: count }, (_, index) => 
    createProjectWithUser(userId, {
      id: `project-${userId}-${index}`,
      name: `Project ${index + 1}`,
    })
  )
}

// BDD test helpers
export const givenUserHasProjects = (userId: string, count: number = 3) => {
  if (count === 0) return projectScenarios.userWithoutProjects
  if (count === 1) return projectScenarios.userWithSingleProject
  return {
    userId,
    projects: createProjectsForUser(userId, count),
    count,
  }
}

export const givenUserHasNoProjects = (userId: string = 'user-456') => ({
  userId,
  projects: [],
  count: 0,
}) 