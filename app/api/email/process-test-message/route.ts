import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/logger'
import { gmailEmailFetcher } from '../../../lib/gmail-email-fetcher'
import { prisma } from '../../../lib/prisma'
import { teamMemberFilter } from '../../../lib/email/team-member-filter'
import fs from 'fs'
import path from 'path'

/**
 * Test Email Processing Endpoint - User-Centric Email Processing
 * 
 * ARCHITECTURAL PRINCIPLE: NAILIT USER-CENTRIC EMAIL INGESTION
 * 
 * This endpoint processes test emails using the user-centric approach:
 * 
 * 1. USER PERSPECTIVE: All emails are processed from the authenticated user's Gmail account
 * 2. COMPLETE CAPTURE: Processes both team member→user AND user→team member emails
 * 3. TEAM MEMBER FILTERING: Only processes emails involving known project team members
 * 4. OAUTH TRACKING: Uses user's OAuth session for Gmail API access
 * 
 * Email Processing Flow:
 * 1. Receive email messageId from user's Gmail
 * 2. Fetch email content from user's Gmail via API
 * 3. Apply team member filtering (team member emails TO/FROM user)
 * 4. Store email with user's ID and project association
 * 5. Track OAuth session usage for user
 * 
 * This endpoint simulates the production email ingestion pipeline for testing.
 * It uses test credentials with OAuth session tracking to mirror real-world usage.
 * 
 * EXTENSIBLE: Supports any user type (homeowner, contractor, architect, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, userId, projectId } = body

    if (!messageId || !userId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, userId, projectId' },
        { status: 400 }
      )
    }

    logger.info('Test email processing requested (user-centric)', {
      messageId,
      userId,
      projectId
    })

    // Verify project exists and belongs to authenticated user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Verify this is the correct user (not another user)
    if (project.userId !== userId) {
      logger.warn('Project access denied - user mismatch', {
        projectId,
        requestedUserId: userId,
        projectUserId: project.userId
      })
      return NextResponse.json(
        { error: 'Project access denied' },
        { status: 403 }
      )
    }

    // Get user's OAuth session for email API access
    const oauthSession = await prisma.oAuthSession.findUnique({
      where: {
        userId_provider_sessionContext: {
          userId: userId,
          provider: "google",
          sessionContext: "email_api"
        }
      }
    })

    let oauthSessionId: string | undefined
    let credentials: {
      refreshToken: string;
      accessToken?: string;
      expiryDate?: number;
    }

    if (oauthSession && oauthSession.isActive) {
      // Use user's OAuth session credentials
      if (!oauthSession.refreshToken) {
        throw new Error('OAuth session missing refresh token')
      }
      
      credentials = {
        refreshToken: oauthSession.refreshToken,
        accessToken: oauthSession.accessToken || undefined,
        expiryDate: oauthSession.expiresAt?.getTime()
      }
      oauthSessionId = oauthSession.id
      
      // Update last used timestamp for user session
      await prisma.oAuthSession.update({
        where: { id: oauthSession.id },
        data: { lastUsedAt: new Date() }
      })
      
      logger.info('Using user OAuth session credentials for test', {
        projectId,
        oauthSessionId,
        sessionContext: oauthSession.sessionContext
      })
    } else {
      // No user OAuth session - use test credentials
      credentials = await loadTestCredentials()
      
      logger.info('No user OAuth session found, using test credentials', {
        projectId
      })
    }

    // Fetch email content from user's Gmail API
    const emailContent = await gmailEmailFetcher.fetchEmailContent(messageId, credentials)
    
    if (!emailContent) {
      return NextResponse.json(
        { error: 'Failed to fetch email content from Gmail API' },
        { status: 500 }
      )
    }

    // Extract email metadata for user team member filtering
    const headers = emailContent.headers
    const sender = {
      email: headers['From'] || '',
      name: undefined // Could parse name from "Name <email@domain.com>" format
    }
    const recipients = [
      { email: headers['To'] || '', name: undefined }
    ]
    
    // Add CC recipients if present
    if (headers['Cc']) {
      recipients.push({ email: headers['Cc'], name: undefined })
    }

    // CRITICAL: Apply user team member filtering FIRST
    // This ensures we only process emails involving the user's project team
    const filterResult = await teamMemberFilter.shouldProcessEmail(sender, recipients, userId)

    if (!filterResult.shouldProcess) {
      logger.info('Email filtered out by team member filter', {
        messageId,
        senderEmail: sender.email,
        reason: filterResult.reason,
        userId,
        projectId
      })

      return NextResponse.json({
        success: false,
        filtered: true,
        reason: filterResult.reason,
        message: 'Email not processed - sender/recipients are not project team members'
      }, { status: 200 }) // 200 because filtering is expected behavior
    }

    // Determine sender type for processing
    const userEmail = project.user.email?.toLowerCase()
    const senderEmail = sender.email.toLowerCase()
    
    let senderType: 'user' | 'team_member' = 'team_member'
    if (userEmail && senderEmail === userEmail) {
      senderType = 'user'
    }

    // Create email message record
    const emailMessage = await prisma.emailMessage.create({
      data: {
        id: `msg_${messageId}_${Date.now()}`,
        messageId: messageId,
        subject: emailContent.subject || 'No Subject',
        body: emailContent.body || '',
        sender: sender.email,
        senderName: sender.name,
        recipients: recipients.map(r => r.email),
        receivedAt: emailContent.receivedAt || new Date(),
        
        // Associate with user and project
        userId: userId,
        projectId: projectId,
        
        // Provider information
        provider: 'gmail',
        providerId: messageId,
        providerData: {
          messageId: messageId,
          threadId: emailContent.threadId,
          headers: emailContent.headers,
          senderType: senderType,
          teamMemberFilter: {
            matched: filterResult.matchedTeamMembers,
            reason: filterResult.reason
          },
          oauthSessionId: oauthSessionId
        }
      }
    })

    logger.info('Email processed successfully (user-centric)', {
      emailId: emailMessage.id,
      messageId,
      subject: emailMessage.subject,
      sender: emailMessage.sender,
      recipients: emailMessage.recipients,
      userId,
      projectId,
      senderType,
      teamMembersMatched: filterResult.matchedTeamMembers.length,
      oauthSessionId
    })

    return NextResponse.json({
      success: true,
      message: 'Email processed successfully',
      emailId: emailMessage.id,
      messageId,
      subject: emailMessage.subject,
      sender: emailMessage.sender,
      recipients: emailMessage.recipients,
      senderType,
      teamMembersMatched: filterResult.matchedTeamMembers.length,
      processingDetails: {
        filterResult: {
          shouldProcess: filterResult.shouldProcess,
          matchedTeamMembers: filterResult.matchedTeamMembers.length,
          reason: filterResult.reason
        },
        oauthSession: {
          used: !!oauthSessionId,
          sessionId: oauthSessionId
        }
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    const stack = error instanceof Error ? error.stack : undefined

    logger.error('Error processing test email', {
      error: errorMessage,
      stack: stack
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Load test credentials from file system (fallback when no OAuth session)
async function loadTestCredentials(): Promise<{
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
}> {
  try {
    // Try to load from homeowner credentials (test environment)
    const credentialsPath = path.join(process.cwd(), 'scripts/email-testing/credentials/homeowner-credentials.json')
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error('Test credentials not found. Run OAuth setup first.')
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
    
    if (!credentials.refresh_token) {
      throw new Error('Test credentials missing refresh token')
    }

    logger.info('Loaded test credentials for email processing', {
      hasRefreshToken: !!credentials.refresh_token,
      hasAccessToken: !!credentials.access_token,
      expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null
    })

    return {
      refreshToken: credentials.refresh_token,
      accessToken: credentials.access_token,
      expiryDate: credentials.expiry_date
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    logger.error('Failed to load test credentials', { error: errorMessage })
    throw new Error(`Failed to load test credentials: ${errorMessage}`)
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'Missing messageId parameter' },
        { status: 400 }
      )
    }

    // Find the email message
    const emailMessage = await prisma.emailMessage.findUnique({
      where: {
        messageId: messageId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })

    if (!emailMessage) {
      return NextResponse.json(
        { error: 'Email message not found' },
        { status: 404 }
      )
    }

    // Return status in the format expected by the webhook tester
    return NextResponse.json({
      success: true,
      status: {
        messageId: emailMessage.messageId,
        subject: emailMessage.subject,
        sender: emailMessage.sender,
        sentAt: emailMessage.sentAt,
        ingestionStatus: emailMessage.ingestionStatus,
        analysisStatus: emailMessage.analysisStatus,
        assignmentStatus: emailMessage.assignmentStatus,
        hasS3Content: !!emailMessage.s3ContentPath,
        attachmentCount: emailMessage.s3AttachmentPaths?.length || 0,
        project: emailMessage.project,
        user: emailMessage.user,
        providerData: emailMessage.providerData,
        createdAt: emailMessage.createdAt,
        updatedAt: emailMessage.updatedAt
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error('Failed to get test email processing status', {
      error: errorMessage
    })
    
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    )
  }
} 