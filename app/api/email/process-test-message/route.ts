import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/logger'
import { gmailEmailFetcher } from '../../../lib/gmail-email-fetcher'
import { prisma } from '../../../lib/prisma'
import { oauthSessionManager } from '../../../lib/oauth-session-manager'
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
    let credentials: any

    if (oauthSession && oauthSession.isActive) {
      // Use OAuth session credentials
      credentials = {
        refreshToken: oauthSession.refreshToken,
        accessToken: oauthSession.accessToken,
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

    // Extract email metadata
    const headers = emailContent.headers
    const sender = headers['From'] || ''
    const recipients = [headers['To'] || '']
    const ccRecipients = headers['Cc'] ? [headers['Cc']] : []
    const sentAt = headers['Date'] ? new Date(headers['Date']) : new Date()

    // For testing without S3, we'll store content directly in database
    // In production, this would be stored in S3 and only paths stored in DB
    
    // Check if email message already exists
    const existingMessage = await prisma.emailMessage.findUnique({
      where: { messageId }
    })

    let emailMessage
    
    if (existingMessage) {
      // Update existing record with OAuth session tracking
      emailMessage = await prisma.emailMessage.update({
        where: { messageId },
        data: {
          subject: emailContent.subject,
          sender,
          recipients,
          ccRecipients,
          sentAt,
          bodyText: emailContent.bodyText,
          bodyHtml: emailContent.bodyHtml,
          ingestionStatus: 'completed',
          providerData: {
            ...existingMessage.providerData as any,
            processedAt: new Date().toISOString(),
            testMode: true,
            fetchedFromGmail: true,
            oauthSessionId: oauthSessionId,
            oauthSessionTracked: !!oauthSessionId
          }
        }
      })
    } else {
      // Create new record with OAuth session tracking
      emailMessage = await prisma.emailMessage.create({
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
          ingestionStatus: 'completed',
          analysisStatus: 'pending',
          assignmentStatus: 'pending',
          userId,
          projectId,
          providerData: {
            processedAt: new Date().toISOString(),
            testMode: true,
            fetchedFromGmail: true,
            attachmentCount: emailContent.attachments.length,
            oauthSessionId: oauthSessionId,
            oauthSessionTracked: !!oauthSessionId,
            credentialSource: oauthSessionId ? 'oauth_session' : 'test_credentials'
          }
        }
      })
    }

    logger.info('Test email processing completed with OAuth session tracking', {
      messageId,
      userId,
      projectId,
      emailMessageId: emailMessage.id,
      subject: emailContent.subject,
      attachmentCount: emailContent.attachments.length,
      oauthSessionId: oauthSessionId,
      oauthSessionTracked: !!oauthSessionId
    })

    return NextResponse.json({
      success: true,
      message: 'Test email processed successfully with OAuth session tracking',
      emailMessage: {
        id: emailMessage.id,
        messageId: emailMessage.messageId,
        subject: emailMessage.subject,
        sender: emailMessage.sender,
        recipients: emailMessage.recipients,
        sentAt: emailMessage.sentAt,
        ingestionStatus: emailMessage.ingestionStatus,
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
      oauthInfo: {
        sessionId: oauthSessionId,
        sessionTracked: !!oauthSessionId,
        credentialSource: oauthSessionId ? 'oauth_session' : 'test_credentials'
      }
    })

  } catch (error: any) {
    logger.error('Test email processing failed', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

/**
 * Load test credentials from file system
 */
async function loadTestCredentials(): Promise<any> {
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

  } catch (error: any) {
    logger.error('Failed to get test email processing status', {
      error: error.message
    })
    
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
} 