/**
 * Test Fixtures Validation
 * Ensures our centralized fixtures work correctly
 */

import {
  testUsers,
  testProjects,
  projectScenarios,
  createTestUser,
  createTestProject,
  givenUserHasProjects,
  successResponses,
  errorResponses,
  createSuccessResponse,
  mockPrisma,
  setupPrismaMocks,
  givenDatabaseHas,
} from './index'

describe('Test Fixtures', () => {
  describe('User Fixtures', () => {
    test('should provide consistent test users', () => {
      expect(testUsers.john).toMatchObject({
        id: 'user-123',
        name: 'John Homeowner',
        email: 'john.homeowner@example.com',
      })

      expect(testUsers.jane).toMatchObject({
        id: 'user-456', 
        name: 'Jane New User',
        email: 'jane.newuser@example.com',
      })
    })

    test('should create custom users with overrides', () => {
      const customUser = createTestUser({ 
        name: 'Custom User',
        email: 'custom@example.com'
      })

      expect(customUser).toMatchObject({
        id: 'user-123', // Keeps base user ID
        name: 'Custom User', // Override applied
        email: 'custom@example.com', // Override applied
      })
    })
  })

  describe('Project Fixtures', () => {
    test('should provide realistic project data', () => {
      expect(testProjects.kitchenReno).toMatchObject({
        id: 'project-1',
        name: 'Kitchen Renovation',
        userId: 'user-123',
        contractor: 'Mike Johnson Construction',
        architect: 'Sarah Chen Design',
      })
    })

    test('should create projects with user scenarios', () => {
      const scenario = givenUserHasProjects('user-123', 2)
      
      expect(scenario.userId).toBe('user-123')
      expect(scenario.count).toBe(2)
      expect(scenario.projects).toHaveLength(2)
      expect(scenario.projects[0]).toMatchObject({
        userId: 'user-123',
        name: 'Project 1',
      })
    })

    test('should provide project scenarios', () => {
      expect(projectScenarios.userWithProjects.count).toBe(3)
      expect(projectScenarios.userWithoutProjects.count).toBe(0)
      expect(projectScenarios.userWithSingleProject.count).toBe(1)
    })
  })

  describe('API Response Fixtures', () => {
    test('should provide success responses', async () => {
      const response = successResponses.projectsList
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    test('should provide error responses', async () => {
      const response = errorResponses.unauthorized
      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    test('should create custom responses', async () => {
      const customResponse = createSuccessResponse({ message: 'Custom success' }, 201)
      expect(customResponse.status).toBe(201)
      
      const data = await customResponse.json()
      expect(data).toEqual({ message: 'Custom success' })
    })
  })

  describe('Mock Prisma Fixtures', () => {
    beforeEach(() => {
      setupPrismaMocks.reset()
    })

    test('should provide mock Prisma instance', () => {
      expect(mockPrisma.project.findMany).toBeDefined()
      expect(mockPrisma.user.findUnique).toBeDefined()
      expect(typeof mockPrisma.project.findMany).toBe('function')
    })

    test('should setup database scenarios', async () => {
      const projects = [testProjects.kitchenReno]
      givenDatabaseHas.projects(projects)

      // Test that the mocks are configured correctly
      const result = await mockPrisma.project.findMany()
      const count = await mockPrisma.project.count()
      
      expect(result).toEqual(projects)
      expect(count).toBe(1)
    })

    test('should reset mocks between tests', () => {
      // Setup some mock calls
      givenDatabaseHas.projects([testProjects.kitchenReno])
      
      // Reset should clear call history
      setupPrismaMocks.reset()
      
      expect(mockPrisma.project.findMany).not.toHaveBeenCalled()
      expect(mockPrisma.project.count).not.toHaveBeenCalled()
    })
  })
}) 