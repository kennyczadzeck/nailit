import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/logger'
import { gmailEmailFetcher } from '../../../lib/gmail-email-fetcher'
import { prisma } from '../../../lib/prisma'
import { teamMemberFilter } from '../../../lib/email/team-member-filter'
import fs from 'fs'
import path from 'path'

// Test email processing endpoint (uses test credentials with OAuth session tracking)
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

    logger.info('Test email processing requested', {
      messageId,
      userId,
      projectId
    })

    // Verify project exists
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

    // Get OAuth session for email API
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
      // Use OAuth session credentials with null checks
      if (!oauthSession.refreshToken) {
        throw new Error('OAuth session missing refresh token')
      }
      
      credentials = {
        refreshToken: oauthSession.refreshToken,
        accessToken: oauthSession.accessToken || undefined,
        expiryDate: oauthSession.expiresAt?.getTime()
      }
      oauthSessionId = oauthSession.id
      
      // Update last used timestamp
      await prisma.oAuthSession.update({
        where: { id: oauthSession.id },
        data: { lastUsedAt: new Date() }
      })
      
      logger.info('Using OAuth session credentials for test', {
        projectId,
        oauthSessionId,
        sessionContext: oauthSession.sessionContext
      })
    } else {
      // No OAuth session - use test credentials
      credentials = await loadTestCredentials()
      
      logger.info('No OAuth session found, using test credentials', {
        projectId
      })
    }

    // Fetch email content from Gmail API
    const emailContent = await gmailEmailFetcher.fetchEmailContent(messageId, credentials)
    
    if (!emailContent) {
      return NextResponse.json(
        { error: 'Failed to fetch email content from Gmail API' },
        { status: 500 }
      )
    }

    // Extract email metadata for team member filtering
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

    // CRITICAL: Apply team member filtering FIRST
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
        message: 'Email not processed - sender/recipients are not project team members',
        filterDetails: {
          senderEmail: sender.email,
          recipientEmails: recipients.map(r => r.email),
          reason: filterResult.reason,
          availableTeamMembers: await teamMemberFilter.getProjectTeamMembers(projectId)
        }
      }, { status: 200 }) // 200 because filtering is expected behavior, not an error
    }

    logger.info('Email approved by team member filter', {
      messageId,
      senderEmail: sender.email,
      matchedTeamMembers: filterResult.matchedTeamMembers.length,
      assignedProjectId: filterResult.projectId,
      userId
    })

    // Continue with normal email processing since it passed team member filter
    const sentAt = headers['Date'] ? new Date(headers['Date']) : new Date()

    // For testing without S3, we'll store content directly in database
    // In production, this would be stored in S3 and only paths stored in DB
    
    // Check if email message already exists
    const existingMessage = await prisma.emailMessage.findUnique({
      where: { messageId }
    })

    let emailMessage
    
    if (existingMessage) {
      // Update existing record with OAuth session tracking and team member info
      emailMessage = await prisma.emailMessage.update({
        where: { messageId },
        data: {
          subject: emailContent.subject,
          sender: sender.email,
          recipients: recipients.map(r => r.email),
          ccRecipients: headers['Cc'] ? [headers['Cc']] : [],
          sentAt,
          bodyText: emailContent.bodyText,
          bodyHtml: emailContent.bodyHtml,
          ingestionStatus: 'completed',
          projectId: filterResult.projectId || projectId, // Use filter-determined project
          providerData: {
            ...existingMessage.providerData as Record<string, unknown>,
            processedAt: new Date().toISOString(),
            testMode: true,
            fetchedFromGmail: true,
            oauthSessionId: oauthSessionId,
            oauthSessionTracked: !!oauthSessionId,
            teamMemberFiltered: true,
            matchedTeamMembers: filterResult.matchedTeamMembers,
            filterReason: filterResult.reason
          }
        }
      })
    } else {
      // Create new record with OAuth session tracking and team member info
      emailMessage = await prisma.emailMessage.create({
        data: {
          messageId,
          provider: 'gmail',
          subject: emailContent.subject,
          sender: sender.email,
          recipients: recipients.map(r => r.email),
          ccRecipients: headers['Cc'] ? [headers['Cc']] : [],
          sentAt,
          bodyText: emailContent.bodyText,
          bodyHtml: emailContent.bodyHtml,
          ingestionStatus: 'completed',
          analysisStatus: 'pending',
          assignmentStatus: 'pending',
          userId,
          projectId: filterResult.projectId || projectId, // Use filter-determined project
          providerData: {
            processedAt: new Date().toISOString(),
            testMode: true,
            fetchedFromGmail: true,
            attachmentCount: emailContent.attachments.length,
            oauthSessionId: oauthSessionId,
            oauthSessionTracked: !!oauthSessionId,
            credentialSource: oauthSessionId ? 'oauth_session' : 'test_credentials',
            teamMemberFiltered: true,
            matchedTeamMembers: filterResult.matchedTeamMembers,
            filterReason: filterResult.reason
          }
        }
      })
    }

    logger.info('Test email processing completed with team member filtering', {
      messageId,
      userId,
      projectId: filterResult.projectId || projectId,
      emailMessageId: emailMessage.id,
      subject: emailContent.subject,
      attachmentCount: emailContent.attachments.length,
      oauthSessionId: oauthSessionId,
      oauthSessionTracked: !!oauthSessionId,
      teamMemberFiltered: true,
      matchedTeamMembers: filterResult.matchedTeamMembers.length
    })

    return NextResponse.json({
      success: true,
      message: 'Test email processed successfully with team member filtering',
      emailMessage: {
        id: emailMessage.id,
        messageId: emailMessage.messageId,
        subject: emailMessage.subject,
        sender: emailMessage.sender,
        recipients: emailMessage.recipients,
        sentAt: emailMessage.sentAt,
        ingestionStatus: emailMessage.ingestionStatus,
        projectId: emailMessage.projectId,
        bodyText: emailMessage.bodyText ? emailMessage.bodyText.substring(0, 200) + '...' : null,
        bodyHtml: emailMessage.bodyHtml ? emailMessage.bodyHtml.substring(0, 200) + '...' : null,
        providerData: emailMessage.providerData
      },
      gmailContent: {
        subject: emailContent.subject,
        sender: headers['From'],
        hasBodyText: !!emailContent.bodyText,
        hasBodyHtml: !!emailContent.bodyHtml,
        attachmentCount: emailContent.attachments.length,
        headers: Object.keys(headers)
      },
      teamMemberFilter: {
        approved: true,
        matchedTeamMembers: filterResult.matchedTeamMembers,
        reason: filterResult.reason,
        assignedProjectId: filterResult.projectId
      },
      oauthInfo: {
        sessionId: oauthSessionId,
        sessionTracked: !!oauthSessionId,
        credentialSource: oauthSessionId ? 'oauth_session' : 'test_credentials'
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('Test email processing failed', {
      error: errorMessage,
      stack: errorStack
    })
    
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}

/**
 * Load test credentials from file system
 */
async function loadTestCredentials(): Promise<{
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
}> {
  const credentialsPath = path.join(process.cwd(), 'scripts/email-testing/credentials/homeowner-credentials.json')
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('Test credentials not found. Run OAuth setup first.')
  }

  const testCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
  
  return {
    refreshToken: testCredentials.refresh_token,
    accessToken: testCredentials.access_token,
    expiryDate: testCredentials.expiry_date
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