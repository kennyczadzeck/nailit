#!/usr/bin/env tsx

/**
 * Email Testing Runner
 * Usage: npx tsx tests/integration/run-email-tests.ts [db|real|both] [homeowner@email.com] [contractor@email.com]
 */

import { 
  setupTestEnvironment, 
  verifyTestSetup, 
  cleanupTestData, 
  updateTestAccounts,
  testAccounts 
} from './email-test-setup';

async function main() {
  const args = process.argv.slice(2);
  const approach = (args[0] as 'db' | 'real' | 'both') || 'db';
  const homeownerEmail = args[1];
  const contractorEmail = args[2];

  console.log('🚀 Email Testing Runner\n');

  // Update test accounts if provided
  if (homeownerEmail && contractorEmail) {
    updateTestAccounts(homeownerEmail, contractorEmail);
  } else {
    console.log('Using default test accounts:');
    console.log(`  Homeowner: ${testAccounts.homeowner.email}`);
    console.log(`  Contractor: ${testAccounts.contractor.email}`);
    console.log('\nTo use your actual test accounts, run:');
    console.log('npx tsx tests/integration/run-email-tests.ts db your-homeowner@email.com your-contractor@email.com\n');
  }

  try {
    // Step 1: Verify setup
    console.log('Step 1: Verifying test setup...');
    const checks = await verifyTestSetup();
    console.log('Verification results:', checks);
    console.log('');

    // Step 2: Clean any existing test data
    console.log('Step 2: Cleaning existing test data...');
    await cleanupTestData();
    console.log('');

    // Step 3: Setup test environment
    console.log(`Step 3: Setting up test environment (${approach})...`);
    const results = await setupTestEnvironment(approach);
    console.log('Setup results:', results);
    console.log('');

    // Step 4: Provide next steps
    console.log('🎉 Test setup complete!\n');
    
    if (approach === 'db' || approach === 'both') {
      console.log('✅ Historical emails loaded into database');
      console.log('   - Run your email ingestion tests');
      console.log('   - Check the timeline view');
      console.log('   - Test AI classification\n');
    }

    if (approach === 'real' || approach === 'both') {
      console.log('📧 To test real email ingestion:');
      console.log(`   1. Send emails from ${testAccounts.contractor.email}`);
      console.log(`   2. To ${testAccounts.homeowner.email}`);
      console.log('   3. Wait for webhook processing');
      console.log('   4. Check database for new emails\n');
    }

    console.log('🧹 To cleanup test data:');
    console.log('   npx tsx -e "import { cleanupTestData } from \'./tests/integration/email-test-setup\'; cleanupTestData()"\n');

  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🧹 Cleaning up test data before exit...');
  try {
    await cleanupTestData();
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
  process.exit(0);
});

main().catch(console.error); 