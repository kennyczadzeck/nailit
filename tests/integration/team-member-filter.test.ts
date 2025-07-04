import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '../../app/lib/prisma'
import { teamMemberFilter } from '../../app/lib/email/team-member-filter'

describe('Team Member Filter', () => {
  let testUserId: string
  let testProjectId: string
  let testTeamMemberId: string

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        id: 'test-user-tmf-001',
        email: 'test@example.com',
        name: 'Test User'
      }
    })
    testUserId = testUser.id

    // Create test project
    const testProject = await prisma.project.create({
      data: {
        id: 'test-project-tmf-001',
        name: 'Test Project for Team Member Filter',
        userId: testUserId,
        status: 'ACTIVE'
      }
    })
    testProjectId = testProject.id

    // Create email settings with monitoring enabled
    await prisma.emailSettings.create({
      data: {
        projectId: testProjectId,
        monitoringEnabled: true,
        gmailConnected: true
      }
    })

    // Create test team member
    const testTeamMember = await prisma.teamMember.create({
      data: {
        id: 'test-tm-001',
        name: 'John Contractor',
        email: 'contractor@example.com',
        role: 'GENERAL_CONTRACTOR',
        projectId: testProjectId
      }
    })
    testTeamMemberId = testTeamMember.id
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.teamMember.deleteMany({
      where: { projectId: testProjectId }
    })
    await prisma.emailSettings.deleteMany({
      where: { projectId: testProjectId }
    })
    await prisma.project.deleteMany({
      where: { id: testProjectId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
  })

  describe('shouldProcessEmail', () => {
    it('should approve emails from team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
      expect(result.matchedTeamMembers[0].role).toBe('GENERAL_CONTRACTOR')
      expect(result.reason).toContain('project team member')
      expect(result.projectId).toBe(testProjectId)
    })

    it('should approve emails to team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'homeowner@example.com', name: 'Test Homeowner' },
        [{ email: 'contractor@example.com', name: 'John Contractor' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
      expect(result.reason).toContain('project team member')
    })

    it('should filter out emails from non-team members', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'marketing@homedepot.com', name: 'Marketing Team' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.matchedTeamMembers).toHaveLength(0)
      expect(result.reason).toContain('not project team members')
    })

    it('should handle case-insensitive email matching', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'CONTRACTOR@EXAMPLE.COM', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
    })

    it('should filter out emails when no team members exist', async () => {
      // Remove all team members
      await prisma.teamMember.deleteMany({
        where: { projectId: testProjectId }
      })

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No team members defined')
    })

    it('should filter out emails when monitoring is disabled', async () => {
      // Disable monitoring
      await prisma.emailSettings.update({
        where: { projectId: testProjectId },
        data: { monitoringEnabled: false }
      })

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('monitoring enabled')
    })

    it('should filter out emails for non-active projects', async () => {
      // Set project to completed
      await prisma.project.update({
        where: { id: testProjectId },
        data: { status: 'COMPLETED' }
      })

      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        testUserId
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No active projects')
    })

    it('should handle multiple team members', async () => {
      // Add another team member
      await prisma.teamMember.create({
        data: {
          id: 'test-tm-002',
          name: 'Jane Architect',
          email: 'architect@example.com',
          role: 'ARCHITECT_DESIGNER',
          projectId: testProjectId
        }
      })

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
        { email: 'homeowner@example.com', name: 'Test Homeowner' },
        [
          { email: 'someone@example.com', name: 'Someone' },
          { email: 'contractor@example.com', name: 'John Contractor' }
        ],
        testUserId
      )

      expect(result.shouldProcess).toBe(true)
      expect(result.matchedTeamMembers).toHaveLength(1)
      expect(result.matchedTeamMembers[0].email).toBe('contractor@example.com')
    })

    it('should handle errors gracefully', async () => {
      const result = await teamMemberFilter.shouldProcessEmail(
        { email: 'contractor@example.com', name: 'John Contractor' },
        [{ email: 'homeowner@example.com', name: 'Test Homeowner' }],
        'non-existent-user-id'
      )

      expect(result.shouldProcess).toBe(false)
      expect(result.reason).toContain('No active projects')
    })
  })

  describe('getProjectTeamMembers', () => {
    it('should return team members for a project', async () => {
      const teamMembers = await teamMemberFilter.getProjectTeamMembers(testProjectId)

      expect(teamMembers).toHaveLength(1)
      expect(teamMembers[0].email).toBe('contractor@example.com')
      expect(teamMembers[0].name).toBe('John Contractor')
      expect(teamMembers[0].role).toBe('GENERAL_CONTRACTOR')
    })

    it('should return empty array for non-existent project', async () => {
      const teamMembers = await teamMemberFilter.getProjectTeamMembers('non-existent-project')

      expect(teamMembers).toHaveLength(0)
    })

    it('should sort team members by role and name', async () => {
      // Add more team members
      await prisma.teamMember.createMany({
        data: [
          {
            id: 'test-tm-architect',
            name: 'Alice Architect',
            email: 'alice@example.com',
            role: 'ARCHITECT_DESIGNER',
            projectId: testProjectId
          },
          {
            id: 'test-tm-pm',
            name: 'Bob Manager',
            email: 'bob@example.com',
            role: 'PROJECT_MANAGER',
            projectId: testProjectId
          }
        ]
      })

      const teamMembers = await teamMemberFilter.getProjectTeamMembers(testProjectId)

      expect(teamMembers).toHaveLength(3)
      // Should be sorted by role (ARCHITECT_DESIGNER, GENERAL_CONTRACTOR, PROJECT_MANAGER)
      expect(teamMembers[0].role).toBe('ARCHITECT_DESIGNER')
      expect(teamMembers[1].role).toBe('GENERAL_CONTRACTOR')
      expect(teamMembers[2].role).toBe('PROJECT_MANAGER')
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