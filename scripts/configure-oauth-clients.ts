#!/usr/bin/env tsx

/**
 * OAuth Clients Configuration Script
 * 
 * This script helps you configure the two separate OAuth clients:
 * 1. Authentication OAuth (NextAuth) - For web app login
 * 2. Gmail API OAuth - For email access
 */

function configureOAuthClients() {
  console.log('🔐 OAuth Clients Configuration');
  console.log('===============================\n');

  console.log('📋 Current Issue:');
  console.log('   You have the SAME client ID/secret for both OAuth purposes:');
  console.log('   • GOOGLE_CLIENT_ID = GMAIL_TEST_CLIENT_ID (same!)');
  console.log('   • GOOGLE_CLIENT_SECRET = GMAIL_TEST_CLIENT_SECRET (same!)');
  console.log('   This causes redirect URI conflicts!\n');

  console.log('✅ You mentioned you already have TWO separate OAuth clients in GCP.');
  console.log('   Let\'s configure them properly.\n');

  console.log('🔧 Step 1: Identify Your Two OAuth Clients');
  console.log('==========================================');
  
  console.log('\n1️⃣ Authentication OAuth Client (for NextAuth):');
  console.log('   Purpose: User signs in to web/mobile app');
  console.log('   Redirect URI: http://localhost:3000/api/auth/callback/google');
  console.log('   Scopes: openid, email, profile');
  console.log('   Current env var: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
  
  console.log('\n2️⃣ Gmail API OAuth Client (for email access):');
  console.log('   Purpose: Access user\'s Gmail for email processing');
  console.log('   Redirect URI: http://localhost:3000/api/email/oauth/gmail/callback');
  console.log('   Scopes: gmail.readonly');
  console.log('   Current env var: GMAIL_TEST_CLIENT_ID / GMAIL_TEST_CLIENT_SECRET');

  console.log('\n🔧 Step 2: Update Environment Variables');
  console.log('======================================');
  
  console.log('\nRename and separate your environment variables:');
  
  const envTemplate = `
# Authentication OAuth (NextAuth) - For web app login
GOOGLE_AUTH_CLIENT_ID=your-auth-oauth-client-id-here
GOOGLE_AUTH_CLIENT_SECRET=your-auth-oauth-client-secret-here

# Gmail API OAuth - For email access  
GOOGLE_GMAIL_CLIENT_ID=your-gmail-oauth-client-id-here
GOOGLE_GMAIL_CLIENT_SECRET=your-gmail-oauth-client-secret-here

# Legacy variables (for backward compatibility with NextAuth)
GOOGLE_CLIENT_ID=your-auth-oauth-client-id-here
GOOGLE_CLIENT_SECRET=your-auth-oauth-client-secret-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here
`;

  console.log(envTemplate);

  console.log('\n🔧 Step 3: Verify Your GCP OAuth Clients');
  console.log('========================================');
  
  console.log('\nGo to Google Cloud Console > APIs & Credentials > OAuth 2.0 Client IDs');
  console.log('\nCheck that you have TWO separate clients with these redirect URIs:');
  
  console.log('\n📱 Client 1 (Authentication):');
  console.log('   Name: Something like "Nailit Authentication" or "Nailit Web App"');
  console.log('   Redirect URIs:');
  console.log('     • http://localhost:3000/api/auth/callback/google');
  console.log('     • https://your-domain.com/api/auth/callback/google');
  
  console.log('\n📧 Client 2 (Gmail API):');
  console.log('   Name: Something like "Nailit Gmail API" or "Nailit Email Access"');
  console.log('   Redirect URIs:');
  console.log('     • http://localhost:3000/api/email/oauth/gmail/callback');
  console.log('     • https://your-domain.com/api/email/oauth/gmail/callback');

  console.log('\n🔧 Step 4: Update Code References');
  console.log('=================================');
  
  console.log('\nUpdate code to use the new environment variable names:');
  console.log('   • NextAuth: Use GOOGLE_AUTH_CLIENT_ID (or keep GOOGLE_CLIENT_ID)');
  console.log('   • Gmail API: Use GOOGLE_GMAIL_CLIENT_ID (rename from GMAIL_TEST_CLIENT_ID)');

  console.log('\n🎯 Step 5: Test Both OAuth Flows');
  console.log('================================');
  
  console.log('\n1. Test Authentication OAuth:');
  console.log('   • Go to /auth/signin');
  console.log('   • Click "Sign in with Google"');
  console.log('   • Should redirect to Google OAuth');
  console.log('   • Should redirect back to /api/auth/callback/google');
  console.log('   • Should sign you in to the web app');
  
  console.log('\n2. Test Gmail API OAuth (when implemented):');
  console.log('   • Go to Gmail connection page');
  console.log('   • Click "Connect Gmail"');
  console.log('   • Should redirect to Google OAuth (different client)');
  console.log('   • Should redirect back to /api/email/oauth/gmail/callback');
  console.log('   • Should grant Gmail access permissions');

  console.log('\n🚀 Benefits of This Setup');
  console.log('=========================');
  console.log('✅ No more redirect URI conflicts');
  console.log('✅ Clean separation of authentication vs API access');
  console.log('✅ Different permission scopes for different purposes');
  console.log('✅ Users can authenticate with Google but use other email providers');
  console.log('✅ Users can authenticate with other providers but use Gmail');
  console.log('✅ Better security (principle of least privilege)');

  console.log('\n📋 Action Items');
  console.log('===============');
  console.log('1. [ ] Verify you have TWO separate OAuth clients in GCP');
  console.log('2. [ ] Get client ID/secret from BOTH OAuth clients');
  console.log('3. [ ] Update .env.local with separate variables');
  console.log('4. [ ] Test authentication OAuth (web app login)');
  console.log('5. [ ] Test Gmail API OAuth (when connecting Gmail)');
}

if (require.main === module) {
  configureOAuthClients();
}

export { configureOAuthClients }; 