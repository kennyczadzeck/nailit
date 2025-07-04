import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from './logger';

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

export interface EmailContent {
  messageId: string;
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  headers: Record<string, string>;
  rawEmail?: string;
}

export interface S3StorageResult {
  contentPath?: string;
  attachmentPaths: string[];
  totalSize: number;
  success: boolean;
  error?: string;
}

class S3EmailStorage {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Initialize S3 client with credentials from environment
    this.s3Client = new S3Client({
      region: process.env.NAILIT_AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.NAILIT_IAM_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NAILIT_IAM_ACCESS_KEY_SECRET!,
      },
    });

    this.bucketName = process.env.NAILIT_S3_BUCKET || 'nailit-dev-emails-207091906248';
    
    logger.info('S3EmailStorage initialized', {
      bucketName: this.bucketName,
      region: process.env.NAILIT_AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Store email content and attachments in S3
   */
  async storeEmail(
    userId: string, 
    projectId: string, 
    emailContent: EmailContent
  ): Promise<S3StorageResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting S3 email storage', {
        userId,
        projectId,
        messageId: emailContent.messageId,
        attachmentCount: emailContent.attachments.length
      });

      const attachmentPaths: string[] = [];
      let contentPath: string | undefined;
      let totalSize = 0;

      // Store main email content
      if (emailContent.bodyText || emailContent.bodyHtml || emailContent.rawEmail) {
        const emailData = {
          subject: emailContent.subject,
          bodyText: emailContent.bodyText,
          bodyHtml: emailContent.bodyHtml,
          headers: emailContent.headers,
          rawEmail: emailContent.rawEmail,
          storedAt: new Date().toISOString()
        };

        const emailJson = JSON.stringify(emailData, null, 2);
        const emailBuffer = Buffer.from(emailJson, 'utf-8');
        totalSize += emailBuffer.length;

        contentPath = this.generateEmailContentPath(userId, projectId, emailContent.messageId);
        
        await this.uploadToS3(contentPath, emailBuffer, 'application/json');
        
        logger.info('Email content stored in S3', {
          contentPath,
          size: emailBuffer.length
        });
      }

      // Store attachments
      for (let i = 0; i < emailContent.attachments.length; i++) {
        const attachment = emailContent.attachments[i];
        totalSize += attachment.size;

        const attachmentPath = this.generateAttachmentPath(
          userId, 
          projectId, 
          emailContent.messageId, 
          i, 
          attachment.filename
        );

        await this.uploadToS3(attachmentPath, attachment.data, attachment.contentType);
        attachmentPaths.push(attachmentPath);

        logger.info('Attachment stored in S3', {
          attachmentPath,
          filename: attachment.filename,
          size: attachment.size,
          contentType: attachment.contentType
        });
      }

      const duration = Date.now() - startTime;
      
      logger.performance('S3 email storage completed', duration, {
        userId,
        projectId,
        messageId: emailContent.messageId,
        contentPath,
        attachmentCount: attachmentPaths.length,
        totalSize
      });

      return {
        contentPath,
        attachmentPaths,
        totalSize,
        success: true
      };

    } catch (error: unknown) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('S3 email storage failed', {
        userId,
        projectId,
        messageId: emailContent.messageId,
        error: errorMessage,
        duration
      });

      return {
        attachmentPaths: [],
        totalSize: 0,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Retrieve email content from S3
   */
  async retrieveEmailContent(contentPath: string): Promise<EmailContent | null> {
    try {
      logger.debug('Retrieving email content from S3', { contentPath });

      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.bucketName,
        Key: contentPath
      }));

      if (!response.Body) {
        logger.warn('No body in S3 response', { contentPath });
        return null;
      }

      const bodyString = await response.Body.transformToString();
      const emailData = JSON.parse(bodyString);

      logger.info('Email content retrieved from S3', {
        contentPath,
        size: bodyString.length
      });

      return {
        messageId: this.extractMessageIdFromPath(contentPath),
        subject: emailData.subject,
        bodyText: emailData.bodyText,
        bodyHtml: emailData.bodyHtml,
        headers: emailData.headers,
        rawEmail: emailData.rawEmail,
        attachments: [] // Attachments retrieved separately
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to retrieve email content from S3', {
        contentPath,
        error: errorMessage
      });
      return null;
    }
  }

  /**
   * Delete email and attachments from S3
   */
  async deleteEmail(contentPath: string, attachmentPaths: string[]): Promise<boolean> {
    try {
      logger.info('Deleting email from S3', {
        contentPath,
        attachmentCount: attachmentPaths.length
      });

      // Delete main content
      if (contentPath) {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: contentPath
        }));
      }

      // Delete attachments
      for (const attachmentPath of attachmentPaths) {
        await this.s3Client.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: attachmentPath
        }));
      }

      logger.info('Email deleted from S3 successfully', {
        contentPath,
        attachmentCount: attachmentPaths.length
      });

      return true;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to delete email from S3', {
        contentPath,
        attachmentPaths,
        error: errorMessage
      });
      return false;
    }
  }

  /**
   * Upload data to S3
   */
  private async uploadToS3(key: string, data: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'uploaded-by': 'nailit-email-processor',
        'upload-timestamp': new Date().toISOString()
      }
    });

    await this.s3Client.send(command);
  }

  /**
   * Generate S3 path for email content
   */
  private generateEmailContentPath(userId: string, projectId: string, messageId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `emails/${year}/${month}/${day}/user-${userId}/project-${projectId}/email-${messageId}.json`;
  }

  /**
   * Generate S3 path for email attachments
   */
  private generateAttachmentPath(
    userId: string, 
    projectId: string, 
    messageId: string, 
    index: number, 
    filename: string
  ): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Sanitize filename
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `attachments/${year}/${month}/${day}/user-${userId}/project-${projectId}/email-${messageId}/attachment-${index}-${sanitizedFilename}`;
  }

  /**
   * Extract message ID from S3 path
   */
  private extractMessageIdFromPath(path: string): string {
    const match = path.match(/email-([^.]+)\.json$/);
    return match ? match[1] : '';
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(userId: string, projectId?: string): Promise<{
    emailCount: number;
    totalSize: number;
    oldestEmail: string | null;
    newestEmail: string | null;
  }> {
    // This would require listing S3 objects, which can be expensive
    // For now, return placeholder data - in production, consider using CloudWatch metrics
    logger.info('Storage stats requested', { userId, projectId });
    
    return {
      emailCount: 0,
      totalSize: 0,
      oldestEmail: null,
      newestEmail: null
    };
  }
}

// Export singleton instance
export const s3EmailStorage = new S3EmailStorage(); 