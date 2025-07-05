import { prisma } from '../prisma'
import { logger } from '../logger'

interface EmailParticipant {
  email: string
  name?: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface TeamMemberFilterResult {
  shouldProcess: boolean
  matchedTeamMembers: TeamMember[]
  reason: string
  projectId?: string
}

/**
 * Team Member Email Filter - Production Email Processing
 * 
 * ARCHITECTURAL PRINCIPLE: NAILIT USER-CENTRIC EMAIL INGESTION
 * 
 * This filter is the core component in the email processing pipeline that ensures
 * only emails relevant to the Nailit user's projects are processed.
 * 
 * NAILIT USER-CENTRIC APPROACH:
 * 1. ALL emails are processed from the Nailit user's Gmail account perspective
 * 2. Filter includes emails FROM team members TO Nailit user
 * 3. Filter includes emails FROM Nailit user TO team members  
 * 4. Filter excludes emails that don't involve known project team members
 * 5. Team members are defined per project by the Nailit user
 * 
 * WHY NAILIT USER-CENTRIC?
 * - Privacy: Only access the authenticated user's own Gmail account
 * - Completeness: Nailit user receives ALL project communications
 * - Bidirectional: Captures team member→user AND user→team member emails
 * - Single Source: Nailit user's Gmail is the single source of truth
 * - Extensible: Supports any user type (homeowner, contractor, architect, etc.)
 * 
 * TEAM MEMBER FILTERING LOGIC:
 * - Process emails if sender OR recipient is a known team member
 * - Team members are defined per project by the Nailit user
 * - Nailit user email is implicitly included (they own the Gmail account)
 * - Team member emails are captured when they communicate with the Nailit user
 * 
 * EXTENSIBILITY: This pattern supports future user types (contractors, architects)
 * by maintaining the same filtering logic while allowing different team member roles.
 */
export class TeamMemberFilter {
  
  /**
   * Check if an email should be processed based on team member validation
   * 
   * This method processes emails found in the Nailit user's Gmail account.
   * It determines if the email involves known project team members and should
   * be included in the user's project communication timeline.
   * 
   * @param sender - Email sender information (could be team member OR Nailit user)
   * @param recipients - Email recipients list (could be team member OR Nailit user)
   * @param userId - Nailit user ID who owns the Gmail account being processed
   * @returns Filter result with processing decision
   */
  async shouldProcessEmail(
    sender: EmailParticipant,
    recipients: EmailParticipant[],
    userId: string
  ): Promise<TeamMemberFilterResult> {
    
    try {
      // VALIDATION: Ensure we're processing for a valid Nailit user
      if (!userId) {
        logger.error('Team member filter called without userId')
        return {
          shouldProcess: false,
          matchedTeamMembers: [],
          reason: 'No user ID provided'
        }
      }

      // Get all team members for user's active projects
      const userProjects = await prisma.project.findMany({
        where: {
          userId: userId, // Only authenticated user's projects
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
        logger.info('No active projects found for user', { userId })
        return {
          shouldProcess: false,
          matchedTeamMembers: [],
          reason: 'No active projects found for user'
        }
      }

      // Build list of all team member emails across user's active projects
      const teamMemberEmailMap = new Map<string, Array<{
        id: string
        name: string
        email: string
        role: string
        projectId: string
        monitoringEnabled: boolean
      }>>()

      // Get Nailit user's email for implicit inclusion
      const nailItUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      })

      const userEmail = nailItUser?.email?.toLowerCase().trim()
      
      for (const project of userProjects) {
        // Skip projects without email monitoring enabled
        if (!project.emailSettings?.monitoringEnabled) {
          continue
        }

        // Add Nailit user email implicitly to each project
        if (userEmail) {
          if (!teamMemberEmailMap.has(userEmail)) {
            teamMemberEmailMap.set(userEmail, [])
          }
          teamMemberEmailMap.get(userEmail)!.push({
            id: userId,
            name: 'Project Owner',
            email: userEmail,
            role: 'PROJECT_OWNER',
            projectId: project.id,
            monitoringEnabled: true
          })
        }

        // Add explicit team members for this project
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
            monitoringEnabled: project.emailSettings?.monitoringEnabled || false
          })
        }
      }

      if (teamMemberEmailMap.size === 0) {
        logger.warn('No team members found for user projects', { userId })
        return {
          shouldProcess: false,
          matchedTeamMembers: [],
          reason: 'No team members configured for user projects'
        }
      }

      // Check if sender is a team member (team member→user OR user→team member)
      const senderEmail = sender.email.toLowerCase().trim()
      const matchedMembers: TeamMember[] = []

      if (teamMemberEmailMap.has(senderEmail)) {
        const senderMatches = teamMemberEmailMap.get(senderEmail)!
        matchedMembers.push(...senderMatches.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role
        })))
      }

      // Also check if any recipients are team members (for sent emails from user)
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

        // VALIDATION: Ensure project belongs to the authenticated user
        if (projectId) {
          const projectOwner = userProjects.find(p => p.id === projectId)
          if (!projectOwner || projectOwner.userId !== userId) {
            logger.error('Project ownership mismatch in team member filter', {
              projectId,
              expectedUserId: userId,
              actualUserId: projectOwner?.userId
            })
            return {
              shouldProcess: false,
              matchedTeamMembers: [],
              reason: 'Project ownership validation failed'
            }
          }
        }

        logger.info('Email approved by team member filter', {
          senderEmail,
          recipientEmails: recipients.map(r => r.email),
          matchedTeamMembers: uniqueMatches.length,
          projectId,
          userId
        })

        return {
          shouldProcess: true,
          matchedTeamMembers: uniqueMatches,
          reason: `Email involves ${uniqueMatches.length} project team member(s)`,
          projectId
        }
      }

      // Email doesn't involve any project team members - filter out
      logger.info('Email filtered out - no team member involvement', {
        senderEmail,
        recipientEmails: recipients.map(r => r.email),
        availableTeamMembers: Array.from(teamMemberEmailMap.keys()),
        userId
      })

      return {
        shouldProcess: false,
        matchedTeamMembers: [],
        reason: `Email does not involve any team members for user projects. Available team members: ${Array.from(teamMemberEmailMap.keys()).join(', ')}`
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error in team member filter', {
        error: errorMessage,
        userId,
        senderEmail: sender.email,
        recipientEmails: recipients.map(r => r.email)
      })

      return {
        shouldProcess: false,
        matchedTeamMembers: [],
        reason: `Team member filter error: ${errorMessage}`
      }
    }
  }

  /**
   * Get team members for a specific project
   * 
   * This method returns team members configured for a user's project.
   * It includes the project owner implicitly plus any explicitly added team members.
   * 
   * @param projectId - Project ID
   * @returns List of team member emails
   */
  async getProjectTeamMembers(projectId: string): Promise<string[]> {
    try {
      // VALIDATION: Ensure project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          teamMembers: true,
          user: {
            select: { email: true }
          }
        }
      })

      if (!project) {
        logger.error('Project not found for team member lookup', { projectId })
        return []
      }

      const teamMemberEmails: string[] = []

      // Add project owner email implicitly
      if (project.user.email) {
        teamMemberEmails.push(project.user.email)
      }

      // Add explicit team members
      for (const member of project.teamMembers) {
        teamMemberEmails.push(member.email)
      }

      logger.debug('Retrieved team members for project', {
        projectId,
        teamMemberCount: teamMemberEmails.length,
        includesOwner: !!project.user.email
      })

      return teamMemberEmails

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error retrieving team members for project', {
        error: errorMessage,
        projectId
      })
      return []
    }
  }

  /**
   * Validate if a user is authorized for email processing
   * 
   * This method validates that the user exists and has proper permissions
   * for email processing operations.
   * 
   * @param userId - User ID to validate
   * @returns True if user is valid for email processing
   */
  async validateUser(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        return false
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true,
          email: true,
          emailVerified: true
        }
      })

      if (!user) {
        logger.warn('User not found for email processing validation', { userId })
        return false
      }

      if (!user.email) {
        logger.warn('User missing email for email processing', { userId })
        return false
      }

      // Note: emailVerified check can be added here if required
      // For now, we allow processing for any user with an email

      return true

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Error validating user for email processing', {
        error: errorMessage,
        userId
      })
      return false
    }
  }

  /**
   * Validate team member email format
   * 
   * @param email - Email to validate
   * @returns Validation result
   */
  validateTeamMemberEmail(email: string): { isValid: boolean; reason?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, reason: 'Email is required' }
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      return { isValid: false, reason: 'Email is required' }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, reason: 'Invalid email format' }
    }

    return { isValid: true }
  }
}

// Export singleton instance for use throughout the application
export const teamMemberFilter = new TeamMemberFilter() 