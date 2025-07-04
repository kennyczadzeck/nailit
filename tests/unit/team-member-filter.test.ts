import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Mock the logger to avoid AWS dependencies
jest.mock('../../app/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

// Create mock Prisma with proper structure
const mockPrisma = {
  project: {
    findMany: jest.fn()
  },
  teamMember: {
    findMany: jest.fn()
  }
}

// Mock the prisma module
jest.mock('../../app/lib/prisma', () => ({
  prisma: mockPrisma
}))

import { TeamMemberFilter } from '../../app/lib/email/team-member-filter'

describe('Team Member Filter - Unit Tests', () => {
  let teamMemberFilter: TeamMemberFilter

  beforeEach(() => {
    teamMemberFilter = new TeamMemberFilter()
    jest.clearAllMocks()
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

    it('should reject null/undefined', () => {
      const result1 = teamMemberFilter.validateTeamMemberEmail(null as any)
      const result2 = teamMemberFilter.validateTeamMemberEmail(undefined as any)
      
      expect(result1.isValid).toBe(false)
      expect(result2.isValid).toBe(false)
    })
  })

  describe('shouldProcessEmail', () => {
    it('should approve emails from team members', async () => {
      // Mock project with team members
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [
            {
              id: 'tm-1',
              name: 'John Contractor',
              email: 'contractor@example.com',
              role: 'GENERAL_CONTRACTOR'
            }
          ],
          emailSettings: {
            monitoringEnabled: true
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
      expect(result.reason).toContain('project team member')
    })

    it('should filter out emails from non-team members', async () => {
      // Mock project with team members
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [
            {
              id: 'tm-1',
              name: 'John Contractor',
              email: 'contractor@example.com',
              role: 'GENERAL_CONTRACTOR'
            }
          ],
          emailSettings: {
            monitoringEnabled: true
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'marketing@homedepot.com', name: 'Marketing Team' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.matchedTeamMembers).toHaveLength(0)
      expect(result.reason).toContain('not project team members')
    })

    it('should handle case-insensitive email matching', async () => {
      // Mock project with team members
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [
            {
              id: 'tm-1',
              name: 'John Contractor',
              email: 'contractor@example.com',
              role: 'GENERAL_CONTRACTOR'
            }
          ],
          emailSettings: {
            monitoringEnabled: true
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'CONTRACTOR@EXAMPLE.COM', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
    })

    it('should filter out emails when no team members exist', async () => {
      // Mock project with no team members
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [],
          emailSettings: {
            monitoringEnabled: true
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No team members defined')
    })

    it('should filter out emails when monitoring is disabled', async () => {
      // Mock project with monitoring disabled
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [
            {
              id: 'tm-1',
              name: 'John Contractor',
              email: 'contractor@example.com',
              role: 'GENERAL_CONTRACTOR'
            }
          ],
          emailSettings: {
            monitoringEnabled: false
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('monitoring enabled')
    })

    it('should filter out emails for non-active projects', async () => {
      // Mock no active projects (empty result)
      mockPrisma.project.findMany.mockResolvedValue([])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No active projects')
    })

    it('should handle errors gracefully', async () => {
      // Mock database error
      mockPrisma.project.findMany.mockRejectedValue(new Error('Database error'))

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('Team member filter error')
    })

    it('should approve emails to team members (recipient check)', async () => {
      // Mock project with team members
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [
            {
              id: 'tm-1',
              name: 'John Contractor',
              email: 'contractor@example.com',
              role: 'GENERAL_CONTRACTOR'
            }
          ],
          emailSettings: {
            monitoringEnabled: true
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'homeowner@example.com', name: 'Test Homeowner' },
        [{ email: 'contractor@example.com', name: 'John Contractor' }],
        'user-1'
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
    })

    it('should handle multiple recipients', async () => {
      // Mock project with team members
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'project-1',
          status: 'ACTIVE',
          teamMembers: [
            {
              id: 'tm-1',
              name: 'John Contractor',
              email: 'contractor@example.com',
              role: 'GENERAL_CONTRACTOR'
            },
            {
              id: 'tm-2',
              name: 'Jane Architect',
              email: 'architect@example.com',
              role: 'ARCHITECT_DESIGNER'
            }
          ],
          emailSettings: {
            monitoringEnabled: true
          }
        }
      ])

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'homeowner@example.com', name: 'Test Homeowner' },
        [
          { email: 'contractor@example.com', name: 'John Contractor' },
          { email: 'architect@example.com', name: 'Jane Architect' }
        ],
        'user-1'
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(2)
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('contractor@example.com')
      expect(result.matchedTeamMembers.map(m => m.email)).toContain('architect@example.com')
    })
  })

  describe('getProjectTeamMembers', () => {
    it('should return team members for a project', async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          id: 'tm-1',
          name: 'John Contractor',
          email: 'contractor@example.com',
          role: 'GENERAL_CONTRACTOR'
        }
      ])

      const teamMembers = await teamMemberFilter.getProjectTeamMembers('project-1')

      expect(teamMembers).toHaveLength(1)
      expect(teamMembers[0].email).toBe('contractor@example.com')
      expect(teamMembers[0].name).toBe('John Contractor')
      expect(teamMembers[0].role).toBe('GENERAL_CONTRACTOR')
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.teamMember.findMany.mockRejectedValue(new Error('Database error'))

      const teamMembers = await teamMemberFilter.getProjectTeamMembers('project-1')

      expect(teamMembers).toHaveLength(0)
    })
  })
}) 