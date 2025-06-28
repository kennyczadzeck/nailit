import { google } from 'googleapis'
import { prisma } from '../prisma'
import { logger } from '../logger'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

interface EmailProcessingResult {
  success: boolean
  messageId?: string
  filteredOut?: boolean
  reason?: string
  error?: string
}

interface TeamMemberConfig {
  projectId: string
  teamMembers: string[]
}

export class GmailProcessor {
  private gmail: any
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
  private async processMessage(messageId: string, projects: any[]): Promise<EmailProcessingResult> {
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
        s3Stored: !!s3ContentPath 
      })

      return { success: true, messageId }

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
   * Find projects where the sender is a team member
   */
  private findRelevantProjects(senderEmail: string, projects: any[]): any[] {
    return projects.filter(project => {
      // TODO: Get team members from project settings
      // For now, use hardcoded team member list
      const teamMembers = [
        'contractor.test@gmail.com',
        'architect.test@gmail.com',
        'inspector.test@citycode.gov',
        'supplier.test@materials.com',
        'nailit.test.contractor@gmail.com', // For testing
        'nailit.test.homeowner@gmail.com'   // For testing
      ]
      
      return teamMembers.includes(senderEmail.toLowerCase())
    })
  }

  /**
   * Extract email content from Gmail payload
   */
  private extractEmailContent(payload: any): { bodyText: string | null, bodyHtml: string | null } {
    let bodyText: string | null = null
    let bodyHtml: string | null = null

    if (payload.body?.data) {
      // Single part message
      const mimeType = payload.mimeType || ''
      const content = Buffer.from(payload.body.data, 'base64').toString('utf-8')
      
      if (mimeType.includes('text/plain')) {
        bodyText = content
      } else if (mimeType.includes('text/html')) {
        bodyHtml = content
      }
    } else if (payload.parts) {
      // Multi-part message
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
        }
      }
    }

    return { bodyText, bodyHtml }
  }

  /**
   * Store large email content in S3
   */
  private async storeEmailContentInS3(messageId: string, emailData: any): Promise<string> {
    const s3Key = `emails/${messageId}/content.json`
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME || 'nailit-email-storage',
      Key: s3Key,
      Body: JSON.stringify(emailData),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256'
    }))

    return s3Key
  }

  /**
   * Helper methods for email parsing
   */
  private getHeader(headers: any[], name: string): string | undefined {
    const header = headers.find(h => h.name?.toLowerCase() === name.toLowerCase())
    return header?.value
  }

  private extractEmailAddress(fromHeader: string): string | null {
    const emailMatch = fromHeader.match(/<([^>]+)>/)
    if (emailMatch) {
      return emailMatch[1].toLowerCase()
    }
    
    // If no angle brackets, assume the whole string is an email
    const simpleEmailMatch = fromHeader.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    return simpleEmailMatch ? simpleEmailMatch[1].toLowerCase() : null
  }

  private extractSenderName(fromHeader: string): string | null {
    const nameMatch = fromHeader.match(/^([^<]+)</)
    return nameMatch ? nameMatch[1].trim().replace(/"/g, '') : null
  }
}

/**
 * Factory function to create Gmail processor with user's access token
 */
export async function createGmailProcessor(userId: string): Promise<GmailProcessor | null> {
  try {
    // Get user's Gmail access token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projects: {
          include: {
            emailSettings: true
          }
        }
      }
    })

    const emailSettings = user?.projects.find(p => p.emailSettings?.gmailConnected)?.emailSettings
    if (!emailSettings?.gmailAccessToken) {
      logger.warn('No Gmail access token found for user', { userId })
      return null
    }

    return new GmailProcessor(emailSettings.gmailAccessToken)
  } catch (error) {
    logger.error('Error creating Gmail processor', { userId, error })
    return null
  }
} 