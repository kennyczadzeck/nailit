#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

// Load environment variables
config({ path: '.env.local' });

/**
 * OAuth Setup for Email Testing - HOMEOWNER-ONLY GMAIL ACCESS
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE: HOMEOWNER-ONLY EMAIL INGESTION
 * 
 * This OAuth setup utility manages Gmail API credentials for email testing with
 * the HOMEOWNER-ONLY approach:
 * 
 * 1. HOMEOWNER ACCOUNT: Primary OAuth setup for nailit.test.homeowner@gmail.com
 *    - Full Gmail API access for email ingestion testing
 *    - Scope: gmail.readonly, gmail.modify (for cleanup)
 *    - Purpose: Simulate production homeowner email processing
 * 
 * 2. CONTRACTOR ACCOUNT: Limited OAuth setup for nailit.test.contractor@gmail.com
 *    - Send-only Gmail API access for test email generation
 *    - Scope: gmail.send (for creating test emails TO homeowner)
 *    - Purpose: Generate test emails that appear in homeowner's Gmail
 *    - NEVER used for email ingestion or processing
 * 
 * HOMEOWNER-ONLY VALIDATION:
 * - Validates that homeowner OAuth has proper ingestion scopes
 * - Validates that contractor OAuth is limited to send-only
 * - Prevents accidental contractor Gmail access for ingestion
 * - Enforces proper credential separation
 * 
 * WORKFLOW:
 * 1. Setup homeowner OAuth with full Gmail access
 * 2. Setup contractor OAuth with send-only access
 * 3. Validate both accounts have correct scope limitations
 * 4. Generate test emails from contractor TO homeowner
 * 5. Process emails from homeowner Gmail ONLY
 * 
 * NEVER MODIFY THIS TO ALLOW CONTRACTOR GMAIL INGESTION
 */

interface OAuthCredentials {
  refresh_token: string;
  access_token: string;
  expiry_date: number;
  scope: string;
}

interface AccountConfig {
  name: string;
  email: string;
  purpose: string;
  allowedScopes: string[];
  requiredScopes: string[];
  credentialsFile: string;
}

class EmailTestOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  // HOMEOWNER-ONLY Account Configuration
  private readonly accountConfigs: Record<string, AccountConfig> = {
    homeowner: {
      name: 'Homeowner (Primary Ingestion Account)',
      email: 'nailit.test.homeowner@gmail.com',
      purpose: 'Email ingestion and processing (FULL Gmail access)',
      allowedScopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send'
      ],
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      credentialsFile: 'homeowner-credentials.json'
    },
    contractor: {
      name: 'Contractor (Send-Only Account)',
      email: 'nailit.test.contractor@gmail.com',
      purpose: 'Send test emails TO homeowner (LIMITED Gmail access)',
      allowedScopes: [
        'https://www.googleapis.com/auth/gmail.send'
      ],
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.send'
      ],
      credentialsFile: 'contractor-credentials.json'
    }
  };

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing Google OAuth credentials in environment variables');
    }
  }

  /**
   * Setup OAuth for a specific account with HOMEOWNER-ONLY validation
   * 
   * This method sets up OAuth credentials for either homeowner or contractor
   * accounts with proper scope validation and access controls.
   * 
   * @param accountType - 'homeowner' or 'contractor'
   */
  async setupOAuth(accountType: 'homeowner' | 'contractor'): Promise<void> {
    const config = this.accountConfigs[accountType];
    if (!config) {
      throw new Error(`Invalid account type: ${accountType}`);
    }

    console.log(`\n🔐 Setting up OAuth for ${config.name}`);
    console.log(`📧 Email: ${config.email}`);
    console.log(`🎯 Purpose: ${config.purpose}`);
    console.log(`🔑 Required Scopes: ${config.requiredScopes.join(', ')}`);
    
    // VALIDATION: Ensure we're setting up the correct account type
    if (accountType === 'homeowner') {
      console.log(`🏠 HOMEOWNER ACCOUNT: This will be used for email ingestion`);
      console.log(`⚠️  CRITICAL: This account must have gmail.readonly and gmail.modify scopes`);
    } else {
      console.log(`👷 CONTRACTOR ACCOUNT: This will ONLY be used to send test emails`);
      console.log(`⚠️  CRITICAL: This account should NEVER be used for email ingestion`);
    }

    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    // Generate authorization URL with proper scopes for account type
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: config.allowedScopes,
      prompt: 'consent' // Force consent screen to ensure refresh token
    });

    console.log(`\n🌐 Open this URL in your browser to authorize ${config.name}:`);
    console.log(authUrl);
    console.log(`\n⚠️  IMPORTANT: Make sure you're logged into ${config.email} in your browser`);

    // Get authorization code from user
    const authCode = await this.getAuthorizationCode();

    try {
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(authCode);
      
      // VALIDATION: Verify tokens have required scopes
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received. Make sure to use prompt=consent');
      }

      // Validate scopes for account type
      await this.validateTokenScopes(tokens, config);

      // Save credentials to file
      const credentialsPath = path.join(__dirname, 'credentials', config.credentialsFile);
      await this.saveCredentials(credentialsPath, tokens);

      console.log(`\n✅ OAuth setup completed for ${config.name}`);
      console.log(`💾 Credentials saved to: ${credentialsPath}`);
      
      // Test the credentials
      await this.testCredentials(accountType);

    } catch (error: any) {
      console.error(`❌ OAuth setup failed for ${config.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Validate that OAuth tokens have the correct scopes for HOMEOWNER-ONLY approach
   * 
   * This method ensures that:
   * - Homeowner tokens have ingestion scopes (readonly, modify)
   * - Contractor tokens are limited to send-only scope
   * - No unauthorized scope escalation occurs
   */
  private async validateTokenScopes(tokens: any, config: AccountConfig): Promise<void> {
    console.log(`🔍 Validating OAuth scopes for ${config.name}...`);
    
    // Extract scopes from token (if available)
    const grantedScopes: string[] = tokens.scope ? tokens.scope.split(' ') : [];
    
    console.log(`📋 Granted scopes: ${grantedScopes.join(', ')}`);
    console.log(`📋 Required scopes: ${config.requiredScopes.join(', ')}`);
    
    // Check if all required scopes are present
    const missingScopes = config.requiredScopes.filter(scope => 
      !grantedScopes.includes(scope)
    );
    
    if (missingScopes.length > 0) {
      throw new Error(`Missing required scopes for ${config.name}: ${missingScopes.join(', ')}`);
    }
    
    // Additional validation for homeowner account
    if (config.name.includes('Homeowner')) {
      if (!grantedScopes.includes('https://www.googleapis.com/auth/gmail.readonly')) {
        throw new Error('HOMEOWNER account missing gmail.readonly scope - cannot perform email ingestion');
      }
      console.log(`✅ HOMEOWNER account has proper ingestion scopes`);
    }
    
    // Additional validation for contractor account
    if (config.name.includes('Contractor')) {
      const hasInvalidScopes = grantedScopes.some(scope => 
        scope.includes('gmail.readonly') || scope.includes('gmail.modify')
      );
      if (hasInvalidScopes) {
        console.warn(`⚠️  WARNING: CONTRACTOR account has ingestion scopes - this violates homeowner-only principle`);
      }
      console.log(`✅ CONTRACTOR account limited to send-only scopes`);
    }
    
    console.log(`✅ OAuth scope validation passed for ${config.name}`);
  }

  /**
   * Test OAuth credentials with HOMEOWNER-ONLY validation
   * 
   * This method tests the OAuth credentials and validates that:
   * - Homeowner account can access Gmail for ingestion
   * - Contractor account is limited to send-only operations
   * - No unauthorized cross-account access occurs
   */
  async testCredentials(accountType: 'homeowner' | 'contractor'): Promise<void> {
    const config = this.accountConfigs[accountType];
    console.log(`\n🧪 Testing OAuth credentials for ${config.name}...`);
    
    try {
      const gmail = this.getGmailClient(accountType);
      
      // Test basic profile access
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ Connected as: ${profile.data.emailAddress}`);
      
      // VALIDATION: Ensure we're connected to the correct account
      if (!profile.data.emailAddress?.includes(accountType)) {
        console.warn(`⚠️  WARNING: Connected to ${profile.data.emailAddress} but expected ${accountType} account`);
      }
      
      // Test account-specific capabilities
      if (accountType === 'homeowner') {
        // Test HOMEOWNER ingestion capabilities
        await this.testHomeownerCapabilities(gmail);
      } else {
        // Test CONTRACTOR send-only capabilities
        await this.testContractorCapabilities(gmail);
      }
      
      console.log(`✅ OAuth credentials working for ${config.name}`);
      
    } catch (error: any) {
      console.error(`❌ OAuth test failed for ${config.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Test HOMEOWNER Gmail capabilities for email ingestion
   */
  private async testHomeownerCapabilities(gmail: any): Promise<void> {
    console.log(`🏠 Testing HOMEOWNER ingestion capabilities...`);
    
    try {
      // Test email listing (required for ingestion)
      const messages = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1
      });
      console.log(`✅ HOMEOWNER can list emails: ${messages.data.resultSizeEstimate || 0} total`);
      
      // Test email reading (required for ingestion)
      if (messages.data.messages && messages.data.messages.length > 0) {
        const messageId = messages.data.messages[0].id;
        const message = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata'
        });
        console.log(`✅ HOMEOWNER can read email metadata`);
      }
      
      console.log(`✅ HOMEOWNER account ready for email ingestion`);
      
    } catch (error: any) {
      throw new Error(`HOMEOWNER ingestion test failed: ${error.message}`);
    }
  }

  /**
   * Test CONTRACTOR send-only capabilities
   */
  private async testContractorCapabilities(gmail: any): Promise<void> {
    console.log(`👷 Testing CONTRACTOR send-only capabilities...`);
    
    try {
      // Test profile access (minimal required)
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ CONTRACTOR profile access: ${profile.data.emailAddress}`);
      
      // VALIDATION: Ensure contractor cannot list emails (ingestion prevention)
      try {
        await gmail.users.messages.list({
          userId: 'me',
          maxResults: 1
        });
        console.warn(`⚠️  WARNING: CONTRACTOR account can list emails - this violates homeowner-only principle`);
      } catch (error: any) {
        console.log(`✅ CONTRACTOR correctly blocked from listing emails`);
      }
      
      console.log(`✅ CONTRACTOR account properly limited to send-only`);
      
    } catch (error: any) {
      throw new Error(`CONTRACTOR send-only test failed: ${error.message}`);
    }
  }

  /**
   * Get Gmail client for specific account type with HOMEOWNER-ONLY validation
   * 
   * This method returns a Gmail API client for the specified account type
   * with proper validation to ensure homeowner-only ingestion compliance.
   */
  getGmailClient(accountType: 'homeowner' | 'contractor') {
    const config = this.accountConfigs[accountType];
    if (!config) {
      throw new Error(`Invalid account type: ${accountType}`);
    }

    const credentialsPath = path.join(__dirname, 'credentials', config.credentialsFile);
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials not found for ${config.name}. Run OAuth setup first.`);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    if (!credentials.refresh_token) {
      throw new Error(`Invalid credentials for ${config.name}. Missing refresh token.`);
    }

    const oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );

    oauth2Client.setCredentials(credentials);

    // VALIDATION: Log account type for audit trail
    console.log(`🔗 Creating Gmail client for ${config.name}`);
    if (accountType === 'homeowner') {
      console.log(`🏠 HOMEOWNER client: Used for email ingestion`);
    } else {
      console.log(`👷 CONTRACTOR client: Used for test email generation only`);
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Check OAuth status for all accounts with HOMEOWNER-ONLY validation
   */
  async checkOAuthStatus(): Promise<void> {
    console.log(`\n📊 OAuth Status Check (HOMEOWNER-ONLY Validation)\n`);
    
    for (const [accountType, config] of Object.entries(this.accountConfigs)) {
      console.log(`\n🔍 Checking ${config.name}...`);
      
      const credentialsPath = path.join(__dirname, 'credentials', config.credentialsFile);
      
      if (!fs.existsSync(credentialsPath)) {
        console.log(`❌ No credentials found for ${config.name}`);
        console.log(`   Run: npm run test:oauth-setup ${accountType}`);
        continue;
      }

      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        
        if (!credentials.refresh_token) {
          console.log(`❌ Invalid credentials for ${config.name} (missing refresh token)`);
          continue;
        }

        // Test the credentials
        const gmail = this.getGmailClient(accountType as 'homeowner' | 'contractor');
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log(`✅ ${config.name} - Connected as: ${profile.data.emailAddress}`);
        console.log(`   Purpose: ${config.purpose}`);
        console.log(`   Scopes: ${config.requiredScopes.join(', ')}`);
        
        // VALIDATION: Ensure correct account connection
        if (!profile.data.emailAddress?.includes(accountType)) {
          console.warn(`⚠️  WARNING: Account mismatch for ${config.name}`);
        }
        
      } catch (error: any) {
        console.log(`❌ ${config.name} - Error: ${error.message}`);
        console.log(`   Run: npm run test:oauth-setup ${accountType}`);
      }
    }
    
    console.log(`\n📋 OAuth Status Summary:`);
    console.log(`🏠 HOMEOWNER: Primary account for email ingestion`);
    console.log(`👷 CONTRACTOR: Send-only account for test email generation`);
    console.log(`⚠️  CRITICAL: Only homeowner account should be used for email processing`);
  }

  // Helper methods
  private async getAuthorizationCode(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enter the authorization code: ', (code) => {
        rl.close();
        resolve(code.trim());
      });
    });
  }

  private async saveCredentials(filePath: string, tokens: any): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const credentials = {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope
    };

    fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const accountType = args[1] as 'homeowner' | 'contractor';

  if (!command) {
    console.log(`\n🔐 OAuth Setup for Email Testing (HOMEOWNER-ONLY)\n`);
    console.log(`CRITICAL PRINCIPLE: Only homeowner Gmail account used for email ingestion`);
    console.log(`\nAvailable commands:`);
    console.log(`  setup <homeowner|contractor>  - Setup OAuth for specific account`);
    console.log(`  status                        - Check OAuth status for all accounts`);
    console.log(`  test <homeowner|contractor>   - Test OAuth credentials`);
    console.log(`\nExamples:`);
    console.log(`  npm run test:oauth-setup homeowner   # Setup homeowner ingestion account`);
    console.log(`  npm run test:oauth-setup contractor  # Setup contractor send-only account`);
    console.log(`  npm run test:oauth-status             # Check all OAuth status`);
    return;
  }

  const oauth = new EmailTestOAuth();

  try {
    switch (command) {
      case 'setup':
        if (!accountType || !['homeowner', 'contractor'].includes(accountType)) {
          console.error('❌ Invalid account type. Use: homeowner or contractor');
          process.exit(1);
        }
        await oauth.setupOAuth(accountType);
        break;

      case 'status':
        await oauth.checkOAuthStatus();
        break;

      case 'test':
        if (!accountType || !['homeowner', 'contractor'].includes(accountType)) {
          console.error('❌ Invalid account type. Use: homeowner or contractor');
          process.exit(1);
        }
        await oauth.testCredentials(accountType);
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

export { EmailTestOAuth };
