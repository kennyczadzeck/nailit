#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from '../../app/lib/prisma';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';

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

  /**
   * Create test user and project setup for email testing
   */
  async setupTestProject(): Promise<void> {
    console.log(`🏠 Setting up test project for email testing...`);

    try {
      // Create homeowner user aligned with email testing
      const homeowner = await prisma.user.upsert({
        where: { email: 'nailit.test.homeowner@gmail.com' },
        update: {},
        create: {
          email: 'nailit.test.homeowner@gmail.com',
          name: 'Sarah Homeowner',
          emailVerified: new Date(),
        },
      });

      console.log(`👤 Created/verified homeowner user: ${homeowner.email}`);

      // Create test project
      let project = await prisma.project.findFirst({
        where: {
          userId: homeowner.id,
          name: 'Test Kitchen Renovation'
        }
      });

      if (!project) {
        project = await prisma.project.create({
          data: {
            name: 'Test Kitchen Renovation',
            description: 'Complete kitchen remodel for email testing - includes new cabinets, countertops, appliances, and flooring',
            status: 'ACTIVE',
            startDate: new Date('2024-01-15'),
            contractor: 'Mike Johnson Construction',
            budget: 75000,
            address: '123 Test St, Email Testing, CA 90210',
            userId: homeowner.id,
          },
        });
      }

      console.log(`🏗️ Created/verified project: ${project.name}`);

      // Create email settings
      await prisma.emailSettings.upsert({
        where: { projectId: project.id },
        update: {},
        create: {
          projectId: project.id,
          gmailConnected: true,
          monitoringEnabled: true,
          notificationsEnabled: true,
          weeklyReports: true,
          highPriorityAlerts: true,
        },
      });

      console.log(`📧 Created/verified email settings`);

      // Create team members aligned with email testing
      const teamMembers = [
        {
          name: 'Mike Johnson',
          email: 'nailit.test.contractor@gmail.com',
          role: 'GENERAL_CONTRACTOR' as const,
          projectId: project.id,
        },
        {
          name: 'Sarah Chen',
          email: 'info@graniteplus.com',
          role: 'ARCHITECT_DESIGNER' as const,
          projectId: project.id,
        },
        {
          name: 'Tom Rodriguez',
          email: 'tom@brightelectrical.com',
          role: 'PROJECT_MANAGER' as const,
          projectId: project.id,
        },
      ];

      for (const member of teamMembers) {
        const existingMember = await prisma.teamMember.findFirst({
          where: {
            projectId: member.projectId,
            email: member.email,
          }
        });

        if (!existingMember) {
          await prisma.teamMember.create({
            data: member,
          });
        }
      }

      console.log(`👥 Created/verified ${teamMembers.length} team members`);

      // Store project info for test scripts
      const testConfig = {
        homeownerUserId: homeowner.id,
        homeownerEmail: homeowner.email,
        projectId: project.id,
        projectName: project.name,
        contractorEmail: 'nailit.test.contractor@gmail.com',
        teamMembers: teamMembers.map(m => ({ name: m.name, email: m.email, role: m.role })),
        createdAt: new Date().toISOString(),
      };

      // Save test config for other scripts to use
      const configPath = path.join(__dirname, 'test-project-config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
      
      console.log(`✅ Test project setup complete!`);
      console.log(`📋 Project ID: ${project.id}`);
      console.log(`📧 Homeowner: ${homeowner.email}`);
      console.log(`👷 Contractor: nailit.test.contractor@gmail.com`);
      console.log(`💾 Config saved to: ${configPath}`);

    } catch (error: any) {
      console.error('❌ Failed to setup test project:', error.message);
      throw error;
    }
  }

  /**
   * Set up test project with ONLY the contractor as team member
   * This aligns with the updated testing requirements:
   * - Only one team member (test contractor)
   * - Realistic email conversations between homeowner and contractor
   */
  async setupSingleContractorProject(): Promise<void> {
    console.log('🏗️  Setting up test project with single contractor...');

    try {
      // Find or create test homeowner user
      let homeowner = await prisma.user.findUnique({
        where: { email: 'nailit.test.homeowner@gmail.com' }
      });

      if (!homeowner) {
        homeowner = await prisma.user.create({
          data: {
            email: 'nailit.test.homeowner@gmail.com',
            name: 'Sarah Test Homeowner',
          }
        });
        console.log('👤 Created homeowner user');
      } else {
        console.log('👤 Found existing homeowner user');
      }

      // Find or create test project
      let project = await prisma.project.findFirst({
        where: { 
          userId: homeowner.id,
          name: 'Kitchen Renovation Test Project'
        }
      });

      if (!project) {
        project = await prisma.project.create({
          data: {
            name: 'Kitchen Renovation Test Project',
            description: 'Complete kitchen renovation with realistic email testing between homeowner and contractor',
            status: 'ACTIVE',
            startDate: new Date('2024-02-01'),
            contractor: 'Johnson Construction',
            budget: 50000,
            address: '123 Test Street, Test City, CA 90210',
            userId: homeowner.id,
          }
        });
        console.log('🏠 Created test project');
      } else {
        console.log('🏠 Found existing test project');
      }

      // CRITICAL: Remove ALL existing team members first
      const deletedMembers = await prisma.teamMember.deleteMany({
        where: { projectId: project.id }
      });
      console.log(`🗑️  Removed ${deletedMembers.count} existing team members`);

      // Add ONLY the contractor as team member
      const contractor = await prisma.teamMember.create({
        data: {
          name: 'Mike Johnson',
          email: 'nailit.test.contractor@gmail.com',
          role: 'GENERAL_CONTRACTOR',
          projectId: project.id,
        }
      });
      console.log('👷 Added contractor as ONLY team member');

      // Ensure email monitoring is enabled
      await prisma.emailSettings.upsert({
        where: { projectId: project.id },
        update: {
          monitoringEnabled: true,
          gmailConnected: true,
          notificationsEnabled: true,
          weeklyReports: true,
          highPriorityAlerts: true,
        },
        create: {
          projectId: project.id,
          monitoringEnabled: true,
          gmailConnected: true,
          notificationsEnabled: true,
          weeklyReports: true,
          highPriorityAlerts: true,
        }
      });
      console.log('📧 Email monitoring enabled');

      // Update test config file
      const testConfig = {
        homeownerUserId: homeowner.id,
        homeownerEmail: homeowner.email,
        projectId: project.id,
        projectName: project.name,
        contractorEmail: 'nailit.test.contractor@gmail.com',
        teamMembers: [
          { 
            name: 'Mike Johnson', 
            email: 'nailit.test.contractor@gmail.com', 
            role: 'GENERAL_CONTRACTOR' 
          }
        ],
        testingRequirements: {
          onlyOneTeamMember: true,
          realisticConversations: true,
          includeAttachments: true,
          homeownerContractorOnly: true
        },
        createdAt: new Date().toISOString(),
      };

      const configPath = path.join(__dirname, 'test-project-config.json');
      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));
      
      console.log('✅ Single contractor project setup complete!');
      console.log(`📋 Project ID: ${project.id}`);
      console.log(`📧 Homeowner: ${homeowner.email}`);
      console.log(`👷 Contractor: nailit.test.contractor@gmail.com`);
      console.log(`👥 Team Members: 1 (contractor only)`);
      console.log(`💾 Config saved to: ${configPath}`);

    } catch (error: any) {
      console.error('❌ Failed to setup single contractor project:', error.message);
      throw error;
    }
  }

  /**
   * Get test project configuration
   */
  async getTestProjectConfig(): Promise<{
    userId: string;
    projectId: string;
    userEmail: string;
    projectName: string;
  }> {
    const configPath = path.join(__dirname, 'test-project-config.json');
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        userId: config.homeownerUserId,
        projectId: config.projectId,
        userEmail: config.homeownerEmail,
        projectName: config.projectName
      };
    }
    
    throw new Error('Test project config not found. Run: npm run test:setup-project');
  }

  /**
   * Query a specific email message by messageId
   */
  async queryEmailMessage(messageId: string): Promise<any> {
    try {
      const emailMessage = await prisma.emailMessage.findUnique({
        where: { messageId },
        include: {
          project: {
            select: { name: true }
          },
          user: {
            select: { email: true }
          }
        }
      });

      return emailMessage;

    } catch (error: any) {
      console.error('❌ Failed to query email message:', error.message);
      throw error;
    }
  }

  /**
   * Query recent emails for testing
   */
  async queryRecentEmails(limit: number = 10): Promise<any[]> {
    try {
      const emails = await prisma.emailMessage.findMany({
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        select: {
          id: true,
          messageId: true,
          subject: true,
          sender: true,
          sentAt: true,
          ingestionStatus: true,
          analysisStatus: true,
          s3ContentPath: true,
          s3AttachmentPaths: true,
          providerData: true,
          createdAt: true
        }
      });

      return emails;

    } catch (error: any) {
      console.error('❌ Failed to query recent emails:', error.message);
      throw error;
    }
  }

  /**
   * Clean up test emails from database
   */
  async cleanupTestEmails(): Promise<void> {
    try {
      const result = await prisma.emailMessage.deleteMany({
        where: {
          OR: [
            { sender: { contains: 'nailit.test' } },
            { messageId: { startsWith: 'webhook-' } },
            { messageId: { startsWith: 'test-' } },
            { subject: { contains: '[TEST]' } },
            { subject: { contains: '[WEBHOOK TEST]' } }
          ]
        }
      });

      console.log(`🗑️ Deleted ${result.count} test email records`);

    } catch (error: any) {
      console.error('❌ Failed to cleanup test emails:', error.message);
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

      case 'setup-test-project':
        await dataManager.setupTestProject();
        break;

      case 'setup-single-contractor-project':
        await dataManager.setupSingleContractorProject();
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