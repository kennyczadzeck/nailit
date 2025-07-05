import { describe, it, expect, beforeEach } from '@jest/globals'

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

describe('Team Member Filter - Unit Tests', () => {
  const testUserId = 'test-user-001'
  const testProjectId = 'test-project-001'

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock data
    const mockUser = {
      id: testUserId,
      email: 'homeowner@example.com',
      name: 'Test Homeowner',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockProject = {
      id: testProjectId,
      name: 'Test Project',
      userId: testUserId,
      status: 'ACTIVE',
      startDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      teamMembers: [{
        id: 'team-member-001',
        name: 'John Contractor',
        email: 'contractor@example.com',
        role: 'GENERAL_CONTRACTOR',
        projectId: testProjectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      emailSettings: {
        id: 'email-settings-001',
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
  })

  describe('shouldProcessEmail', () => {
    it('should approve emails from team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2) // Contractor + Project Owner
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('homeowner@example.com')
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
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2) // Contractor + Project Owner
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('homeowner@example.com')
    })

    it('should filter out emails when no team members exist', async () => {
      // Mock empty team members
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([{
        id: testProjectId,
        name: 'Test Project',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [],
        emailSettings: {
          id: 'email-settings-001',
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
        name: 'Test Project',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [{
          id: 'team-member-001',
          name: 'John Contractor',
          email: 'contractor@example.com',
          role: 'GENERAL_CONTRACTOR',
          projectId: testProjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        emailSettings: {
          id: 'email-settings-001',
          projectId: testProjectId,
          monitoringEnabled: false,
          gmailConnected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No team members')
    })

    it('should filter out emails for non-active projects', async () => {
      // Mock no active projects
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No active projects')
    })

    it('should handle errors gracefully', async () => {
      // Mock database error
      ;(prisma.project.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('error')
    })

    it('should approve emails to team members (recipient check)', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'homeowner@example.com', name: 'Test Homeowner' },
        [{ email: 'contractor@example.com', name: 'John Contractor' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2) // Project Owner + Contractor
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('homeowner@example.com')
    })

    it('should handle multiple recipients', async () => {
      // Mock multiple team members
      ;(prisma.project.findMany as jest.Mock).mockResolvedValue([{
        id: testProjectId,
        name: 'Test Project',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [
          {
            id: 'team-member-001',
            name: 'John Contractor',
            email: 'contractor@example.com',
            role: 'GENERAL_CONTRACTOR',
            projectId: testProjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'team-member-002',
            name: 'Jane Architect',
            email: 'architect@example.com',
            role: 'ARCHITECT_DESIGNER',
            projectId: testProjectId,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ],
        emailSettings: {
          id: 'email-settings-001',
          projectId: testProjectId,
          monitoringEnabled: true,
          gmailConnected: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      }])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'homeowner@example.com', name: 'Test Homeowner' },
        [
          { email: 'contractor@example.com', name: 'John Contractor' },
          { email: 'architect@example.com', name: 'Jane Architect' }
        ],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(3) // Project Owner + Contractor + Architect
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('architect@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('homeowner@example.com')
    })
  })

  describe('getProjectTeamMembers', () => {
    it('should return team members for a project', async () => {
      // Mock the project.findUnique call
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: testProjectId,
        name: 'Test Project',
        userId: testUserId,
        status: 'ACTIVE',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        teamMembers: [{
          id: 'team-member-001',
          name: 'John Contractor',
          email: 'contractor@example.com',
          role: 'GENERAL_CONTRACTOR',
          projectId: testProjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
        user: {
          email: 'homeowner@example.com'
        }
      })

      const teamMembers = await teamMemberFilter.getProjectTeamMembers(testProjectId)

      expect(teamMembers).toHaveLength(2) // Project owner + contractor
      expect(teamMembers).toContain('homeowner@example.com') // Project owner
      expect(teamMembers).toContain('contractor@example.com') // Team member
    })

    it('should return empty array for non-existent project', async () => {
      ;(prisma.project.findUnique as jest.Mock).mockResolvedValue(null)

      const teamMembers = await teamMemberFilter.getProjectTeamMembers('non-existent-project')

      expect(teamMembers).toHaveLength(0)
    })
  })

  describe('validateUser', () => {
    it('should validate existing user', async () => {
      const result = await teamMemberFilter.validateUser(testUserId)
      expect(result).toBe(true)
    })

    it('should reject non-existent user', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await teamMemberFilter.validateUser('non-existent-user')
      expect(result).toBe(false)
    })

    it('should reject user without email', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: testUserId,
        email: null,
        name: 'Test User',
      })

      const result = await teamMemberFilter.validateUser(testUserId)
      expect(result).toBe(false)
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