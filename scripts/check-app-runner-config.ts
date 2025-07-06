#!/usr/bin/env tsx

/**
 * Check App Runner Configuration Mismatch
 * 
 * This script helps identify configuration differences between
 * local and App Runner environments that could cause OAuth issues
 */

console.log('🔍 OAuth Configuration Mismatch Analysis\n');

console.log('📊 **Local Environment Configuration**:');
console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID || 'NOT SET'}`);
console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '***SET***' : 'NOT SET'}`);
console.log('');

console.log('🎯 **Expected App Runner Configuration**:');
console.log('- NEXTAUTH_URL: https://u9eack5h4f.us-east-1.awsapprunner.com');
console.log('- GOOGLE_CLIENT_ID: 442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com');
console.log('- GOOGLE_CLIENT_SECRET: [should match local]');
console.log('');

console.log('🚨 **Potential Issues Identified**:');

// Check if local uses different client ID than expected
const localClientId = process.env.GOOGLE_CLIENT_ID;
const expectedClientId = '442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com';

if (localClientId && localClientId !== expectedClientId) {
  console.log('❌ **CLIENT ID MISMATCH**:');
  console.log(`   Local uses: ${localClientId}`);
  console.log(`   Expected:   ${expectedClientId}`);
  console.log('   This suggests App Runner might be using different OAuth credentials!');
  console.log('');
}

// Check NEXTAUTH_URL
const localNextAuthUrl = process.env.NEXTAUTH_URL;
if (localNextAuthUrl && localNextAuthUrl !== 'https://u9eack5h4f.us-east-1.awsapprunner.com') {
  console.log('❌ **NEXTAUTH_URL MISMATCH**:');
  console.log(`   Local uses: ${localNextAuthUrl}`);
  console.log(`   App Runner should use: https://u9eack5h4f.us-east-1.awsapprunner.com`);
  console.log('');
}

console.log('🔧 **Action Items**:');
console.log('');
console.log('1. **Verify App Runner Environment Variables**:');
console.log('   - Go to AWS App Runner Console');
console.log('   - Find service: nailit-dev');
console.log('   - Go to Configuration → Environment variables');
console.log('   - Ensure GOOGLE_CLIENT_ID matches what you expect');
console.log('   - Ensure NEXTAUTH_URL is set to App Runner URL');
console.log('');

console.log('2. **Check Google Cloud Console OAuth Configuration**:');
console.log('   - Go to: https://console.cloud.google.com/apis/credentials');
console.log('   - Find the OAuth client being used by App Runner');
console.log('   - Verify it has the correct redirect URI:');
console.log('     https://u9eack5h4f.us-east-1.awsapprunner.com/api/auth/callback/google');
console.log('');

console.log('3. **Possible Root Causes**:');
console.log('   - App Runner using different OAuth client than local');
console.log('   - App Runner missing NEXTAUTH_URL environment variable');
console.log('   - Google Cloud Console missing App Runner redirect URI');
console.log('   - Environment variable not properly set in App Runner');
console.log('');

console.log('💡 **Quick Test**:');
console.log('Visit: https://u9eack5h4f.us-east-1.awsapprunner.com/api/auth/providers');
console.log('This should show the OAuth configuration being used by App Runner.'); 