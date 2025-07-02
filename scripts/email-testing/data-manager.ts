#!/usr/bin/env ts-node

import { prisma } from '../../app/lib/prisma';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

/**
 * Data Manager for Email Testing
 * 
 * Handles cleanup and reset of test data:
 * - PostgreSQL EmailMessage records
 * - S3 email attachments
 * - Selective cleanup by date/sender
 */

class EmailTestDataManager {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({ 
      region: process.env.NAILIT_AWS_REGION || 'us-east-1'
    });
    this.bucketName = process.env.NAILIT_S3_BUCKET || 'nailit-dev-emails-207091906248';
  }

  /**
   * Truncate all test data (PostgreSQL + S3)
   */
  async truncateAll(): Promise<void> {
    console.log('🧹 Truncating all test data...');
    
    await this.truncateDatabase();
    await this.truncateS3();
    
    console.log('✅ All test data truncated');
  }

  /**
   * Truncate only PostgreSQL EmailMessage data
   */
  async truncateDatabase(): Promise<void> {
    console.log('🧹 Truncating PostgreSQL EmailMessage data...');

    try {
      // Count records before deletion
      const countBefore = await prisma.emailMessage.count({
        where: {
          OR: [
            { sender: 'nailit.test.contractor@gmail.com' },
            { recipients: { has: 'nailit.test.homeowner@gmail.com' } }
          ]
        }
      });

      console.log(`📊 Found ${countBefore} test email records`);

      if (countBefore === 0) {
        console.log('✅ No test email records to delete');
        return;
      }

      // Delete test email records
      const deleteResult = await prisma.emailMessage.deleteMany({
        where: {
          OR: [
            { sender: 'nailit.test.contractor@gmail.com' },
            { recipients: { has: 'nailit.test.homeowner@gmail.com' } }
          ]
        }
      });

      console.log(`✅ Deleted ${deleteResult.count} email records from PostgreSQL`);

    } catch (error: any) {
      console.error('❌ Failed to truncate database:', error.message);
      throw error;
    }
  }

  /**
   * Truncate only S3 email attachments
   */
  async truncateS3(): Promise<void> {
    console.log('🧹 Truncating S3 email attachments...');

    try {
      // List objects with test email prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'emails/test/'
      });

      const listResponse = await this.s3Client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        console.log('✅ No S3 test objects to delete');
        return;
      }

      console.log(`📊 Found ${listResponse.Contents.length} S3 test objects`);

      // Delete objects in batches
      const objectsToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key! }));
      
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: objectsToDelete
        }
      });

      const deleteResponse = await this.s3Client.send(deleteCommand);
      
      console.log(`✅ Deleted ${deleteResponse.Deleted?.length || 0} objects from S3`);

    } catch (error: any) {
      console.error('❌ Failed to truncate S3:', error.message);
      throw error;
    }
  }

  /**
   * Clean up emails newer than specified days
   */
  async cleanupByDate(days: number): Promise<void> {
    console.log(`🧹 Cleaning up test emails newer than ${days} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const deleteResult = await prisma.emailMessage.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { sender: 'nailit.test.contractor@gmail.com' },
                { recipients: { has: 'nailit.test.homeowner@gmail.com' } }
              ]
            },
            {
              sentAt: {
                gte: cutoffDate
              }
            }
          ]
        }
      });

      console.log(`✅ Deleted ${deleteResult.count} recent email records`);

    } catch (error: any) {
      console.error('❌ Failed to cleanup by date:', error.message);
      throw error;
    }
  }

  /**
   * Clean up emails by sender
   */
  async cleanupBySender(sender: string): Promise<void> {
    console.log(`🧹 Cleaning up emails from sender: ${sender}...`);

    try {
      const deleteResult = await prisma.emailMessage.deleteMany({
        where: {
          sender: sender
        }
      });

      console.log(`✅ Deleted ${deleteResult.count} email records from ${sender}`);

    } catch (error: any) {
      console.error('❌ Failed to cleanup by sender:', error.message);
      throw error;
    }
  }

  /**
   * Reset specific test account data
   */
  async resetAccount(email: string): Promise<void> {
    console.log(`🧹 Resetting account data for: ${email}...`);

    try {
      const deleteResult = await prisma.emailMessage.deleteMany({
        where: {
          OR: [
            { sender: email },
            { recipients: { has: email } }
          ]
        }
      });

      console.log(`✅ Reset ${deleteResult.count} email records for ${email}`);

    } catch (error: any) {
      console.error('❌ Failed to reset account:', error.message);
      throw error;
    }
  }

  /**
   * Query test email data for validation
   */
  async queryEmails(limit: number = 10): Promise<void> {
    console.log(`📊 Querying test email data (limit: ${limit})...`);

    try {
      const emails = await prisma.emailMessage.findMany({
        where: {
          OR: [
            { sender: 'nailit.test.contractor@gmail.com' },
            { recipients: { has: 'nailit.test.homeowner@gmail.com' } }
          ]
        },
        orderBy: {
          sentAt: 'desc'
        },
        take: limit,
        select: {
          id: true,
          messageId: true,
          sender: true,
          subject: true,
          sentAt: true,
          ingestionStatus: true,
          analysisStatus: true
        }
      });

      console.log(`\n📧 Found ${emails.length} test emails:`);
      console.table(emails);

      const totalCount = await prisma.emailMessage.count({
        where: {
          OR: [
            { sender: 'nailit.test.contractor@gmail.com' },
            { recipients: { has: 'nailit.test.homeowner@gmail.com' } }
          ]
        }
      });

      console.log(`\n📊 Total test emails: ${totalCount}`);

    } catch (error: any) {
      console.error('❌ Failed to query emails:', error.message);
      throw error;
    }
  }

  /**
   * Check S3 test objects
   */
  async checkS3(expectedFiles?: number): Promise<void> {
    console.log('📊 Checking S3 test objects...');

    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'emails/test/'
      });

      const listResponse = await this.s3Client.send(listCommand);
      const objectCount = listResponse.Contents?.length || 0;

      console.log(`📦 Found ${objectCount} S3 test objects`);

      if (expectedFiles !== undefined) {
        if (objectCount === expectedFiles) {
          console.log(`✅ Expected ${expectedFiles} files, found ${objectCount}`);
        } else {
          console.log(`❌ Expected ${expectedFiles} files, found ${objectCount}`);
        }
      }

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        console.log('\n📁 S3 objects:');
        listResponse.Contents.forEach(obj => {
          console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
        });
      }

    } catch (error: any) {
      console.error('❌ Failed to check S3:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`\n🧹 Email Test Data Manager\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:truncate-all`);
    console.log(`  npm run test:truncate-db`);
    console.log(`  npm run test:truncate-s3`);
    console.log(`  npm run test:cleanup --days=<days>`);
    console.log(`  npm run test:cleanup --sender=<email>`);
    console.log(`  npm run test:reset-account <email>`);
    console.log(`  npm run test:query-emails [limit]`);
    console.log(`  npm run test:check-s3 [expected_files]`);
    console.log(`\nExamples:`);
    console.log(`  npm run test:truncate-all`);
    console.log(`  npm run test:cleanup --days=7`);
    console.log(`  npm run test:query-emails 20`);
    return;
  }

  const dataManager = new EmailTestDataManager();

  try {
    switch (command) {
      case 'truncate-all':
        await dataManager.truncateAll();
        break;

      case 'truncate-db':
        await dataManager.truncateDatabase();
        break;

      case 'truncate-s3':
        await dataManager.truncateS3();
        break;

      case 'cleanup':
        const days = parseInt(args[1]?.replace('--days=', '') || '7');
        await dataManager.cleanupByDate(days);
        break;

      case 'cleanup-sender':
        const sender = args[1]?.replace('--sender=', '') || 'nailit.test.contractor@gmail.com';
        await dataManager.cleanupBySender(sender);
        break;

      case 'reset-account':
        const email = args[1];
        if (!email) {
          console.error('❌ Email address required');
          process.exit(1);
        }
        await dataManager.resetAccount(email);
        break;

      case 'query-emails':
        const limit = parseInt(args[1]) || 10;
        await dataManager.queryEmails(limit);
        break;

      case 'check-s3':
        const expectedFiles = args[1] ? parseInt(args[1]) : undefined;
        await dataManager.checkS3(expectedFiles);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { EmailTestDataManager };
