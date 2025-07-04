const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function verifyAccount(accountType) {
  try {
    console.log(`\n🔍 Verifying ${accountType} account...`);
    
    // Load credentials
    const credentialsPath = path.join(__dirname, 'scripts/email-testing/credentials', `${accountType}-credentials.json`);
    
    if (!fs.existsSync(credentialsPath)) {
      console.log(`❌ No credentials found for ${accountType}`);
      return false;
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log(`📁 Credentials file found: ${credentialsPath}`);
    
    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_TEST_CLIENT_ID,
      process.env.GMAIL_TEST_CLIENT_SECRET,
      'http://localhost:3001/auth/gmail/callback'
    );
    
    oauth2Client.setCredentials({
      refresh_token: credentials.refresh_token,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    });
    
    // Test Gmail API access
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    const actualEmail = profile.data.emailAddress;
    const expectedEmail = accountType === 'contractor' 
      ? 'nailit.test.contractor@gmail.com'
      : 'nailit.test.homeowner@gmail.com';
    
    console.log(`📧 Expected: ${expectedEmail}`);
    console.log(`📧 Actual:   ${actualEmail}`);
    
    if (actualEmail === expectedEmail) {
      console.log(`✅ ${accountType} OAuth token is correctly mapped!`);
      console.log(`📊 Messages: ${profile.data.messagesTotal}`);
      console.log(`📈 Threads: ${profile.data.threadsTotal}`);
      return true;
    } else {
      console.log(`❌ ${accountType} OAuth token is mapped to wrong account!`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ${accountType} verification failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔐 OAuth Token Verification\n');
  
  console.log('Environment check:');
  console.log(`GMAIL_TEST_CLIENT_ID: ${process.env.GMAIL_TEST_CLIENT_ID}`);
  console.log(`GMAIL_TEST_CLIENT_SECRET: ${process.env.GMAIL_TEST_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
  
  const contractorValid = await verifyAccount('contractor');
  const homeownerValid = await verifyAccount('homeowner');
  
  console.log('\n📋 Summary:');
  console.log(`Contractor: ${contractorValid ? '✅ Valid' : '❌ Invalid'}`);
  console.log(`Homeowner:  ${homeownerValid ? '✅ Valid' : '❌ Invalid'}`);
  
  if (contractorValid && homeownerValid) {
    console.log('\n🎉 All OAuth tokens are correctly configured!');
    console.log('Ready to send test emails from contractor to homeowner.');
  } else {
    console.log('\n⚠️  OAuth token issues detected. May need to re-authenticate.');
  }
}

main().catch(console.error);
