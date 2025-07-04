import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logger } from '../../../../lib/logger'
import { prisma } from '../../../../lib/prisma'
import { gmailEmailFetcher } from '../../../../lib/gmail-email-fetcher'
import { s3EmailStorage } from '../../../../lib/s3-email-storage'
import { oauthSessionManager } from '../../../../lib/oauth-session-manager'
import { google } from 'googleapis'

// Gmail Push Notification webhook handler
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const body = await request.text()
    
    logger.info('Gmail webhook received', {
      headers: Object.fromEntries(headersList.entries()),
      bodyLength: body.length
    })

    // Verify webhook authenticity (Gmail push notifications)
    const googleMessageId = headersList.get('message-id')
    if (!googleMessageId) {
      logger.warn('Gmail webhook missing message-id header')
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 })
    }

    // Parse the Gmail push notification
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (error: any) {
      logger.error('Failed to parse Gmail webhook body', { error: error.message, body })
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { message } = webhookData
    if (!message || !message.data) {
      logger.warn('Gmail webhook missing message data')
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // Decode the base64 message data
    let notificationData
    try {
      const decodedData = Buffer.from(message.data, 'base64').toString('utf-8')
      notificationData = JSON.parse(decodedData)
    } catch (error: any) {
      logger.error('Failed to decode Gmail notification data', { error: error.message })
      return NextResponse.json({ error: 'Invalid notification data' }, { status: 400 })
    }

    const { emailAddress, historyId } = notificationData
    if (!emailAddress || !historyId) {
      logger.warn('Gmail notification missing required fields', { notificationData })
      return NextResponse.json({ error: 'Missing notification fields' }, { status: 400 })
    }

    logger.info('Processing Gmail notification', {
      emailAddress,
      historyId,
      messageId: googleMessageId
    })

    // Find the user associated with this email address
    const user = await prisma.user.findUnique({
      where: { email: emailAddress },
      include: {
        projects: {
          include: {
            emailSettings: true,
            teamMembers: true
          }
        }
      }
    })

    if (!user) {
      logger.warn('Gmail notification for unknown user', { emailAddress })
      return NextResponse.json({ message: 'User not found' }, { status: 200 })
    }

    // Find projects with active email monitoring and valid OAuth sessions
    const activeProjects = []
    
    for (const project of user.projects) {
      if (!project.emailSettings?.gmailConnected || !project.emailSettings?.monitoringEnabled) {
        continue
      }

      // Check OAuth session validity using OAuth session manager
      const needsReauth = await oauthSessionManager.checkReauthorizationRequired(project.id)
      if (needsReauth) {
        logger.warn('OAuth session requires reauthorization', {
          projectId: project.id,
          emailAddress
        })
        continue
      }

      activeProjects.push(project)
    }

    if (activeProjects.length === 0) {
      logger.info('No active email monitoring with valid OAuth sessions', { 
        emailAddress, 
        userId: user.id,
        totalProjects: user.projects.length
      })
      return NextResponse.json({ message: 'No active monitoring' }, { status: 200 })
    }

    // Process email for each active project
    const processedProjects: string[] = []
    
    for (const project of activeProjects) {
      try {
        const processedMessageIds = await processEmailsForProject(user, project, historyId)
        if (processedMessageIds.length > 0) {
          processedProjects.push(project.id)
          
          logger.info('Emails processed for project', {
            userId: user.id,
            projectId: project.id,
            historyId,
            messagesProcessed: processedMessageIds.length,
            messageIds: processedMessageIds
          })
        }

      } catch (error: any) {
        logger.error('Failed to process emails for project', {
          userId: user.id,
          projectId: project.id,
          historyId,
          error: error.message
        })
        // Continue processing other projects
      }
    }

    logger.info('Gmail webhook processed successfully', {
      emailAddress,
      historyId,
      projectsProcessed: processedProjects.length,
      processedProjectIds: processedProjects
    })

    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      projectsProcessed: processedProjects.length,
      processedProjectIds: processedProjects
    })

  } catch (error: any) {
    logger.error('Error processing Gmail webhook', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process emails for a specific project using Gmail History API
 */
async function processEmailsForProject(
  user: any, 
  project: any, 
  historyId: string
): Promise<string[]> {
  const startTime = Date.now()
  const processedMessageIds: string[] = []

  try {
    logger.info('Starting email processing for project with OAuth session tracking', {
      userId: user.id,
      projectId: project.id,
      historyId,
      oauthSessionId: project.emailSettings.oauthSessionId
    })

    // Get OAuth credentials using OAuth session manager
    const emailSettings = project.emailSettings
    if (!emailSettings?.gmailRefreshToken || !emailSettings?.oauthSessionId) {
      logger.warn('No valid OAuth session found for project', {
        projectId: project.id,
        hasRefreshToken: !!emailSettings?.gmailRefreshToken,
        hasSessionId: !!emailSettings?.oauthSessionId
      })
      return processedMessageIds
    }

    // Prepare OAuth2 client with session-tracked credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      refresh_token: emailSettings.gmailRefreshToken,
      access_token: emailSettings.gmailAccessToken,
      expiry_date: emailSettings.gmailTokenExpiry?.getTime()
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get the last processed history ID for this project
    const lastHistoryId = await getLastProcessedHistoryId(project.id)
    
    logger.info('Fetching Gmail history', {
      projectId: project.id,
      currentHistoryId: historyId,
      lastProcessedHistoryId: lastHistoryId,
      oauthSessionId: emailSettings.oauthSessionId
    })

    // Fetch history since last processed ID
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: lastHistoryId || historyId,
      historyTypes: ['messageAdded']
    })

    if (!historyResponse.data.history) {
      logger.info('No new messages in Gmail history', {
        projectId: project.id,
        historyId
      })
      
      // Update last processed history ID even if no new messages
      await updateLastProcessedHistoryId(project.id, historyId)
      return processedMessageIds
    }

    // Process each new message
    for (const historyItem of historyResponse.data.history) {
      if (!historyItem.messagesAdded) continue

      for (const messageAdded of historyItem.messagesAdded) {
        const messageId = messageAdded.message?.id
        if (!messageId) continue

        try {
          // Check if we've already processed this message
          const existingMessage = await prisma.emailMessage.findUnique({
            where: { messageId }
          })

          if (existingMessage) {
            logger.debug('Message already processed, skipping', {
              messageId,
              projectId: project.id
            })
            continue
          }

          // Process the new message
          const success = await processGmailMessage(
            messageId, 
            user.id, 
            project.id, 
            {
              refreshToken: emailSettings.gmailRefreshToken,
              accessToken: emailSettings.gmailAccessToken,
              expiryDate: emailSettings.gmailTokenExpiry?.getTime()
            },
            emailSettings.oauthSessionId
          )

          if (success) {
            processedMessageIds.push(messageId)
            
            logger.info('Gmail message processed successfully', {
              messageId,
              projectId: project.id,
              oauthSessionId: emailSettings.oauthSessionId
            })
          }

        } catch (messageError: any) {
          logger.error('Failed to process individual message', {
            messageId,
            projectId: project.id,
            error: messageError.message
          })
          // Continue processing other messages
        }
      }
    }

    // Update last processed history ID
    await updateLastProcessedHistoryId(project.id, historyId)

    // Check if tokens were refreshed and update OAuth session
    const newCredentials = oauth2Client.credentials
    if (newCredentials.access_token !== emailSettings.gmailAccessToken) {
      await oauthSessionManager.refreshOAuthTokens(project.id, newCredentials)
      
      logger.info('OAuth tokens refreshed during webhook processing', {
        projectId: project.id,
        oauthSessionId: emailSettings.oauthSessionId
      })
    }

    const duration = Date.now() - startTime
    logger.performance('Email processing for project completed', duration, {
      userId: user.id,
      projectId: project.id,
      messagesProcessed: processedMessageIds.length,
      oauthSessionId: emailSettings.oauthSessionId
    })

    return processedMessageIds

  } catch (error: any) {
    const duration = Date.now() - startTime
    logger.error('Email processing for project failed', {
      userId: user.id,
      projectId: project.id,
      historyId,
      error: error.message,
      duration,
      oauthSessionId: project.emailSettings?.oauthSessionId
    })
    throw error
  }
}

/**
 * Process a specific Gmail message with OAuth session tracking
 */
export async function processGmailMessage(
  messageId: string,
  userId: string,
  projectId: string,
  credentials: any,
  oauthSessionId?: string
): Promise<boolean> {
  try {
    logger.info('Processing specific Gmail message with OAuth session tracking', {
      messageId,
      userId,
      projectId,
      oauthSessionId
    })

    // Fetch email content from Gmail API
    const emailContent = await gmailEmailFetcher.fetchEmailContent(messageId, credentials)
    
    if (!emailContent) {
      logger.warn('Failed to fetch email content', { 
        messageId,
        oauthSessionId 
      })
      return false
    }

    // Store email content in S3
    const storageResult = await s3EmailStorage.storeEmail(userId, projectId, emailContent)
    
    if (!storageResult.success) {
      logger.error('Failed to store email in S3', {
        messageId,
        error: storageResult.error,
        oauthSessionId
      })
      return false
    }

    // Extract email metadata
    const headers = emailContent.headers
    const sender = headers['From'] || ''
    const recipients = [headers['To'] || '']
    const ccRecipients = headers['Cc'] ? [headers['Cc']] : []
    const sentAt = headers['Date'] ? new Date(headers['Date']) : new Date()

    // Create EmailMessage record with OAuth session tracking
    await prisma.emailMessage.create({
      data: {
        messageId,
        provider: 'gmail',
        subject: emailContent.subject,
        sender,
        recipients,
        ccRecipients,
        sentAt,
        bodyText: emailContent.bodyText,
        bodyHtml: emailContent.bodyHtml,
        s3ContentPath: storageResult.contentPath,
        s3AttachmentPaths: storageResult.attachmentPaths,
        ingestionStatus: 'completed',
        analysisStatus: 'pending',
        assignmentStatus: 'pending',
        userId,
        projectId,
        providerData: {
          processedAt: new Date().toISOString(),
          totalSize: storageResult.totalSize,
          oauthSessionId: oauthSessionId,
          webhookProcessed: true,
          gmailHistoryProcessed: true
        }
      }
    })

    logger.info('Gmail message processing completed with OAuth session tracking', {
      messageId,
      userId,
      projectId,
      oauthSessionId,
      s3ContentPath: storageResult.contentPath,
      attachmentCount: storageResult.attachmentPaths.length,
      totalSize: storageResult.totalSize
    })

    return true

  } catch (error: any) {
    logger.error('Failed to process Gmail message', {
      messageId,
      userId,
      projectId,
      oauthSessionId,
      error: error.message
    })
    return false
  }
}

/**
 * Get the last processed Gmail history ID for a project
 */
async function getLastProcessedHistoryId(projectId: string): Promise<string | null> {
  try {
    const emailSettings = await prisma.emailSettings.findUnique({
      where: { projectId }
    })

    const complianceData = emailSettings?.oauthComplianceData as any
    return complianceData?.lastProcessedHistoryId || null

  } catch (error: any) {
    logger.error('Failed to get last processed history ID', {
      projectId,
      error: error.message
    })
    return null
  }
}

/**
 * Update the last processed Gmail history ID for a project
 */
async function updateLastProcessedHistoryId(projectId: string, historyId: string): Promise<void> {
  try {
    const existingSettings = await prisma.emailSettings.findUnique({
      where: { projectId }
    })

    const existingComplianceData = existingSettings?.oauthComplianceData as any || {}

    await prisma.emailSettings.update({
      where: { projectId },
      data: {
        oauthComplianceData: {
          ...existingComplianceData,
          lastProcessedHistoryId: historyId,
          lastHistoryUpdate: new Date().toISOString()
        }
      }
    })

    logger.debug('Updated last processed history ID', {
      projectId,
      historyId
    })

  } catch (error: any) {
    logger.error('Failed to update last processed history ID', {
      projectId,
      historyId,
      error: error.message
    })
  }
}

// Handle webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('hub.challenge')
  const mode = searchParams.get('hub.mode')
  
  if (mode === 'subscribe' && challenge) {
    logger.info('Gmail webhook verification request', { challenge, mode })
    return new NextResponse(challenge, { status: 200 })
  }
  
  return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })
} 