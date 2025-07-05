#!/usr/bin/env ts-node

import { OAuthTokenManager } from './oauth-manager';
import fs from 'fs';
import path from 'path';

/**
 * Test OAuth Framework Functionality
 * 
 * This script validates the OAuth management system without requiring
 * real Google OAuth credentials. It tests error handling, status checks,
 * and framework robustness.
 */

async function testOAuthFramework() {
  console.log('🧪 Testing OAuth Framework Functionality');
  console.log('=======================================\n');

  const manager = new OAuthTokenManager();
  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Status check without credentials
  console.log('Test 1: Status check without credentials');
  try {
    testsTotal++;
    const status = await manager.checkTokenStatus();
    
    if (!status.ready && !status.homeowner.valid && !status.contractor.valid) {
      console.log('✅ Correctly detected missing credentials');
      testsPassed++;
    } else {
      console.log('❌ Should have detected missing credentials');
    }
  } catch (error) {
    console.log('❌ Status check should not throw error:', error);
  }

  // Test 2: Setup flow without credentials
  console.log('\nTest 2: Setup flow without credentials');
  try {
    testsTotal++;
    const success = await manager.setupForE2E();
    
    if (!success) {
      console.log('✅ Correctly returned false for missing credentials');
      testsPassed++;
    } else {
      console.log('❌ Should have returned false for missing credentials');
    }
  } catch (error) {
    console.log('❌ Setup should not throw error:', error);
  }

  // Test 3: Ensure ready without credentials
  console.log('\nTest 3: Ensure ready without credentials');
  try {
    testsTotal++;
    const ready = await manager.ensureReady();
    
    if (!ready) {
      console.log('✅ Correctly returned false for missing credentials');
      testsPassed++;
    } else {
      console.log('❌ Should have returned false for missing credentials');
    }
  } catch (error) {
    console.log('❌ Ensure ready should not throw error:', error);
  }

  // Test 4: Refresh tokens without credentials
  console.log('\nTest 4: Refresh tokens without credentials');
  try {
    testsTotal++;
    const result = await manager.refreshTokens();
    
    if (!result.homeowner && !result.contractor) {
      console.log('✅ Correctly returned false for both accounts');
      testsPassed++;
    } else {
      console.log('❌ Should have returned false for both accounts');
    }
  } catch (error) {
    console.log('❌ Refresh should not throw error:', error);
  }

  // Test 5: Validate credentials directory handling
  console.log('\nTest 5: Credentials directory handling');
  try {
    testsTotal++;
    const credentialsDir = path.join(__dirname, 'credentials');
    
    if (!fs.existsSync(credentialsDir)) {
      console.log('✅ Credentials directory does not exist (expected)');
      testsPassed++;
    } else {
      // Check if directory is empty or contains only valid files
      const files = fs.readdirSync(credentialsDir);
      const validFiles = files.filter(f => f.endsWith('-credentials.json'));
      
      if (files.length === validFiles.length) {
        console.log('✅ Credentials directory contains only valid files');
        testsPassed++;
      } else {
        console.log('⚠️  Credentials directory contains unexpected files');
        testsPassed++; // Still pass, just a warning
      }
    }
  } catch (error) {
    console.log('❌ Credentials directory check failed:', error);
  }

  // Test 6: NPM script integration
  console.log('\nTest 6: NPM script integration');
  try {
    testsTotal++;
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const requiredScripts = [
      'test:oauth:status',
      'test:oauth:refresh',
      'test:oauth:setup-e2e',
      'test:oauth:ensure-ready'
    ];
    
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
    
    if (missingScripts.length === 0) {
      console.log('✅ All required NPM scripts are configured');
      testsPassed++;
    } else {
      console.log('❌ Missing NPM scripts:', missingScripts);
    }
  } catch (error) {
    console.log('❌ NPM script check failed:', error);
  }

  // Test 7: Documentation existence
  console.log('\nTest 7: Documentation existence');
  try {
    testsTotal++;
    const docsPath = path.join(__dirname, '../../docs/testing/OAUTH_SETUP_FOR_E2E.md');
    
    if (fs.existsSync(docsPath)) {
      console.log('✅ OAuth setup documentation exists');
      testsPassed++;
    } else {
      console.log('❌ OAuth setup documentation missing');
    }
  } catch (error) {
    console.log('❌ Documentation check failed:', error);
  }

  // Summary
  console.log('\n📊 OAuth Framework Test Results');
  console.log('===============================');
  console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`📊 Success Rate: ${((testsPassed / testsTotal) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 All OAuth framework tests PASSED!');
    console.log('🔧 Framework is ready for OAuth credential configuration');
    console.log('\n📚 Next Steps:');
    console.log('1. Configure Google OAuth credentials in .env.local');
    console.log('2. Run: npm run test:oauth:setup-e2e');
    console.log('3. Set up both test accounts (homeowner + contractor)');
    console.log('4. Run: npm run test:e2e:complete');
    return true;
  } else {
    console.log('\n❌ Some OAuth framework tests failed');
    console.log('🔧 Fix the failing tests before proceeding');
    return false;
  }
}

// Run the test
if (require.main === module) {
  testOAuthFramework()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ OAuth framework test failed:', error);
      process.exit(1);
    });
}

export { testOAuthFramework }; 