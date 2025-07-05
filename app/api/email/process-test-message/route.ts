import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/logger'
import { gmailEmailFetcher } from '../../../lib/gmail-email-fetcher'
import { prisma } from '../../../lib/prisma'
import { teamMemberFilter } from '../../../lib/email/team-member-filter'
import fs from 'fs'
import path from 'path'

/**
 * Test Email Processing Endpoint - HOMEOWNER-ONLY EMAIL PROCESSING
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE: HOMEOWNER-ONLY EMAIL INGESTION
 * 
 * This endpoint processes test emails using the HOMEOWNER-ONLY approach:
 * 
 * 1. HOMEOWNER PERSPECTIVE: All emails are processed from the homeowner's Gmail account
 * 2. COMPLETE CAPTURE: Processes both contractor→homeowner AND homeowner→contractor emails
 * 3. TEAM MEMBER FILTERING: Only processes emails involving known project team members
 * 4. OAUTH TRACKING: Uses homeowner's OAuth session for Gmail API access
 * 
 * Email Processing Flow:
 * 1. Receive email messageId from homeowner's Gmail
 * 2. Fetch email content from homeowner's Gmail via API
 * 3. Apply team member filtering (contractor emails TO/FROM homeowner)
 * 4. Store email with homeowner's user ID and project association
 * 5. Track OAuth session usage for homeowner
 * 
 * This endpoint simulates the production email ingestion pipeline for testing.
 * It uses test credentials with OAuth session tracking to mirror real-world usage.
 * 
 * NEVER MODIFY THIS TO PROCESS CONTRACTOR GMAIL ACCOUNTS DIRECTLY
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

    logger.info('Test email processing requested (HOMEOWNER-ONLY)', {
      messageId,
      userId,
      projectId
    })

    // Verify project exists and belongs to HOMEOWNER user
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

    // Verify this is a HOMEOWNER user (not contractor)
    if (project.userId !== userId) {
      logger.warn('Project access denied - user mismatch (homeowner expected)', {
        projectId,
        requestedUserId: userId,
        projectUserId: project.userId
      })
      return NextResponse.json(
        { error: 'Project access denied' },
        { status: 403 }
      )
    }

    // Get HOMEOWNER OAuth session for email API access
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
      // Use HOMEOWNER OAuth session credentials
      if (!oauthSession.refreshToken) {
        throw new Error('HOMEOWNER OAuth session missing refresh token')
      }
      
      credentials = {
        refreshToken: oauthSession.refreshToken,
        accessToken: oauthSession.accessToken || undefined,
        expiryDate: oauthSession.expiresAt?.getTime()
      }
      oauthSessionId = oauthSession.id
      
      // Update last used timestamp for HOMEOWNER session
      await prisma.oAuthSession.update({
        where: { id: oauthSession.id },
        data: { lastUsedAt: new Date() }
      })
      
      logger.info('Using HOMEOWNER OAuth session credentials for test', {
        projectId,
        oauthSessionId,
        sessionContext: oauthSession.sessionContext
      })
    } else {
      // No HOMEOWNER OAuth session - use test credentials
      credentials = await loadTestCredentials()
      
      logger.info('No HOMEOWNER OAuth session found, using test credentials', {
        projectId
      })
    }

    // Fetch email content from HOMEOWNER'S Gmail API
    const emailContent = await gmailEmailFetcher.fetchEmailContent(messageId, credentials)
    
    if (!emailContent) {
      return NextResponse.json(
        { error: 'Failed to fetch email content from HOMEOWNER Gmail API' },
        { status: 500 }
      )
    }

    // Extract email metadata for HOMEOWNER team member filtering
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

    // CRITICAL: Apply HOMEOWNER team member filtering FIRST
    // This ensures we only process emails involving the homeowner's project team
    const filterResult = await teamMemberFilter.shouldProcessEmail(sender, recipients, userId)
    
    if (!filterResult.shouldProcess) {
      logger.info('Email filtered out by HOMEOWNER team member filter', {
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
        message: 'Email not processed - sender/recipients are not HOMEOWNER project team members',
        filterDetails: {
          senderEmail: sender.email,
          recipientEmails: recipients.map(r => r.email),
          reason: filterResult.reason,
          availableTeamMembers: await teamMemberFilter.getProjectTeamMembers(projectId)
        }
      }, { status: 200 }) // 200 because filtering is expected behavior for homeowner-only processing
    }

    logger.info('Email approved by HOMEOWNER team member filter', {
      messageId,
      senderEmail: sender.email,
      matchedTeamMembers: filterResult.matchedTeamMembers.length,
      assignedProjectId: filterResult.projectId,
      userId
    })

    // Continue with normal HOMEOWNER email processing since it passed team member filter
    const sentAt = headers['Date'] ? new Date(headers['Date']) : new Date()

    // For testing without S3, we'll store content directly in database
    // In production, this would be stored in S3 and only paths stored in DB
    
    // Check if email message already exists in HOMEOWNER'S records
    const existingMessage = await prisma.emailMessage.findUnique({
      where: { messageId }
    })

    let emailMessage
    
    if (existingMessage) {
      // Update existing HOMEOWNER record with OAuth session tracking and team member info
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
          projectId: filterResult.projectId || projectId, // Use filter-determined HOMEOWNER project
          providerData: {
            ...existingMessage.providerData as Record<string, unknown>,
            processedAt: new Date().toISOString(),
            testMode: true,
            fetchedFromGmail: true,
            oauthSessionId: oauthSessionId,
            oauthSessionTracked: !!oauthSessionId,
            teamMemberFiltered: true,
            matchedTeamMembers: filterResult.matchedTeamMembers,
            filterReason: filterResult.reason,
            sourceAccount: 'homeowner', // CRITICAL: Mark as homeowner-sourced
            ingestedFrom: 'homeowner_gmail' // CRITICAL: Source identification
          }
        }
      })
    } else {
      // Create new HOMEOWNER record with OAuth session tracking and team member info
      emailMessage = await prisma.emailMessage.create({
        data: {
          messageId,
          provider: 'gmail', // Always Gmail for homeowner
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
          userId, // CRITICAL: Always HOMEOWNER's user ID
          projectId: filterResult.projectId || projectId, // Use filter-determined HOMEOWNER project
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
            filterReason: filterResult.reason,
            sourceAccount: 'homeowner', // CRITICAL: Mark as homeowner-sourced
            ingestedFrom: 'homeowner_gmail' // CRITICAL: Source identification
          }
        }
      })
    }

    logger.info('Test email processing completed with HOMEOWNER team member filtering', {
      messageId,
      userId,
      projectId: filterResult.projectId || projectId,
      emailMessageId: emailMessage.id,
      subject: emailContent.subject,
      attachmentCount: emailContent.attachments.length,
      oauthSessionId: oauthSessionId,
      oauthSessionTracked: !!oauthSessionId,
      teamMemberFiltered: true,
      matchedTeamMembers: filterResult.matchedTeamMembers.length,
      sourceAccount: 'homeowner'
    })

    return NextResponse.json({
      success: true,
      message: 'Test email processed successfully with HOMEOWNER team member filtering',
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
      homeownerTeamMemberFilter: {
        approved: true,
        matchedTeamMembers: filterResult.matchedTeamMembers,
        reason: filterResult.reason,
        assignedProjectId: filterResult.projectId
      },
      homeownerOauthInfo: {
        sessionId: oauthSessionId,
        sessionTracked: !!oauthSessionId,
        credentialSource: oauthSessionId ? 'oauth_session' : 'test_credentials'
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    logger.error('Test email processing failed for HOMEOWNER', {
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
 * Load test credentials for HOMEOWNER Gmail access
 * 
 * This function loads test credentials specifically for homeowner Gmail testing.
 * In production, these would be replaced with proper OAuth flows.
 */
async function loadTestCredentials() {
  const credentialsPath = path.join(process.cwd(), 'scripts/email-testing/credentials/homeowner-credentials.json')
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error('HOMEOWNER test credentials not found. Run OAuth setup first.')
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
  
  if (!credentials.refresh_token) {
    throw new Error('HOMEOWNER test credentials missing refresh_token')
  }

  return {
    refreshToken: credentials.refresh_token,
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date
  }
}

// GET endpoint to check HOMEOWNER email processing status
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

    // Find the email message in HOMEOWNER records
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
        { error: 'Email message not found in HOMEOWNER records' },
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
        updatedAt: emailMessage.updatedAt,
        sourceAccount: 'homeowner' // CRITICAL: Identify as homeowner-sourced
      }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    logger.error('Failed to get test email processing status for HOMEOWNER', {
      error: errorMessage
    })
    
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    )
  }
} 