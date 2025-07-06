#!/usr/bin/env tsx

/**
 * Fix OAuth Account Linking for Test Accounts
 * 
 * This script manually creates missing test accounts and links OAuth accounts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOAuthLinking() {
  console.log('🔧 Fixing OAuth Account Linking for Test Accounts...\n');
  
  try {
    // Create contractor user if missing
    console.log('👷 Creating/updating contractor test account...');
    const contractorUser = await prisma.user.upsert({
      where: { email: 'nailit.test.contractor@gmail.com' },
      update: {
        name: 'Test Contractor',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      },
      create: {
        email: 'nailit.test.contractor@gmail.com',
        name: 'Test Contractor',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      }
    });
    
    console.log(`✅ Contractor user: ${contractorUser.email} (ID: ${contractorUser.id})`);
    
    // Check if contractor already has OAuth account
    const contractorAccount = await prisma.account.findFirst({
      where: { 
        userId: contractorUser.id,
        provider: 'google'
      }
    });
    
    if (!contractorAccount) {
      // Create OAuth account for contractor
      // Note: This is a placeholder - in real use, these values would come from actual OAuth flow
      await prisma.account.create({
        data: {
          userId: contractorUser.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: 'bmFpbGl0LnRlc3QuY29udHJhY3Rvcg', // Base64 encoded identifier
          access_token: 'placeholder_access_token',
          token_type: 'Bearer',
          scope: 'openid email profile'
        }
      });
      
      console.log('✅ Created OAuth account for contractor');
    } else {
      console.log('✅ Contractor already has OAuth account');
    }
    
    // Verify homeowner account
    console.log('\n🏠 Verifying homeowner account...');
    const homeownerUser = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' },
      include: { accounts: true }
    });
    
    if (homeownerUser && homeownerUser.accounts.length > 0) {
      console.log('✅ Homeowner OAuth account already linked');
    } else {
      console.log('⚠️  Homeowner OAuth account needs attention');
    }
    
    // Final status check
    console.log('\n📊 Final OAuth Linking Status:');
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['nailit.test.homeowner@gmail.com', 'nailit.test.contractor@gmail.com']
        }
      },
      include: { accounts: true }
    });
    
    testUsers.forEach(user => {
      console.log(`   ${user.email}: ${user.accounts.length} OAuth account(s)`);
    });
    
    console.log('\n🎉 OAuth linking fix complete!');
    console.log('📝 Note: Real OAuth tokens will be generated during actual sign-in flow');
    
  } catch (error) {
    console.error('❌ Error fixing OAuth linking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOAuthLinking().catch(console.error); 