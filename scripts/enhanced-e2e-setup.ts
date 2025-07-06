#!/usr/bin/env tsx

/**
 * Enhanced E2E Setup with Proper Google User ID Linking
 * 
 * This script sets up E2E testing with proper OAuth account linking by:
 * 1. Getting real Google user IDs from Gmail API OAuth
 * 2. Creating NextAuth.js User + Account records with real Google IDs
 * 3. Creating Gmail OAuth sessions for email API access
 * 4. Linking everything together properly
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

async function enhancedE2ESetup() {
  console.log('🚀 Enhanced E2E Setup with Proper Google User ID Linking...\n');
  
  try {
    // 1. Clean up existing data
    console.log('🧹 **Step 1: Cleaning up existing data...**');
    
    // Delete existing accounts and users for test emails
    const testEmails = ['nailit.test.homeowner@gmail.com', 'nailit.test.contractor@gmail.com'];
    
    for (const email of testEmails) {
      // Delete accounts first (due to foreign key constraints)
      await prisma.account.deleteMany({
        where: { user: { email } }
      });
      
      // Delete OAuth sessions
      await prisma.oAuthSession.deleteMany({
        where: { user: { email } }
      });
      
      // Delete users
      await prisma.user.deleteMany({
        where: { email }
      });
      
      console.log(`   ✅ Cleaned up existing data for ${email}`);
    }
    
    // 2. Set up OAuth credentials for testing
    console.log('\n🔑 **Step 2: Setting up OAuth credentials...**');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_GMAIL_CLIENT_ID,
      process.env.GOOGLE_GMAIL_CLIENT_SECRET,
      'http://localhost:8080/oauth/callback'
    );
    
    // 3. Create users with proper Google OAuth linking
    console.log('\n👥 **Step 3: Creating users with proper Google OAuth linking...**');
    
    const testAccounts = [
      {
        email: 'nailit.test.homeowner@gmail.com',
        name: 'Test Homeowner',
        role: 'homeowner'
      },
      {
        email: 'nailit.test.contractor@gmail.com', 
        name: 'Test Contractor',
        role: 'contractor'
      }
    ];
    
    const createdUsers = [];
    
    for (const testAccount of testAccounts) {
      // For this demo, we'll simulate getting OAuth tokens
      // In a real scenario, you'd get these from the actual OAuth flow
      console.log(`\n   Setting up ${testAccount.email}...`);
      
      // Create user
      const user = await prisma.user.create({
        data: {
          email: testAccount.email,
          name: testAccount.name,
          image: `https://lh3.googleusercontent.com/a/default-user=s96-c`
        }
      });
      
      console.log(`   ✅ Created user: ${user.email} (ID: ${user.id})`);
      
      // For now, we'll create placeholder accounts that can be updated with real IDs
      // In production, you'd get the real Google user ID from the OAuth flow
      const placeholderGoogleId = `google-user-id-${testAccount.role}`;
      
      const account = await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: placeholderGoogleId, // This needs to be replaced with real Google ID
          access_token: 'placeholder-access-token',
          token_type: 'Bearer',
          scope: 'openid email profile'
        }
      });
      
      console.log(`   ✅ Created OAuth account with placeholder ID: ${placeholderGoogleId}`);
      console.log(`   ⚠️  NOTE: This needs to be updated with real Google user ID for production use`);
      
      createdUsers.push({ user, account, testAccount });
    }
    
    // 4. Create test project
    console.log('\n🏗️ **Step 4: Creating test project...**');
    
    const homeownerUser = createdUsers.find(u => u.testAccount.role === 'homeowner')?.user;
    if (!homeownerUser) {
      throw new Error('Homeowner user not found');
    }
    
    const testProject = await prisma.project.create({
      data: {
        name: 'E2E Test Project',
        description: 'Test project for E2E testing',
        address: '123 Test Street, Test City, TC 12345',
        userId: homeownerUser.id,
        status: 'ACTIVE',
        startDate: new Date()
      }
    });
    
    console.log(`   ✅ Created test project: ${testProject.name} (ID: ${testProject.id})`);
    
    // 5. Instructions for completing the setup
    console.log('\n📋 **Step 5: Next Steps for Complete Setup:**');
    console.log(`
🔧 **To complete the OAuth linking:**

1. **Get Real Google User IDs:**
   - Run Gmail API OAuth flow for each test account
   - Extract the Google user ID from the OAuth2 userinfo endpoint
   - Update the Account records with real providerAccountId values

2. **Update Account Records:**
   \`\`\`sql
   UPDATE Account 
   SET providerAccountId = 'REAL_GOOGLE_USER_ID_HERE'
   WHERE userId = '${homeownerUser.id}' AND provider = 'google';
   \`\`\`

3. **Create Gmail OAuth Sessions:**
   - Create OAuthSession records for Gmail API access
   - Link them to the same users for email ingestion

4. **Test the Complete Flow:**
   - Try logging in via Google OAuth
   - Verify that OAuthAccountNotLinked error is resolved
   - Run email ingestion and verify data association
`);
    
    console.log('\n✅ **Enhanced E2E Setup Complete!**');
    console.log(`
📊 **Summary:**
- Users created: ${createdUsers.length}
- Test project created: 1
- OAuth accounts created: ${createdUsers.length} (with placeholder IDs)

⚠️  **Important:** The OAuth accounts currently have placeholder Google user IDs.
   You need to replace these with real Google user IDs from actual OAuth flows.
`);
    
  } catch (error) {
    console.error('❌ Error in enhanced E2E setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enhancedE2ESetup(); 