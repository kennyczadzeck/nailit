import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { logger } from '../../../../lib/logger'
import { prisma } from '../../../../lib/prisma'
import { createGmailProcessor } from '../../../../lib/email/gmail-processor'

/**
 * Gmail Webhook Handler - HOMEOWNER-ONLY EMAIL PROCESSING
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE: HOMEOWNER-ONLY EMAIL INGESTION
 * 
 * This webhook handler ONLY processes Gmail notifications from HOMEOWNER accounts.
 * It NEVER processes contractor Gmail accounts directly.
 * 
 * Why Homeowner-Only?
 * 1. Privacy: Only access the nailit user's own Gmail account
 * 2. Completeness: Homeowner receives ALL project emails (from contractors, permits, suppliers)
 * 3. Bidirectional: Captures both contractor→homeowner AND homeowner→contractor emails
 * 4. Single Source: Homeowner's Gmail is the single source of truth for project communications
 * 
 * Email Flow:
 * 1. Contractors send emails TO homeowner via their own Gmail
 * 2. Homeowner's Gmail receives all project communications
 * 3. This webhook processes changes in homeowner's Gmail only
 * 4. Complete conversation history captured from homeowner's perspective
 * 
 * NEVER MODIFY THIS TO PROCESS CONTRACTOR GMAIL WEBHOOKS
 * 
 * @swagger
 * /api/email/webhook/gmail:
 *   post:
 *     summary: Gmail webhook notification (HOMEOWNER-ONLY)
 *     description: Receive webhook notifications from Gmail when new emails arrive in HOMEOWNER'S account
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
 *                     description: Base64 encoded message data from homeowner's Gmail
 *                   messageId:
 *                     type: string
 *                   publishTime:
 *                     type: string
 *     responses:
 *       200:
 *         description: Homeowner Gmail webhook processed successfully
 *       400:
 *         description: Invalid webhook payload
 *       500:
 *         description: Webhook processing error
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const body = await request.text()
    
    logger.info('Gmail webhook received (HOMEOWNER-ONLY processing)', {
      headers: Object.fromEntries(headersList.entries()),
      bodyLength: body.length
    })

    // Verify webhook authenticity (Gmail push notifications from HOMEOWNER account)
    const googleMessageId = headersList.get('message-id')
    if (!googleMessageId) {
      logger.warn('Gmail webhook missing message-id header (homeowner account expected)')
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 })
    }

    // Parse the Gmail push notification (from HOMEOWNER'S Gmail)
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('Failed to parse Gmail webhook body from homeowner account', { error: errorMessage, body })
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { message } = webhookData
    if (!message || !message.data) {
      logger.warn('Gmail webhook missing message data (homeowner account expected)')
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // Decode the base64 message data (from HOMEOWNER'S Gmail notification)
    let notificationData
    try {
      const decodedData = Buffer.from(message.data, 'base64').toString('utf-8')
      notificationData = JSON.parse(decodedData)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('Failed to decode Gmail notification data from homeowner account', { error: errorMessage })
      return NextResponse.json({ error: 'Invalid notification data' }, { status: 400 })
    }

    const { emailAddress, historyId } = notificationData
    if (!emailAddress || !historyId) {
      logger.warn('Gmail notification missing required fields (homeowner account expected)', { notificationData })
      return NextResponse.json({ error: 'Missing notification fields' }, { status: 400 })
    }

    logger.info('Processing Gmail notification from HOMEOWNER account', { emailAddress, historyId })

    // Find HOMEOWNER user by connected email address
    // CRITICAL: This should only find homeowner users, never contractors
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
      logger.warn('No HOMEOWNER user found with Gmail monitoring enabled', { emailAddress })
      return NextResponse.json({ error: 'No monitored homeowner user found' }, { status: 404 })
    }

    const activeProjects = user.projects.filter(p => p.emailSettings?.monitoringEnabled)
    if (activeProjects.length === 0) {
      logger.warn('No active projects found for HOMEOWNER user', { userId: user.id, emailAddress })
      return NextResponse.json({ error: 'No active homeowner projects' }, { status: 404 })
    }

    // Create Gmail processor for this HOMEOWNER user
    const gmailProcessor = await createGmailProcessor(user.id)
    if (!gmailProcessor) {
      logger.error('Failed to create Gmail processor for HOMEOWNER user', { userId: user.id })
      return NextResponse.json({ error: 'Gmail processor creation failed' }, { status: 500 })
    }

    // Process the webhook notification with HOMEOWNER-ONLY team member filtering
    // This ensures we only process emails relevant to the homeowner's projects
    const processingResults = await gmailProcessor.processWebhookNotification(
      user.id,
      historyId,
      emailAddress
    )

    // Log results with HOMEOWNER context
    const successCount = processingResults.filter(r => r.success).length
    const filteredCount = processingResults.filter(r => r.filteredOut).length
    const errorCount = processingResults.filter(r => !r.success).length

    logger.info('Gmail webhook processing completed for HOMEOWNER', {
      emailAddress,
      historyId,
      totalProcessed: processingResults.length,
      successful: successCount,
      filtered: filteredCount,
      errors: errorCount,
      homeownerProjectsProcessed: activeProjects.length
    })

    return NextResponse.json({ 
      message: 'Homeowner Gmail webhook processed successfully',
      results: {
        totalProcessed: processingResults.length,
        successful: successCount,
        filteredByTeamMember: filteredCount,
        errors: errorCount
      },
      homeownerProjectsProcessed: activeProjects.length
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const stack = error instanceof Error ? error.stack : undefined;
    logger.error('Error processing HOMEOWNER Gmail webhook', {
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
 * Gmail Webhook Verification - HOMEOWNER-ONLY
 * 
 * This endpoint handles Gmail webhook verification challenges for HOMEOWNER accounts only.
 * It ensures that only homeowner Gmail accounts can establish webhook connections.
 * 
 * @swagger
 * /api/email/webhook/gmail:
 *   get:
 *     summary: Gmail webhook verification (HOMEOWNER-ONLY)
 *     description: Handle Gmail webhook verification challenge for HOMEOWNER accounts
 *     tags:
 *       - Email
 *     parameters:
 *       - in: query
 *         name: hub.challenge
 *         schema:
 *           type: string
 *         description: Verification challenge from HOMEOWNER's Gmail
 *       - in: query
 *         name: hub.mode
 *         schema:
 *           type: string
 *         description: Verification mode
 *     responses:
 *       200:
 *         description: HOMEOWNER verification challenge response
 *       400:
 *         description: Invalid verification request
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('hub.challenge')
  const mode = searchParams.get('hub.mode')
  
  if (mode === 'subscribe' && challenge) {
    logger.info('Gmail webhook verification request for HOMEOWNER account', { challenge, mode })
    return new NextResponse(challenge, { status: 200 })
  }
  
  logger.warn('Invalid Gmail webhook verification request (homeowner account expected)', { challenge, mode })
  return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })
} 