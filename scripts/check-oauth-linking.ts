#!/usr/bin/env tsx

/**
 * Check OAuth Account Linking Status
 * 
 * This script checks if test accounts have proper OAuth account linking
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOAuthLinking() {
  console.log('🔍 Checking OAuth Account Linking Status...\n');
  
  try {
    // Check test accounts
    const testEmails = [
      'nailit.test.homeowner@gmail.com',
      'nailit.test.contractor@gmail.com'
    ];
    
    for (const email of testEmails) {
      console.log(`📧 Checking: ${email}`);
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: { 
          accounts: true,
          projects: true 
        }
      });
      
      if (!user) {
        console.log(`   ❌ User not found in database`);
        continue;
      }
      
      console.log(`   ✅ User exists: ID ${user.id}`);
      console.log(`   📊 Projects: ${user.projects.length}`);
      console.log(`   🔗 OAuth Accounts: ${user.accounts.length}`);
      
      if (user.accounts.length === 0) {
        console.log(`   ⚠️  NO OAUTH ACCOUNTS LINKED - This causes OAuthAccountNotLinked error`);
      } else {
        user.accounts.forEach((account, index) => {
          console.log(`   🔑 Account ${index + 1}: ${account.provider} (${account.providerAccountId})`);
        });
      }
      
      console.log('');
    }
    
    // Check all OAuth accounts
    console.log('🔗 All OAuth Accounts in Database:');
    const allAccounts = await prisma.account.findMany({
      include: { user: true }
    });
    
    if (allAccounts.length === 0) {
      console.log('   ❌ No OAuth accounts found in database');
    } else {
      allAccounts.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.provider} - ${account.user.email} (Provider ID: ${account.providerAccountId})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking OAuth linking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOAuthLinking().catch(console.error); 