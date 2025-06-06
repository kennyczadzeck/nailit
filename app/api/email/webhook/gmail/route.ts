import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logger } from '../../../../lib/logger'
import { prisma } from '../../../../lib/prisma'

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

    // Find projects with active email monitoring
    const activeProjects = user.projects.filter(
      project => project.emailSettings?.gmailConnected && project.emailSettings?.monitoringEnabled
    )

    if (activeProjects.length === 0) {
      logger.info('No active email monitoring for user', { emailAddress, userId: user.id })
      return NextResponse.json({ message: 'No active monitoring' }, { status: 200 })
    }

    // Queue email processing for each active project
    // For now, we'll create a simple queue entry - later this will use SQS
    for (const project of activeProjects) {
      logger.info('Queueing email processing', {
        userId: user.id,
        projectId: project.id,
        emailAddress,
        historyId
      })

      // For Phase 1, we'll create a placeholder EmailMessage record
      // that will be processed by the ingestion pipeline
      await prisma.emailMessage.create({
        data: {
          messageId: `temp-${historyId}-${Date.now()}`, // Temporary until we fetch the actual email
          provider: 'gmail',
          sender: emailAddress, // Temporary - will be updated when we fetch actual email
          recipients: [emailAddress],
          sentAt: new Date(),
          ingestionStatus: 'pending',
          analysisStatus: 'pending',
          assignmentStatus: 'pending',
          userId: user.id,
          projectId: project.id,
          providerData: {
            historyId,
            originalEmailAddress: emailAddress,
            webhookMessageId: googleMessageId
          }
        }
      })
    }

    logger.info('Gmail webhook processed successfully', {
      emailAddress,
      historyId,
      projectsProcessed: activeProjects.length
    })

    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      projectsProcessed: activeProjects.length
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