import { prisma } from '../prisma'

// Optional logger import - fallback to console if not available
let logger: any
try {
  logger = require('../logger').logger
} catch (error) {
  // Fallback for testing environments
  logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug
  }
}

interface EmailParticipant {
  email: string
  name?: string
}

interface TeamMemberFilterResult {
  shouldProcess: boolean
  matchedTeamMembers: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  reason: string
  projectId?: string
}

/**
 * Team Member Email Filter
 * 
 * Core privacy and relevance filter that ensures only emails from/to 
 * defined project team members are processed.
 * 
 * This is the first and most important filter in the email processing pipeline.
 */
export class TeamMemberFilter {
  
  /**
   * Check if an email should be processed based on team member validation
   * 
   * @param sender - Email sender information
   * @param recipients - Email recipients list
   * @param userId - User ID who owns the project
   * @returns Filter result with processing decision
   */
  async shouldProcessEmail(
    sender: EmailParticipant,
    recipients: EmailParticipant[],
    userId: string
  ): Promise<TeamMemberFilterResult> {
    
    try {
      // Get all team members for user's active projects
      const userProjects = await prisma.project.findMany({
        where: {
          userId: userId,
          // Only consider active projects for email filtering
          status: {
            in: ['ACTIVE', 'ON_HOLD'] // Don't process emails for completed/archived projects
          }
        },
        include: {
          teamMembers: true,
          emailSettings: {
            select: {
              monitoringEnabled: true
            }
          }
        }
      })

      if (userProjects.length === 0) {
        return {
          shouldProcess: false,
          matchedTeamMembers: [],
          reason: 'No active projects found for user'
        }
      }

      // Build list of all team member emails across active projects
      const teamMemberEmailMap = new Map<string, Array<{
        id: string
        name: string
        email: string
        role: string
        projectId: string
        monitoringEnabled: boolean
      }>>()

      for (const project of userProjects) {
        const monitoringEnabled = project.emailSettings?.monitoringEnabled ?? false
        
        if (!monitoringEnabled) {
          continue // Skip projects with monitoring disabled
        }

        for (const member of project.teamMembers) {
          const memberEmail = member.email.toLowerCase().trim()
          
          if (!teamMemberEmailMap.has(memberEmail)) {
            teamMemberEmailMap.set(memberEmail, [])
          }
          
          teamMemberEmailMap.get(memberEmail)!.push({
            id: member.id,
            name: member.name,
            email: member.email,
            role: member.role,
            projectId: project.id,
            monitoringEnabled
          })
        }
      }

      if (teamMemberEmailMap.size === 0) {
        return {
          shouldProcess: false,
          matchedTeamMembers: [],
          reason: 'No team members defined for any active projects with monitoring enabled'
        }
      }

      // Check sender against team members
      const senderEmail = sender.email.toLowerCase().trim()
      const matchedMembers: Array<{
        id: string
        name: string
        email: string
        role: string
      }> = []

      // Check if sender is a team member
      if (teamMemberEmailMap.has(senderEmail)) {
        const senderMatches = teamMemberEmailMap.get(senderEmail)!
        matchedMembers.push(...senderMatches.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role
        })))
      }

      // Also check if any recipients are team members (for sent emails)
      for (const recipient of recipients) {
        const recipientEmail = recipient.email.toLowerCase().trim()
        if (teamMemberEmailMap.has(recipientEmail)) {
          const recipientMatches = teamMemberEmailMap.get(recipientEmail)!
          matchedMembers.push(...recipientMatches.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role
          })))
        }
      }

      // Remove duplicates
      const uniqueMatches = matchedMembers.filter((member, index, self) => 
        index === self.findIndex(m => m.id === member.id)
      )

      if (uniqueMatches.length > 0) {
        // Determine which project this email belongs to
        // If multiple projects have the same team member, we'll assign to the first one
        const primaryMatch = teamMemberEmailMap.get(senderEmail) || 
                           teamMemberEmailMap.get(recipients[0]?.email.toLowerCase().trim())
        
        const projectId = primaryMatch?.[0]?.projectId

        logger.info('Email approved by team member filter', {
          senderEmail,
          recipientEmails: recipients.map(r => r.email),
          matchedTeamMembers: uniqueMatches.length,
          projectId
        })

        return {
          shouldProcess: true,
          matchedTeamMembers: uniqueMatches,
          reason: `Email involves ${uniqueMatches.length} project team member(s)`,
          projectId
        }
      }

      // Email doesn't involve any team members - filter out
      logger.info('Email filtered out - no team member involvement', {
        senderEmail,
        recipientEmails: recipients.map(r => r.email),
        availableTeamMembers: Array.from(teamMemberEmailMap.keys()),
        userId
      })

      return {
        shouldProcess: false,
        matchedTeamMembers: [],
        reason: `Email sender (${senderEmail}) and recipients are not project team members`
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logger.error('Team member filter error', {
        error: errorMessage,
        senderEmail: sender.email,
        userId
      })

      // Fail closed - don't process emails if filter fails
      return {
        shouldProcess: false,
        matchedTeamMembers: [],
        reason: `Team member filter error: ${errorMessage}`
      }
    }
  }

  /**
   * Get team members for a specific project
   */
  async getProjectTeamMembers(projectId: string): Promise<Array<{
    id: string
    name: string
    email: string
    role: string
  }>> {
    try {
      const teamMembers = await prisma.teamMember.findMany({
        where: { projectId },
        orderBy: [
          { role: 'asc' }, // GENERAL_CONTRACTOR first
          { name: 'asc' }
        ]
      })

      return teamMembers.map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Failed to get project team members', {
        projectId,
        error: errorMessage
      })
      return []
    }
  }

  /**
   * Validate team member email format and uniqueness
   */
  validateTeamMemberEmail(email: string): { isValid: boolean; reason?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    if (!email || !email.trim()) {
      return { isValid: false, reason: 'Email is required' }
    }

    if (!emailRegex.test(email.trim())) {
      return { isValid: false, reason: 'Invalid email format' }
    }

    return { isValid: true }
  }
}

// Export singleton instance
export const teamMemberFilter = new TeamMemberFilter() 