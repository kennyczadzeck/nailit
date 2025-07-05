#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

interface TokenInfo {
  valid: boolean;
  expired: boolean;
  expiresIn: number;
  scopes: string[];
  email?: string;
  lastRefreshed?: Date;
}

class OAuthTokenManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private credentialsConfigured: boolean;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';
    this.credentialsConfigured = !!(this.clientId && this.clientSecret);
  }

  /**
   * Check if OAuth tokens exist and are valid for both test accounts
   */
  async checkTokenStatus(): Promise<{ homeowner: TokenInfo; contractor: TokenInfo; ready: boolean }> {
    console.log('🔍 Checking OAuth token status for E2E testing...\n');

    if (!this.credentialsConfigured) {
      console.log('❌ Google OAuth credentials not configured in environment variables\n');
      this.showCredentialsSetupInstructions();
      
      return {
        homeowner: { valid: false, expired: false, expiresIn: 0, scopes: [] },
        contractor: { valid: false, expired: false, expiresIn: 0, scopes: [] },
        ready: false
      };
    }

    const homeownerStatus = await this.getTokenInfo('homeowner');
    const contractorStatus = await this.getTokenInfo('contractor');

    console.log('📊 Token Status Summary:');
    console.log(`🏠 Homeowner: ${homeownerStatus.valid ? '✅ Valid' : '❌ Invalid'} ${homeownerStatus.expired ? '(Expired)' : ''}`);
    console.log(`👷 Contractor: ${contractorStatus.valid ? '✅ Valid' : '❌ Invalid'} ${contractorStatus.expired ? '(Expired)' : ''}`);

    const ready = homeownerStatus.valid && contractorStatus.valid;
    console.log(`\n🎯 E2E Testing Ready: ${ready ? '✅ YES' : '❌ NO'}`);

    if (!ready) {
      console.log('\n🔧 Required Actions:');
      if (!homeownerStatus.valid) {
        console.log(`   🏠 Homeowner: ${this.getActionMessage(homeownerStatus)}`);
      }
      if (!contractorStatus.valid) {
        console.log(`   👷 Contractor: ${this.getActionMessage(contractorStatus)}`);
      }
    }

    return {
      homeowner: homeownerStatus,
      contractor: contractorStatus,
      ready
    };
  }

  /**
   * Complete OAuth setup flow for E2E testing
   */
  async setupForE2E(): Promise<boolean> {
    console.log('🚀 Setting up OAuth for E2E testing...\n');

    if (!this.credentialsConfigured) {
      console.log('❌ Google OAuth credentials not configured!\n');
      this.showCredentialsSetupInstructions();
      return false;
    }

    try {
      // Import the EmailTestOAuth class only if credentials are configured
      const { EmailTestOAuth } = await import('./oauth-setup');
      const oauth = new EmailTestOAuth();

      // Check current status
      const status = await this.checkTokenStatus();

      if (status.ready) {
        console.log('✅ OAuth already configured and ready for E2E testing!');
        return true;
      }

      // Try to refresh expired tokens first
      if (status.homeowner.expired || status.contractor.expired) {
        console.log('🔄 Attempting to refresh expired tokens...');
        const refreshResults = await this.refreshTokens();
        
        if (refreshResults.homeowner && refreshResults.contractor) {
          console.log('✅ Token refresh successful! E2E testing ready.');
          return true;
        }
      }

      // If refresh failed or tokens don't exist, guide user through setup
      console.log('\n🔧 OAuth setup required. Follow these steps:\n');

      if (!status.homeowner.valid) {
        console.log('1️⃣ Set up Homeowner OAuth (Primary ingestion account):');
        console.log('   npm run test:oauth-setup homeowner');
        console.log('   📧 Use: nailit.test.homeowner@gmail.com\n');
      }

      if (!status.contractor.valid) {
        console.log('2️⃣ Set up Contractor OAuth (Send-only account):');
        console.log('   npm run test:oauth-setup contractor');
        console.log('   📧 Use: nailit.test.contractor@gmail.com\n');
      }

      console.log('3️⃣ Verify setup:');
      console.log('   npm run test:oauth:status\n');

      console.log('4️⃣ Run E2E test:');
      console.log('   npm run test:e2e:complete\n');

      return false;

    } catch (error) {
      console.error('❌ OAuth setup failed:', error);
      return false;
    }
  }

  /**
   * Ensure OAuth is ready for E2E testing (refresh if needed)
   */
  async ensureReady(): Promise<boolean> {
    console.log('🔍 Ensuring OAuth is ready for E2E testing...');

    if (!this.credentialsConfigured) {
      console.log('❌ Google OAuth credentials not configured in environment variables');
      return false;
    }

    try {
      const status = await this.checkTokenStatus();

      if (status.ready) {
        console.log('✅ OAuth ready for E2E testing!');
        return true;
      }

      // Try to refresh tokens
      if (status.homeowner.expired || status.contractor.expired) {
        console.log('🔄 Refreshing expired tokens...');
        const refreshResults = await this.refreshTokens();
        
        if (refreshResults.homeowner && refreshResults.contractor) {
          console.log('✅ Tokens refreshed successfully!');
          return true;
        }
      }

      console.log('❌ OAuth not ready. Run: npm run test:oauth:setup-e2e');
      return false;

    } catch (error) {
      console.error('❌ OAuth check failed:', error);
      return false;
    }
  }

  /**
   * Automatically refresh expired tokens for both accounts
   */
  async refreshTokens(): Promise<{ homeowner: boolean; contractor: boolean }> {
    console.log('🔄 Refreshing OAuth tokens...\n');

    if (!this.credentialsConfigured) {
      console.log('❌ Cannot refresh tokens: OAuth credentials not configured');
      return { homeowner: false, contractor: false };
    }

    const results = {
      homeowner: await this.refreshAccountToken('homeowner'),
      contractor: await this.refreshAccountToken('contractor')
    };

    console.log('\n📊 Token Refresh Results:');
    console.log(`🏠 Homeowner: ${results.homeowner ? '✅ Refreshed' : '❌ Failed'}`);
    console.log(`👷 Contractor: ${results.contractor ? '✅ Refreshed' : '❌ Failed'}`);

    const allSuccess = results.homeowner && results.contractor;
    console.log(`\n🎯 All Tokens Refreshed: ${allSuccess ? '✅ YES' : '❌ NO'}`);

    return results;
  }

  // Private helper methods

  private showCredentialsSetupInstructions(): void {
    console.log('🔧 Google OAuth Credentials Setup Required\n');
    console.log('Follow these steps to configure OAuth for E2E testing:\n');
    
    console.log('1️⃣ Google Cloud Console Setup:');
    console.log('   • Go to https://console.cloud.google.com/');
    console.log('   • Navigate to APIs & Services > Credentials');
    console.log('   • Create OAuth client ID (Web application)');
    console.log('   • Add redirect URI: http://localhost:3000/api/auth/callback/google');
    console.log('   • Enable Gmail API in APIs & Services > Library\n');
    
    console.log('2️⃣ Environment Variables:');
    console.log('   Add these to your .env.local file:');
    console.log('   GOOGLE_CLIENT_ID=your_client_id_here');
    console.log('   GOOGLE_CLIENT_SECRET=your_client_secret_here\n');
    
    console.log('3️⃣ Complete Setup:');
    console.log('   npm run test:oauth:setup-e2e\n');
    
    console.log('📚 For detailed instructions, see:');
    console.log('   docs/testing/OAUTH_SETUP_FOR_E2E.md\n');
  }

  private async getTokenInfo(accountType: 'homeowner' | 'contractor'): Promise<TokenInfo> {
    const credentialsFile = accountType === 'homeowner' ? 'homeowner-credentials.json' : 'contractor-credentials.json';
    const credentialsPath = path.join(__dirname, 'credentials', credentialsFile);

    if (!fs.existsSync(credentialsPath)) {
      return {
        valid: false,
        expired: false,
        expiresIn: 0,
        scopes: []
      };
    }

    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      if (!credentials.refresh_token) {
        return {
          valid: false,
          expired: false,
          expiresIn: 0,
          scopes: credentials.scope ? credentials.scope.split(' ') : []
        };
      }

      const now = Date.now();
      const expiryDate = credentials.expiry_date || 0;
      const expired = expiryDate <= now;
      const expiresIn = Math.max(0, expiryDate - now);

      // Test the token by making an API call
      let email: string | undefined;
      let valid = false;

      try {
        const oauth2Client = new google.auth.OAuth2(
          this.clientId,
          this.clientSecret,
          this.redirectUri
        );
        oauth2Client.setCredentials(credentials);

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        email = profile.data.emailAddress;
        valid = true;
      } catch (error) {
        valid = false;
      }

      return {
        valid,
        expired,
        expiresIn,
        scopes: credentials.scope ? credentials.scope.split(' ') : [],
        email,
        lastRefreshed: credentials.last_refreshed ? new Date(credentials.last_refreshed) : undefined
      };

    } catch (error) {
      return {
        valid: false,
        expired: false,
        expiresIn: 0,
        scopes: []
      };
    }
  }

  private async refreshAccountToken(accountType: 'homeowner' | 'contractor'): Promise<boolean> {
    const credentialsFile = accountType === 'homeowner' ? 'homeowner-credentials.json' : 'contractor-credentials.json';
    const credentialsPath = path.join(__dirname, 'credentials', credentialsFile);

    if (!fs.existsSync(credentialsPath)) {
      console.log(`❌ No credentials found for ${accountType}`);
      return false;
    }

    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      if (!credentials.refresh_token) {
        console.log(`❌ No refresh token for ${accountType}`);
        return false;
      }

      const oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        this.redirectUri
      );

      oauth2Client.setCredentials(credentials);

      // Refresh the token
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();

      // Save updated credentials
      const updatedCredentials = {
        ...credentials,
        access_token: newCredentials.access_token,
        expiry_date: newCredentials.expiry_date,
        last_refreshed: new Date().toISOString()
      };

      fs.writeFileSync(credentialsPath, JSON.stringify(updatedCredentials, null, 2));
      console.log(`✅ Refreshed token for ${accountType}`);
      return true;

    } catch (error) {
      console.log(`❌ Failed to refresh token for ${accountType}:`, error);
      return false;
    }
  }

  private getActionMessage(tokenInfo: TokenInfo): string {
    if (!tokenInfo.valid && tokenInfo.scopes.length === 0) {
      return 'Run OAuth setup (no credentials found)';
    } else if (tokenInfo.expired) {
      return 'Token expired (will attempt refresh)';
    } else if (!tokenInfo.valid) {
      return 'Token invalid (re-run OAuth setup)';
    }
    return 'Unknown issue';
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('\n🔐 OAuth Token Manager for E2E Testing\n');
    console.log('Available commands:');
    console.log('  status           - Check OAuth token status');
    console.log('  refresh          - Refresh expired tokens');
    console.log('  setup-e2e        - Complete OAuth setup for E2E testing');
    console.log('  ensure-ready     - Ensure OAuth is ready (refresh if needed)');
    console.log('\nExamples:');
    console.log('  npm run test:oauth:status');
    console.log('  npm run test:oauth:refresh');
    console.log('  npm run test:oauth:setup-e2e');
    console.log('  npm run test:oauth:ensure-ready');
    return;
  }

  const manager = new OAuthTokenManager();

  try {
    switch (command) {
      case 'status':
        await manager.checkTokenStatus();
        break;

      case 'refresh':
        await manager.refreshTokens();
        break;

      case 'setup-e2e':
        const success = await manager.setupForE2E();
        process.exit(success ? 0 : 1);
        break;

      case 'ensure-ready':
        const ready = await manager.ensureReady();
        process.exit(ready ? 0 : 1);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { OAuthTokenManager }; 