import { google } from 'googleapis';
import { logger } from './logger';
import { EmailContent, EmailAttachment } from './s3-email-storage';

export interface GmailCredentials {
  refreshToken: string;
  accessToken?: string;
  expiryDate?: number;
}

export interface GmailMessagePayload {
  partId?: string;
  mimeType: string;
  filename?: string;
  headers?: Array<{
    name: string;
    value: string;
  }>;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePayload[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: GmailMessagePayload;
  raw?: string;
}

class GmailEmailFetcher {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_TEST_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      process.env.GMAIL_TEST_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3001/auth/gmail/callback'
    );
  }

  /**
   * Fetch email content from Gmail API using user's stored credentials
   */
  async fetchEmailContent(
    messageId: string, 
    credentials: GmailCredentials
  ): Promise<EmailContent | null> {
    const startTime = Date.now();

    try {
      logger.info('Fetching email content from Gmail API', {
        messageId,
        hasRefreshToken: !!credentials.refreshToken
      });

      // Set up OAuth credentials
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
        access_token: credentials.accessToken,
        expiry_date: credentials.expiryDate
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Fetch the email message
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = messageResponse.data;
      
      if (!message.payload) {
        logger.warn('No payload in Gmail message', { messageId });
        return null;
      }

      // Extract email content
      const emailContent = await this.parseEmailMessage(message as GmailMessage);
      
      const duration = Date.now() - startTime;
      
      logger.performance('Gmail email fetch completed', duration, {
        messageId,
        subject: emailContent.subject,
        hasBodyText: !!emailContent.bodyText,
        hasBodyHtml: !!emailContent.bodyHtml,
        attachmentCount: emailContent.attachments.length
      });

      return emailContent;

    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to fetch email from Gmail API', {
        messageId,
        error: errorMessage,
        duration
      });

      // Check if it's an authentication error
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('unauthorized')) {
        logger.warn('Gmail credentials may be expired', { messageId });
      }

      return null;
    }
  }

  /**
   * Fetch multiple emails in batch (for historical ingestion)
   */
  async fetchEmailsBatch(
    messageIds: string[], 
    credentials: GmailCredentials,
    batchSize: number = 10
  ): Promise<(EmailContent | null)[]> {
    logger.info('Fetching email batch from Gmail API', {
      messageCount: messageIds.length,
      batchSize
    });

    const results: (EmailContent | null)[] = [];
    
    // Process in smaller batches to respect rate limits
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      
      logger.debug('Processing email batch', {
        batchIndex: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        totalBatches: Math.ceil(messageIds.length / batchSize)
      });

      // Fetch emails in parallel within the batch
      const batchPromises = batch.map(messageId => 
        this.fetchEmailContent(messageId, credentials)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limiting: wait between batches
      if (i + batchSize < messageIds.length) {
        logger.debug('Rate limiting: waiting between batches');
        await this.delay(1000); // 1 second delay
      }
    }

    const successCount = results.filter(r => r !== null).length;
    
    logger.info('Email batch fetch completed', {
      totalRequested: messageIds.length,
      successfullyFetched: successCount,
      failed: messageIds.length - successCount
    });

    return results;
  }

  /**
   * Parse Gmail message into EmailContent format
   */
  private async parseEmailMessage(message: GmailMessage): Promise<EmailContent> {
    const headers = this.extractHeaders(message.payload);
    const { bodyText, bodyHtml } = this.extractBodies(message.payload);
    const attachments = await this.extractAttachments(message.payload);

    return {
      messageId: message.id,
      subject: headers['Subject'] || '',
      bodyText,
      bodyHtml,
      attachments,
      headers,
      rawEmail: message.raw // Include raw email if available
    };
  }

  /**
   * Extract headers from Gmail message payload
   */
  private extractHeaders(payload: GmailMessagePayload): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (payload.headers) {
      for (const header of payload.headers) {
        headers[header.name] = header.value;
      }
    }

    return headers;
  }

  /**
   * Extract text and HTML bodies from Gmail message payload
   */
  private extractBodies(payload: GmailMessagePayload): { bodyText?: string; bodyHtml?: string } {
    let bodyText: string | undefined;
    let bodyHtml: string | undefined;

    const extractFromPart = (part: GmailMessagePayload) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }

      // Recursively check parts
      if (part.parts) {
        for (const subPart of part.parts) {
          extractFromPart(subPart);
        }
      }
    };

    // Check if payload has body directly
    if (payload.body?.data) {
      if (payload.mimeType === 'text/plain') {
        bodyText = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload.mimeType === 'text/html') {
        bodyHtml = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
    }

    // Check parts if no direct body
    if (payload.parts) {
      for (const part of payload.parts) {
        extractFromPart(part);
      }
    }

    return { bodyText, bodyHtml };
  }

  /**
   * Extract attachments from Gmail message payload
   */
  private async extractAttachments(payload: GmailMessagePayload): Promise<EmailAttachment[]> {
    const attachments: EmailAttachment[] = [];

    const extractFromPart = async (part: GmailMessagePayload) => {
      if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
        // Note: For Gmail attachments, we'd need to fetch the actual data separately
        // This is a placeholder structure that matches the EmailAttachment interface
        attachments.push({
          filename: part.filename,
          contentType: part.mimeType,
          size: part.body.size || 0,
          data: Buffer.alloc(0) // Placeholder - actual data would be fetched separately
        });
      }

      // Recursively check parts
      if (part.parts) {
        for (const subPart of part.parts) {
          await extractFromPart(subPart);
        }
      }
    };

    await extractFromPart(payload);
    return attachments;
  }

  /**
   * Test Gmail API connection with user credentials
   */
  async testConnection(credentials: GmailCredentials): Promise<boolean> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
        access_token: credentials.accessToken,
        expiry_date: credentials.expiryDate
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      logger.info('Gmail API connection test successful', {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal
      });

      return true;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Gmail API connection test failed', {
        error: errorMessage
      });
      return false;
    }
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(credentials: GmailCredentials): Promise<GmailCredentials> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
        access_token: credentials.accessToken,
        expiry_date: credentials.expiryDate
      });

      // Check if token needs refresh
      const tokenInfo = await this.oauth2Client.getAccessToken();
      
      if (tokenInfo.token) {
        return {
          ...credentials,
          accessToken: tokenInfo.token,
          expiryDate: this.oauth2Client.credentials.expiry_date ?? undefined
        };
      }

      return credentials;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to refresh Gmail token', {
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const gmailEmailFetcher = new GmailEmailFetcher(); 