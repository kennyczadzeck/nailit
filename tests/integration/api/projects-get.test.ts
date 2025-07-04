/**
 * @jest-environment node
 */

/**
 * Integration Tests for Projects API (GET)
 * Tests the actual API route with mocked dependencies
 */

import { GET } from '../../../app/api/projects/route'

// Use centralized fixtures
import {
  testUsers,
  testProjects,
  projectScenarios,
} from '../../fixtures'

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
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Projects API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Scenario: Authenticated user retrieves projects
   */
  describe('Scenario: Authenticated user retrieves projects', () => {
    test('Given I am authenticated as user and have projects, When I make GET request, Then I receive 200 with projects', async () => {
      // Given: I am authenticated and have projects (using centralized fixtures)
      const authenticatedUser = { user: testUsers.john }
      mockGetServerSession.mockResolvedValue(authenticatedUser as any)
      
      // Set up database with user's projects
      const userProjects = projectScenarios.userWithProjects.projects
      ;(mockPrisma.project.count as jest.Mock).mockResolvedValue(userProjects.length)
      ;(mockPrisma.project.findMany as jest.Mock).mockResolvedValue(userProjects)

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
      ;(mockPrisma.project.count as jest.Mock).mockResolvedValue(1)
      ;(mockPrisma.project.findMany as jest.Mock).mockResolvedValue([testProjects.kitchenReno])

      // When: projects are fetched
      await GET()

      // Then: correct database query should be made
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
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

  /**
   * Scenario: Unauthenticated user attempts to access projects
   */
  describe('Scenario: Unauthenticated user attempts to access projects', () => {
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

  /**
   * Scenario: Empty projects list
   */
  describe('Scenario: Empty projects list', () => {
    test('Given I am authenticated but have no projects, When I make GET request, Then I receive empty array', async () => {
      // Given: I am authenticated but have no projects (using centralized fixtures)
      mockGetServerSession.mockResolvedValue({ user: testUsers.jane } as any)
      ;(mockPrisma.project.count as jest.Mock).mockResolvedValue(0)
      ;(mockPrisma.project.findMany as jest.Mock).mockResolvedValue([])

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

  /**
   * Scenario: Database error handling
   */
  describe('Scenario: Database error handling', () => {
    test('Given I am authenticated, When database fails, Then I receive 500 with error message', async () => {
      // Given: I am authenticated but database encounters an error (using centralized fixtures)
      mockGetServerSession.mockResolvedValue({ user: testUsers.john } as any)
      ;(mockPrisma.project.count as jest.Mock).mockRejectedValue(new Error('Database connection failed'))

      // When: I make a GET request to "/api/projects"
      const response = await GET()
      const data = await response.json()

      // Then: I should receive a 500 status code with appropriate error message
      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to fetch projects' })
    })
  })
}) 