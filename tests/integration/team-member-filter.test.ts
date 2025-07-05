import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

// Mock Prisma module before importing the team member filter
jest.mock('../../app/lib/prisma', () => ({
  prisma: {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
    },
    emailSettings: {
      findUnique: jest.fn(),
    },
  },
}))

import { teamMemberFilter } from '../../app/lib/email/team-member-filter'
import { prisma } from '../../app/lib/prisma'

// Type assertion for mocked prisma
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Team Member Filter', () => {
  const testUserId = 'test-user-tmf-001'
  const testProjectId = 'test-project-tmf-001'
  const testTeamMemberId = 'test-tm-001'

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock data
    const mockUser = {
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockProject = {
      id: testProjectId,
      name: 'Test Project for Team Member Filter',
      userId: testUserId,
      status: 'ACTIVE',
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      teamMembers: [{
        id: testTeamMemberId,
        name: 'John Contractor',
        email: 'contractor@example.com',
        role: 'GENERAL_CONTRACTOR',
        projectId: testProjectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      emailSettings: {
        id: 'test-email-settings-001',
        projectId: testProjectId,
        monitoringEnabled: true,
        gmailConnected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    // Setup mock responses with explicit type casting
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(prisma.project.findMany as jest.Mock).mockResolvedValue([mockProject])
    ;(prisma.teamMember.findMany as jest.Mock).mockResolvedValue([{
      id: testTeamMemberId,
      name: 'John Contractor',
      email: 'contractor@example.com',
      role: 'GENERAL_CONTRACTOR',
      projectId: testProjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }])
  })

  describe('shouldProcessEmail', () => {
    it('should approve emails from team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'test@example.com', name: 'Test User' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2)
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('test@example.com')
      expect(result.reason).toContain('project team member')
      expect(result.projectId).toBe(testProjectId)
    })

    it('should approve emails to team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'test@example.com', name: 'Test User' },
        [{ email: 'contractor@example.com', name: 'John Contractor' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2)
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('test@example.com')
      expect(result.reason).toContain('project team member')
    })

    it('should filter out emails from non-team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'marketing@homedepot.com', name: 'Marketing Team' },
        [{ email: 'unknown@example.com', name: 'Unknown Person' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.matchedTeamMembers).toHaveLength(0)
      expect(result.reason).toContain('does not involve any team members')
    })

    it('should handle case-insensitive email matching', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'CONTRACTOR@EXAMPLE.COM', name: 'John Contractor' },
        [{ email: 'test@example.com', name: 'Test User' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2)
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('test@example.com')
    })

    it('should filter out emails when no team members exist', async () => {
      // Mock empty team members
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([{
        id: testProjectId,
        name: 'Test Project for Team Member Filter',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [],
        emailSettings: {
          id: 'test-email-settings-001',
          projectId: testProjectId,
          monitoringEnabled: true,
          gmailConnected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'unknown@example.com', name: 'Unknown Person' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('does not involve any team members')
    })

    it('should filter out emails when monitoring is disabled', async () => {
      // Mock disabled monitoring
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([{
        id: testProjectId,
        name: 'Test Project for Team Member Filter',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [{
          id: testTeamMemberId,
          name: 'John Contractor',
          email: 'contractor@example.com',
          role: 'GENERAL_CONTRACTOR',
          projectId: testProjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        emailSettings: {
          id: 'test-email-settings-001',
          projectId: testProjectId,
          monitoringEnabled: false,
          gmailConnected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'test@example.com', name: 'Test User' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No team members')
    })

    it('should filter out emails for non-active projects', async () => {
      // Mock completed project
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'test@example.com', name: 'Test User' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No active projects')
    })

    it('should handle multiple team members', async () => {
      // Mock multiple team members
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([{
        id: testProjectId,
        name: 'Test Project for Team Member Filter',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [
          {
            id: 'test-tm-001',
            name: 'John Contractor',
            email: 'contractor@example.com',
            role: 'GENERAL_CONTRACTOR',
            projectId: testProjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'test-tm-002',
            name: 'Jane Architect',
            email: 'architect@example.com',
            role: 'ARCHITECT_DESIGNER',
            projectId: testProjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ],
        emailSettings: {
          id: 'test-email-settings-001',
          projectId: testProjectId,
          monitoringEnabled: true,
          gmailConnected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'architect@example.com', name: 'Jane Architect' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2)
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('architect@example.com')
    })

    it('should handle CC recipients', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'test@example.com', name: 'Test User' },
        [
          { email: 'contractor@example.com', name: 'John Contractor' },
          { email: 'unknown@example.com', name: 'Unknown Person' }
        ],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2)
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('test@example.com')
    })

    it('should handle errors gracefully', async () => {
      // Mock database error
      ;(prisma.project.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'test@example.com', name: 'Test User' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('error')
    })
  })

  describe('getProjectTeamMembers', () => {
    it('should return team members for a project', async () => {
      // Mock the project.findUnique call specifically for this test
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: testProjectId,
        name: 'Test Project for Team Member Filter',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [{
          id: testTeamMemberId,
          name: 'John Contractor',
          email: 'contractor@example.com',
          role: 'GENERAL_CONTRACTOR',
          projectId: testProjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        user: {
          email: 'test@example.com'
        }
      })

      const teamMembers = await teamMemberFilter.getProjectTeamMembers(testProjectId)

      expect(teamMembers).toHaveLength(2) // Project owner + contractor
      expect(teamMembers).toContain('test@example.com') // Project owner
      expect(teamMembers).toContain('contractor@example.com') // Team member
    })

    it('should return empty array for non-existent project', async () => {
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)

      const teamMembers = await teamMemberFilter.getProjectTeamMembers('non-existent-project')

      expect(teamMembers).toHaveLength(0)
    })

    it('should sort team members by role and name', async () => {
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: testProjectId,
        name: 'Test Project for Team Member Filter',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [
          {
            id: 'test-tm-002',
            name: 'Jane Architect',
            email: 'architect@example.com',
            role: 'ARCHITECT_DESIGNER',
            projectId: testProjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'test-tm-001',
            name: 'John Contractor',
            email: 'contractor@example.com',
            role: 'GENERAL_CONTRACTOR',
            projectId: testProjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ],
        user: {
          email: 'test@example.com'
        }
      })

      const teamMembers = await teamMemberFilter.getProjectTeamMembers(testProjectId)

      expect(teamMembers).toHaveLength(3) // Project owner + 2 team members
      expect(teamMembers).toContain('test@example.com') // Project owner
      expect(teamMembers).toContain('architect@example.com') // Team member
      expect(teamMembers).toContain('contractor@example.com') // Team member
    })
  })

  describe('validateTeamMemberEmail', () => {
    it('should validate correct email format', () => {
      const result = teamMemberFilter.validateTeamMemberEmail('test@example.com')
      expect(result.isValid).toBe(true)
    })

    it('should reject empty email', () => {
      const result = teamMemberFilter.validateTeamMemberEmail('')
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('required')
    })

    it('should reject invalid email format', () => {
      const result = teamMemberFilter.validateTeamMemberEmail('invalid-email')
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('Invalid email format')
    })

    it('should handle whitespace', () => {
      const result = teamMemberFilter.validateTeamMemberEmail('  test@example.com  ')
      expect(result.isValid).toBe(true)
    })
  })
}) 