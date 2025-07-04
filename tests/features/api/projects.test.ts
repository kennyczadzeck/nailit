/**
 * @jest-environment node
 */

/**
 * Feature: Projects API
 * All API-related tests for projects (integration, error handling, authentication)
 * Tests the actual API route with mocked dependencies
 */

import { GET, POST } from '../../../app/api/projects/route'

// Use centralized fixtures and helpers
import {
  testUsers,
  testProjects,
  projectScenarios,
} from '../../fixtures'
import { mockPrisma } from '../../helpers/mockPrisma'

// Mock dependencies
jest.mock('../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('../../../app/lib/prisma', () => ({
  prisma: {
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
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '../../../app/lib/prisma'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrismaProject = (prisma.project.count as jest.Mock)

describe('Feature: Projects API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * BDD Tests: API Scenarios
   */
  describe('BDD: API User Stories', () => {
    describe('User Story: Authenticated user retrieves projects', () => {
      test('Given I am authenticated as user and have projects, When I make GET request, Then I receive 200 with projects', async () => {
        // Given: I am authenticated and have projects (using centralized fixtures)
        const authenticatedUser = { user: testUsers.john }
        mockGetServerSession.mockResolvedValue(authenticatedUser as any)
        
        // Set up database with user's projects
        const userProjects = projectScenarios.userWithProjects.projects
        ;(prisma.project.count as jest.Mock).mockResolvedValue(userProjects.length)
        ;(prisma.project.findMany as jest.Mock).mockResolvedValue(userProjects)

        // When: I make a GET request to "/api/projects"
        const response = await GET()
        const data = await response.json()

        // Then: I should receive a 200 status code with my projects
        expect(response.status).toBe(200)
        expect(data).toHaveLength(3)
        
        // And: each project should include required fields (flexible date checking)
        data.forEach((project: any) => {
          expect(project).toHaveProperty('id', expect.any(String))
          expect(project).toHaveProperty('name', expect.any(String))
          expect(project).toHaveProperty('user', expect.any(Object))
          expect(project).toHaveProperty('emailSettings')
          expect(project).toHaveProperty('_count.flaggedItems', expect.any(Number))
          expect(project).toHaveProperty('_count.timelineEntries', expect.any(Number))
          expect(project).toHaveProperty('userId', testUsers.john.id)
        })

        // And: first project should be kitchen renovation
        expect(data[0]).toMatchObject({
          id: 'project-1',
          name: 'Kitchen Renovation',
          contractor: 'Mike Johnson Construction',
          architect: 'Sarah Chen Design',
          userId: testUsers.john.id,
        })
      })

      test('Given I am authenticated, When projects are fetched, Then correct database query is made', async () => {
        // Given: I am authenticated as a user (using centralized fixtures)
        mockGetServerSession.mockResolvedValue({ user: testUsers.john } as any)
        ;(prisma.project.count as jest.Mock).mockResolvedValue(1)
        ;(prisma.project.findMany as jest.Mock).mockResolvedValue([testProjects.kitchenReno])

        // When: projects are fetched
        await GET()

        // Then: correct database query should be made
        expect(prisma.project.findMany).toHaveBeenCalledWith({
          where: { userId: testUsers.john.id },
          include: expect.objectContaining({
            user: true,
            emailSettings: true,
            _count: {
              select: {
                flaggedItems: {
                  where: { status: 'PENDING' }
                },
                timelineEntries: true
              }
            }
          }),
          orderBy: [
            { status: 'asc' },
            { createdAt: 'desc' }
          ]
        })
      })
    })

    describe('User Story: Unauthenticated user attempts to access projects', () => {
      test('Given I am not authenticated, When I make GET request, Then I receive 401 with error message', async () => {
        // Given: I am not authenticated
        mockGetServerSession.mockResolvedValue(null)

        // When: I make a GET request to "/api/projects"
        const response = await GET()
        const data = await response.json()

        // Then: I should receive a 401 status code with error message
        expect(response.status).toBe(401)
        expect(data).toEqual({ error: 'Unauthorized' })
      })
    })

    describe('User Story: Empty projects list', () => {
      test('Given I am authenticated but have no projects, When I make GET request, Then I receive empty array', async () => {
        // Given: I am authenticated but have no projects (using centralized fixtures)
        mockGetServerSession.mockResolvedValue({ user: testUsers.jane } as any)
        ;(prisma.project.count as jest.Mock).mockResolvedValue(0)
        ;(prisma.project.findMany as jest.Mock).mockResolvedValue([])

        // When: I make a GET request to "/api/projects"
        const response = await GET()
        const data = await response.json()

        // Then: I should receive a 200 status code with empty array
        expect(response.status).toBe(200)
        expect(data).toEqual([])
        expect(Array.isArray(data)).toBe(true)
        expect(data).toHaveLength(0)
      })
    })
  })

  /**
   * Integration Tests: Error Handling
   */
  describe('Integration: Error Handling', () => {
    test('Given I am authenticated, When database fails, Then I receive 500 with error message', async () => {
      // Given: I am authenticated but database encounters an error (using centralized fixtures)
      mockGetServerSession.mockResolvedValue({ user: testUsers.john } as any)
      ;(prisma.project.count as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      // When: I make a GET request to "/api/projects"
      const response = await GET()
      const data = await response.json()

      // Then: I should receive a 500 status code with appropriate error message
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch projects' })
    })
  })

  /**
   * Unit Tests: API Validation
   */
  describe('Unit: API Request Validation', () => {
    test('Given valid session, When API processes request, Then session is validated correctly', async () => {
      // Given: Valid session
      const validSession = { user: testUsers.john }
      mockGetServerSession.mockResolvedValue(validSession as any)
      ;(prisma.project.count as jest.Mock).mockResolvedValue(0)
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([])

      // When: API processes request
      await GET()

      // Then: Session validation should be called
      expect(mockGetServerSession).toHaveBeenCalledTimes(1)
    })

    test('Given database query, When projects exist, Then correct count is returned', async () => {
      // Given: Database has projects
      mockGetServerSession.mockResolvedValue({ user: testUsers.john } as any)
      const projectCount = 5
      ;(prisma.project.count as jest.Mock).mockResolvedValue(projectCount)
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue(Array(projectCount).fill(testProjects.kitchenReno))

      // When: Projects are fetched
      const response = await GET()
      const data = await response.json()

      // Then: Correct count should be returned
      expect(data).toHaveLength(projectCount)
      expect(prisma.project.count).toHaveBeenCalledWith({
        where: { userId: testUsers.john.id }
      })
    })
  })
}) 