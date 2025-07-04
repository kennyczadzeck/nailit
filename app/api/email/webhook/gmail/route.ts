import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logger } from '../../../../lib/logger'
import { prisma } from '../../../../lib/prisma'
import { createGmailProcessor } from '../../../../lib/email/gmail-processor'

/**
 * @swagger
 * /api/email/webhook/gmail:
 *   post:
 *     summary: Gmail webhook notification
 *     description: Receive webhook notifications from Gmail when new emails arrive
 *     tags:
 *       - Email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   data:
 *                     type: string
 *                     description: Base64 encoded message data
 *                   messageId:
 *                     type: string
 *                   publishTime:
 *                     type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 *       500:
 *         description: Webhook processing error
 */
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('Failed to parse Gmail webhook body', { error: errorMessage, body })
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('Failed to decode Gmail notification data', { error: errorMessage })
      return NextResponse.json({ error: 'Invalid notification data' }, { status: 400 })
    }

    const { emailAddress, historyId } = notificationData
    if (!emailAddress || !historyId) {
      logger.warn('Gmail notification missing required fields', { notificationData })
      return NextResponse.json({ error: 'Missing notification fields' }, { status: 400 })
    }

    logger.info('Processing Gmail notification', { emailAddress, historyId })

    // Find user by connected email address
    const user = await prisma.user.findFirst({
      where: {
        projects: {
          some: {
            emailSettings: {
              gmailConnected: true,
              monitoringEnabled: true
            }
          }
        }
      },
      include: {
        projects: {
          where: {
            emailSettings: {
              gmailConnected: true,
              monitoringEnabled: true
            }
          },
          include: {
            emailSettings: true
          }
        }
      }
    })

    if (!user) {
      logger.warn('No user found with Gmail monitoring enabled', { emailAddress })
      return NextResponse.json({ error: 'No monitored user found' }, { status: 404 })
    }

    const activeProjects = user.projects.filter(p => p.emailSettings?.monitoringEnabled)
    if (activeProjects.length === 0) {
      logger.warn('No active projects found for user', { userId: user.id, emailAddress })
      return NextResponse.json({ error: 'No active projects' }, { status: 404 })
    }

    // Create Gmail processor for this user
    const gmailProcessor = await createGmailProcessor(user.id)
    if (!gmailProcessor) {
      logger.error('Failed to create Gmail processor', { userId: user.id })
      return NextResponse.json({ error: 'Gmail processor creation failed' }, { status: 500 })
    }

    // Process the webhook notification with team member filtering
    const processingResults = await gmailProcessor.processWebhookNotification(
      user.id,
      historyId,
      emailAddress
    )

    // Log results
    const successCount = processingResults.filter(r => r.success).length
    const filteredCount = processingResults.filter(r => r.filteredOut).length
    const errorCount = processingResults.filter(r => !r.success).length

    logger.info('Gmail webhook processing completed', {
      emailAddress,
      historyId,
      totalProcessed: processingResults.length,
      successful: successCount,
      filtered: filteredCount,
      errors: errorCount,
      projectsProcessed: activeProjects.length
    })

    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      results: {
        totalProcessed: processingResults.length,
        successful: successCount,
        filteredByTeamMember: filteredCount,
        errors: errorCount
      },
      projectsProcessed: activeProjects.length
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('Error processing Gmail webhook', {
      error: errorMessage,
      stack: stack
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/email/webhook/gmail:
 *   get:
 *     summary: Gmail webhook verification
 *     description: Handle Gmail webhook verification challenge
 *     tags:
 *       - Email
 *     parameters:
 *       - in: query
 *         name: hub.challenge
 *         schema:
 *           type: string
 *         description: Verification challenge from Gmail
 *       - in: query
 *         name: hub.mode
 *         schema:
 *           type: string
 *         description: Verification mode
 *     responses:
 *       200:
 *         description: Verification challenge response
 *       400:
 *         description: Invalid verification request
 */
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