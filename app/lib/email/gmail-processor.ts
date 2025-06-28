import { google, gmail_v1 } from 'googleapis'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { prisma } from '@/app/lib/prisma'
import { logger } from '@/app/lib/logger'

interface EmailProcessingResult {
  success: boolean
  messageId?: string
  filteredOut?: boolean
  reason?: string
  error?: string
}

export class GmailProcessor {
  private gmail: gmail_v1.Gmail
  private s3Client: S3Client

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: accessToken })
    
    this.gmail = google.gmail({ version: 'v1', auth })
    this.s3Client = new S3Client({ 
      region: process.env.AWS_REGION || 'us-east-1'
    })
  }

  /**
   * Process a Gmail webhook notification by fetching the actual email
   * and applying team member filtering
   */
  async processWebhookNotification(
    userId: string,
    historyId: string,
    userEmail: string
  ): Promise<EmailProcessingResult[]> {
    try {
      logger.info('Processing Gmail webhook notification', { userId, historyId, userEmail })

      // Get the user's projects with team member configurations
      const user = await prisma.user.findUnique({
        where: { id: userId },
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

      if (!user || user.projects.length === 0) {
        return [{ success: false, error: 'No active projects found' }]
      }

      // Fetch recent messages from Gmail using history
      const historyResponse = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId: historyId,
        historyTypes: ['messageAdded']
      })

      const results: EmailProcessingResult[] = []

      if (!historyResponse.data.history) {
        logger.info('No new messages in history', { historyId })
        return [{ success: true, reason: 'No new messages' }]
      }

      // Process each new message
      for (const historyRecord of historyResponse.data.history) {
        if (historyRecord.messagesAdded) {
          for (const messageAdded of historyRecord.messagesAdded) {
            const messageId = messageAdded.message?.id
            if (!messageId) continue

            try {
              const result = await this.processMessage(messageId, user.projects)
              results.push(result)
            } catch (error) {
              logger.error('Error processing message', { messageId, error })
              results.push({ 
                success: false, 
                messageId, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              })
            }
          }
        }
      }

      return results

    } catch (error) {
      logger.error('Error processing Gmail webhook', { error, userId, historyId })
      return [{ success: false, error: error instanceof Error ? error.message : 'Unknown error' }]
    }
  }

  /**
   * Process a single email message with team member filtering
   */
  private async processMessage(messageId: string, projects: Array<{
    id: string
    name: string
    userId: string
    emailSettings: {
      teamMembers: string[]
    } | null
  }>): Promise<EmailProcessingResult> {
    try {
      // Fetch the full message from Gmail
      const messageResponse = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      const message = messageResponse.data
      const headers = message.payload?.headers || []

      // Extract email metadata
      const subject = this.getHeader(headers, 'Subject') || ''
      const sender = this.getHeader(headers, 'From') || ''
      const to = this.getHeader(headers, 'To') || ''
      const date = this.getHeader(headers, 'Date') || ''

      logger.info('Processing email message', { messageId, subject, sender })

      // Extract sender email address (handle "Name <email@domain.com>" format)
      const senderEmail = this.extractEmailAddress(sender)
      if (!senderEmail) {
        return { success: false, messageId, error: 'Could not extract sender email' }
      }

      // Check if sender is a team member for any project
      const relevantProjects = this.findRelevantProjects(senderEmail, projects)
      
      if (relevantProjects.length === 0) {
        logger.info('Email filtered out - sender not in team member list', { 
          messageId, 
          sender: senderEmail,
          subject 
        })
        return { 
          success: true, 
          messageId, 
          filteredOut: true, 
          reason: `Sender ${senderEmail} not in project team member lists` 
        }
      }

      // Extract email content
      const { bodyText, bodyHtml } = this.extractEmailContent(message.payload)

      // Store email content in S3 if large
      let s3ContentPath: string | null = null
      const contentSize = (bodyText?.length || 0) + (bodyHtml?.length || 0)
      
      if (contentSize > 64000) { // 64KB threshold
        s3ContentPath = await this.storeEmailContentInS3(messageId, {
          headers: headers,
          bodyText,
          bodyHtml,
          payload: message.payload
        })
      }

      // Create email records for each relevant project
      const emailRecords = []
      for (const project of relevantProjects) {
        const emailRecord = await prisma.emailMessage.create({
          data: {
            messageId: messageId,
            provider: 'gmail',
            subject: subject,
            sender: senderEmail,
            senderName: this.extractSenderName(sender),
            recipients: [to],
            ccRecipients: this.getHeader(headers, 'Cc')?.split(',').map(s => s.trim()).filter(Boolean) || [],
            bccRecipients: [], // BCC not available in received emails
            sentAt: new Date(date),
            receivedAt: new Date(),
            bodyText: contentSize <= 64000 ? bodyText : null,
            bodyHtml: contentSize <= 64000 ? bodyHtml : null,
            s3ContentPath,
            ingestionStatus: 'completed',
            analysisStatus: 'pending', // Will be processed by AI analysis pipeline
            assignmentStatus: 'pending',
            userId: project.userId || '',
            projectId: project.id,
            providerData: {
              gmailMessageId: messageId,
              gmailThreadId: message.threadId,
              teamMemberFiltered: true,
              filterReason: `Sender ${senderEmail} is team member for project ${project.name}`
            }
          }
        })
        emailRecords.push(emailRecord)
      }

      logger.info('Email processed and stored', { 
        messageId, 
        projectCount: relevantProjects.length,
        emailRecordIds: emailRecords.map(r => r.id)
      })

      return { 
        success: true, 
        messageId,
        reason: `Processed for ${relevantProjects.length} project(s)` 
      }

    } catch (error) {
      logger.error('Error processing message', { messageId, error })
      return { 
        success: false, 
        messageId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Find projects where the sender email is in the team member list
   */
  private findRelevantProjects(senderEmail: string, projects: Array<{
    id: string
    name: string
    userId: string
    emailSettings: {
      teamMembers: string[]
    } | null
  }>): Array<{
    id: string
    name: string
    userId: string
    emailSettings: {
      teamMembers: string[]
    } | null
  }> {
    return projects.filter(project => {
      if (!project.emailSettings?.teamMembers) {
        return false
      }
      
      // Check if sender email is in the team member list (case insensitive)
      return project.emailSettings.teamMembers.some(teamEmail => 
        teamEmail.toLowerCase() === senderEmail.toLowerCase()
      )
    })
  }

  /**
   * Extract text and HTML content from Gmail message payload
   */
  private extractEmailContent(payload: gmail_v1.Schema$MessagePart | undefined): { bodyText: string | null, bodyHtml: string | null } {
    if (!payload) {
      return { bodyText: null, bodyHtml: null }
    }

    let bodyText: string | null = null
    let bodyHtml: string | null = null

    // Handle multipart messages
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }
    } else if (payload.body?.data) {
      // Handle single part messages
      const content = Buffer.from(payload.body.data, 'base64').toString('utf-8')
      if (payload.mimeType === 'text/plain') {
        bodyText = content
      } else if (payload.mimeType === 'text/html') {
        bodyHtml = content
      }
    }

    return { bodyText, bodyHtml }
  }

  /**
   * Store large email content in S3 and return the path
   */
  private async storeEmailContentInS3(messageId: string, emailData: {
    headers: gmail_v1.Schema$MessagePartHeader[]
    bodyText: string | null
    bodyHtml: string | null
    payload: gmail_v1.Schema$MessagePart | undefined
  }): Promise<string> {
    const key = `emails/${messageId}.json`
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_EMAIL_BUCKET || 'nailit-emails',
      Key: key,
      Body: JSON.stringify(emailData),
      ContentType: 'application/json'
    })

    await this.s3Client.send(command)
    return key
  }

  /**
   * Get header value by name
   */
  private getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | undefined {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase())
    return header?.value
  }

  /**
   * Extract email address from "Name <email@domain.com>" format
   */
  private extractEmailAddress(fromHeader: string): string | null {
    const emailMatch = fromHeader.match(/<([^>]+)>/)
    if (emailMatch) {
      return emailMatch[1]
    }
    
    // If no angle brackets, assume the whole string is the email
    if (fromHeader.includes('@')) {
      return fromHeader.trim()
    }
    
    return null
  }

  /**
   * Extract sender name from "Name <email@domain.com>" format
   */
  private extractSenderName(fromHeader: string): string | null {
    const nameMatch = fromHeader.match(/^([^<]+)</)
    if (nameMatch) {
      return nameMatch[1].trim()
    }
    
    // If no angle brackets, return null (use email as fallback)
    return null
  }
}

/**
 * Create a Gmail processor instance for a user
 */
export async function createGmailProcessor(userId: string): Promise<GmailProcessor | null> {
  try {
    // Get user's Gmail access token from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailSettings: {
          select: {
            gmailAccessToken: true,
            gmailConnected: true
          }
        }
      }
    })

    if (!user?.emailSettings?.gmailAccessToken || !user.emailSettings.gmailConnected) {
      logger.warn('No Gmail access token found for user', { userId })
      return null
    }

    return new GmailProcessor(user.emailSettings.gmailAccessToken)
    
  } catch (error) {
    logger.error('Error creating Gmail processor', { userId, error })
    return null
  }
} 