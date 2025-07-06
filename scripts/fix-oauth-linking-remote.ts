#!/usr/bin/env tsx

/**
 * Fix OAuth Account Linking for App Runner Environment
 * 
 * This script connects to the App Runner environment database
 * and ensures test accounts have proper OAuth linking
 */

import { PrismaClient } from '@prisma/client';

// Use the development database URL (same as App Runner should use)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function fixOAuthLinkingRemote() {
  console.log('🔧 Fixing OAuth Account Linking for App Runner Environment...\n');
  console.log(`📊 Database: ${DATABASE_URL.includes('still-paper') ? 'Development' : 'Unknown'}\n`);
  
  try {
    // First, check current state
    console.log('🔍 Checking current OAuth linking status...');
    
    const testEmails = [
      'nailit.test.homeowner@gmail.com',
      'nailit.test.contractor@gmail.com'
    ];
    
    for (const email of testEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true }
      });
      
      if (user) {
        console.log(`📧 ${email}: User exists, ${user.accounts.length} OAuth accounts`);
      } else {
        console.log(`📧 ${email}: User does not exist`);
      }
    }
    
    console.log('\n🔧 Creating/updating test accounts...');
    
    // Create/update homeowner account
    const homeownerUser = await prisma.user.upsert({
      where: { email: 'nailit.test.homeowner@gmail.com' },
      update: {
        name: 'Test Homeowner',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      },
      create: {
        email: 'nailit.test.homeowner@gmail.com',
        name: 'Test Homeowner',
        image: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
      }
    });
    
    // Create/update contractor account
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
    
    console.log('✅ Test users created/updated');
    
    // Create OAuth account records
    console.log('\n🔗 Creating OAuth account linking...');
    
    // Homeowner OAuth account
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: 'homeowner-test-account-id'
        }
      },
      update: {
        userId: homeownerUser.id
      },
      create: {
        userId: homeownerUser.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'homeowner-test-account-id',
        access_token: 'test-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
        scope: 'openid email profile'
      }
    });
    
    // Contractor OAuth account
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: 'contractor-test-account-id'
        }
      },
      update: {
        userId: contractorUser.id
      },
      create: {
        userId: contractorUser.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'contractor-test-account-id',
        access_token: 'test-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
        scope: 'openid email profile'
      }
    });
    
    console.log('✅ OAuth account linking created');
    
    // Verify the fix
    console.log('\n🔍 Verifying OAuth linking...');
    
    for (const email of testEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true }
      });
      
      if (user && user.accounts.length > 0) {
        console.log(`✅ ${email}: OAuth linked successfully`);
      } else {
        console.log(`❌ ${email}: OAuth linking failed`);
      }
    }
    
    console.log('\n🎉 OAuth account linking fix complete!');
    console.log('📱 Try signing in to App Runner environment now.');
    
  } catch (error) {
    console.error('❌ Error fixing OAuth linking:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixOAuthLinkingRemote().catch(console.error); 