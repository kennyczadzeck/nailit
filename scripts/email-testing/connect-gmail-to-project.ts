import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { oauthSessionManager } from '../../app/lib/oauth-session-manager';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

/**
 * Connect Gmail OAuth credentials to test project using enhanced OAuth session tracking
 */
async function connectGmailToProject(): Promise<void> {
  try {
    console.log('🔗 Connecting Gmail OAuth to test project with enhanced session tracking...\n');

    // Load test project config
    const configPath = path.join(__dirname, 'test-project-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('❌ Test project config not found. Run test setup first.');
      return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const projectId = config.projectId;
    const userId = config.homeownerUserId;

    console.log(`📋 Project ID: ${projectId}`);
    console.log(`👤 User ID: ${userId}`);

    // Load homeowner OAuth credentials
    const credentialsPath = path.join(__dirname, 'credentials/homeowner-credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      console.error('❌ Homeowner OAuth credentials not found. Run OAuth setup first.');
      return;
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log(`📧 Email: nailit.test.homeowner@gmail.com`);

    // Define OAuth scopes
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata'
    ];

    // Create OAuth session using enhanced session manager
    const sessionId = await oauthSessionManager.createOAuthSession(
      projectId,
      userId,
      {
        refresh_token: credentials.refresh_token,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      },
      scopes
    );

    console.log(`✅ Enhanced OAuth session created successfully!`);
    console.log(`🔑 Session ID: ${sessionId}`);
    console.log(`📅 Token expires: ${new Date(credentials.expiry_date).toISOString()}`);
    console.log(`🔒 Scopes: ${scopes.join(', ')}`);

    // Get compliance report
    const complianceReport = await oauthSessionManager.getComplianceReport(projectId);
    
    console.log(`\n📊 OAuth Session Compliance Report:`);
    console.log(`   Session Age: ${complianceReport.securityAssessment.sessionAge} days`);
    console.log(`   Token Valid: ${complianceReport.securityAssessment.tokenValid}`);
    console.log(`   Needs Reauth: ${complianceReport.securityAssessment.needsReauthorization}`);
    console.log(`   Granted At: ${complianceReport.oauthStatus.grantedAt}`);
    console.log(`   Granted By: ${complianceReport.oauthStatus.grantedBy}`);

  } catch (error: any) {
    console.error('❌ Failed to connect Gmail OAuth with enhanced tracking:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  connectGmailToProject();
}

export { connectGmailToProject }; 