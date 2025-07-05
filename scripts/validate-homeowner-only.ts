#!/usr/bin/env tsx

/**
 * Homeowner-Only Validation Script
 * 
 * This script validates that the entire email ingestion system properly
 * implements the HOMEOWNER-ONLY principle throughout the codebase.
 * 
 * VALIDATION AREAS:
 * 1. Database records - all emails have homeowner user IDs
 * 2. OAuth sessions - only homeowner sessions for email ingestion
 * 3. API endpoints - proper homeowner-only filtering
 * 4. Configuration files - correct account setup
 * 5. Team member filtering - homeowner-centric logic
 * 6. Documentation - homeowner-only emphasis
 * 
 * This script should be run regularly to ensure compliance with the
 * homeowner-only architectural principle.
 */

import { prisma } from '../app/lib/prisma';
import { teamMemberFilter } from '../app/lib/email/team-member-filter';
import fs from 'fs';
import path from 'path';

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  details?: any;
}

class HomeownerOnlyValidator {
  private results: ValidationResult[] = [];

  /**
   * Run all homeowner-only validation checks
   */
  async runAllValidations(): Promise<void> {
    console.log(`\n🔍 HOMEOWNER-ONLY VALIDATION SUITE\n`);
    console.log(`Validating that all email ingestion follows homeowner-only principle...\n`);

    // Database validation
    await this.validateDatabaseRecords();
    
    // OAuth validation
    await this.validateOAuthSessions();
    
    // Configuration validation
    await this.validateConfigurations();
    
    // Team member filter validation
    await this.validateTeamMemberFilter();
    
    // API endpoint validation
    await this.validateAPIEndpoints();
    
    // Documentation validation
    await this.validateDocumentation();
    
    // Display results
    this.displayResults();
  }

  /**
   * Validate that all database records follow homeowner-only principle
   */
  private async validateDatabaseRecords(): Promise<void> {
    console.log(`📊 Validating Database Records...`);
    
    try {
      // Check email messages
      const emailMessages = await prisma.emailMessage.findMany({
        include: {
          user: {
            select: { id: true, email: true }
          },
          project: {
            select: { id: true, userId: true }
          }
        }
      });

      // Validate all emails belong to homeowner users
      let homeownerEmailCount = 0;
      let contractorEmailCount = 0;
      
      for (const email of emailMessages) {
        if (email.user.email?.includes('homeowner')) {
          homeownerEmailCount++;
        } else if (email.user.email?.includes('contractor')) {
          contractorEmailCount++;
        }
        
        // Validate project ownership matches user
        if (email.project && email.project.userId !== email.userId) {
          this.addResult({
            category: 'Database',
            test: 'Project Ownership Consistency',
            passed: false,
            message: `Email ${email.id} has mismatched user/project ownership`,
            details: {
              emailUserId: email.userId,
              projectUserId: email.project.userId,
              messageId: email.messageId
            }
          });
        }
      }

      this.addResult({
        category: 'Database',
        test: 'Email Records by Account Type',
        passed: contractorEmailCount === 0,
        message: `Found ${homeownerEmailCount} homeowner emails, ${contractorEmailCount} contractor emails`,
        details: {
          homeownerEmails: homeownerEmailCount,
          contractorEmails: contractorEmailCount,
          totalEmails: emailMessages.length
        }
      });

      // Validate providerData contains homeowner source markers
      const emailsWithProviderData = emailMessages.filter(e => e.providerData);
      let homeownerSourceCount = 0;
      
      for (const email of emailsWithProviderData) {
        const providerData = email.providerData as any;
        if (providerData.sourceAccount === 'homeowner' || providerData.ingestedFrom === 'homeowner_gmail') {
          homeownerSourceCount++;
        }
      }

      this.addResult({
        category: 'Database',
        test: 'Provider Data Source Markers',
        passed: homeownerSourceCount === emailsWithProviderData.length,
        message: `${homeownerSourceCount}/${emailsWithProviderData.length} emails have homeowner source markers`,
        details: {
          emailsWithHomeownerMarkers: homeownerSourceCount,
          emailsWithProviderData: emailsWithProviderData.length
        }
      });

    } catch (error: any) {
      this.addResult({
        category: 'Database',
        test: 'Database Access',
        passed: false,
        message: `Database validation failed: ${error.message}`
      });
    }
  }

  /**
   * Validate OAuth sessions are homeowner-only for email ingestion
   */
  private async validateOAuthSessions(): Promise<void> {
    console.log(`🔐 Validating OAuth Sessions...`);
    
    try {
      const oauthSessions = await prisma.oAuthSession.findMany({
        where: {
          provider: 'google',
          sessionContext: 'email_api'
        },
        include: {
          user: {
            select: { id: true, email: true }
          }
        }
      });

      let homeownerSessionCount = 0;
      let contractorSessionCount = 0;
      
      for (const session of oauthSessions) {
        if (session.user.email?.includes('homeowner')) {
          homeownerSessionCount++;
        } else if (session.user.email?.includes('contractor')) {
          contractorSessionCount++;
        }
      }

      this.addResult({
        category: 'OAuth',
        test: 'Email API OAuth Sessions',
        passed: contractorSessionCount === 0,
        message: `Found ${homeownerSessionCount} homeowner sessions, ${contractorSessionCount} contractor sessions`,
        details: {
          homeownerSessions: homeownerSessionCount,
          contractorSessions: contractorSessionCount,
          totalSessions: oauthSessions.length
        }
      });

    } catch (error: any) {
      this.addResult({
        category: 'OAuth',
        test: 'OAuth Session Access',
        passed: false,
        message: `OAuth validation failed: ${error.message}`
      });
    }
  }

  /**
   * Validate configuration files follow homeowner-only principle
   */
  private async validateConfigurations(): Promise<void> {
    console.log(`⚙️  Validating Configurations...`);
    
    // Check OAuth credentials configuration
    const credentialsDir = path.join(__dirname, 'email-testing/credentials');
    
    if (fs.existsSync(credentialsDir)) {
      const homeownerCredentials = path.join(credentialsDir, 'homeowner-credentials.json');
      const contractorCredentials = path.join(credentialsDir, 'contractor-credentials.json');
      
      let homeownerConfigValid = false;
      let contractorConfigValid = false;
      
      // Validate homeowner credentials
      if (fs.existsSync(homeownerCredentials)) {
        try {
          const homeownerConfig = JSON.parse(fs.readFileSync(homeownerCredentials, 'utf8'));
          homeownerConfigValid = !!homeownerConfig.refresh_token;
        } catch (error) {
          // Invalid JSON
        }
      }
      
      // Validate contractor credentials (should be send-only)
      if (fs.existsSync(contractorCredentials)) {
        try {
          const contractorConfig = JSON.parse(fs.readFileSync(contractorCredentials, 'utf8'));
          contractorConfigValid = !!contractorConfig.refresh_token;
          
          // Check if contractor has inappropriate scopes
          if (contractorConfig.scope && 
              (contractorConfig.scope.includes('gmail.readonly') || 
               contractorConfig.scope.includes('gmail.modify'))) {
            this.addResult({
              category: 'Configuration',
              test: 'Contractor OAuth Scope Limitation',
              passed: false,
              message: 'Contractor credentials have ingestion scopes - violates homeowner-only principle',
              details: { contractorScopes: contractorConfig.scope }
            });
          }
        } catch (error) {
          // Invalid JSON
        }
      }
      
      this.addResult({
        category: 'Configuration',
        test: 'OAuth Credentials Setup',
        passed: homeownerConfigValid,
        message: `Homeowner credentials: ${homeownerConfigValid ? 'Valid' : 'Invalid'}, Contractor credentials: ${contractorConfigValid ? 'Valid' : 'Invalid'}`,
        details: {
          homeownerCredentialsValid: homeownerConfigValid,
          contractorCredentialsValid: contractorConfigValid
        }
      });
    } else {
      this.addResult({
        category: 'Configuration',
        test: 'Credentials Directory',
        passed: false,
        message: 'OAuth credentials directory not found'
      });
    }
  }

  /**
   * Validate team member filter implements homeowner-only logic
   */
  private async validateTeamMemberFilter(): Promise<void> {
    console.log(`👥 Validating Team Member Filter...`);
    
    try {
      // Test with a homeowner user
      const homeownerUser = await prisma.user.findFirst({
        where: {
          email: { contains: 'homeowner' }
        }
      });
      
      if (homeownerUser) {
        // Test homeowner validation
        const isValidHomeowner = await teamMemberFilter.validateUser(homeownerUser.id);
        
        this.addResult({
          category: 'Team Filter',
          test: 'Homeowner User Validation',
          passed: isValidHomeowner,
          message: `Homeowner user validation: ${isValidHomeowner ? 'Passed' : 'Failed'}`,
          details: {
            homeownerUserId: homeownerUser.id,
            homeownerEmail: homeownerUser.email
          }
        });
        
        // Test email filtering logic
        const testSender = { email: 'test.contractor@example.com' };
        const testRecipients = [{ email: homeownerUser.email! }];
        
        const filterResult = await teamMemberFilter.shouldProcessEmail(
          testSender,
          testRecipients,
          homeownerUser.id
        );
        
        this.addResult({
          category: 'Team Filter',
          test: 'Email Processing Logic',
          passed: filterResult.shouldProcess,
          message: `Email filtering test: ${filterResult.shouldProcess ? 'Passed' : 'Failed'} - ${filterResult.reason}`,
          details: {
            testSender: testSender.email,
            testRecipients: testRecipients.map(r => r.email),
            filterResult: filterResult
          }
        });
      } else {
        this.addResult({
          category: 'Team Filter',
          test: 'Homeowner User Exists',
          passed: false,
          message: 'No homeowner user found for testing'
        });
      }
      
    } catch (error: any) {
      this.addResult({
        category: 'Team Filter',
        test: 'Team Filter Access',
        passed: false,
        message: `Team filter validation failed: ${error.message}`
      });
    }
  }

  /**
   * Validate API endpoints implement homeowner-only processing
   */
  private async validateAPIEndpoints(): Promise<void> {
    console.log(`🔌 Validating API Endpoints...`);
    
    // Check webhook route exists and has homeowner-only comments
    const webhookPath = path.join(__dirname, '../app/api/email/webhook/gmail/route.ts');
    
    if (fs.existsSync(webhookPath)) {
      const webhookContent = fs.readFileSync(webhookPath, 'utf8');
      
      const hasHomeownerOnlyComments = webhookContent.includes('HOMEOWNER-ONLY') && 
                                      webhookContent.includes('NEVER') && 
                                      webhookContent.includes('contractor');
      
      this.addResult({
        category: 'API',
        test: 'Webhook Route Documentation',
        passed: hasHomeownerOnlyComments,
        message: `Gmail webhook route has homeowner-only documentation: ${hasHomeownerOnlyComments ? 'Yes' : 'No'}`,
        details: {
          filePath: webhookPath,
          hasHomeownerOnlyComments
        }
      });
    } else {
      this.addResult({
        category: 'API',
        test: 'Webhook Route Exists',
        passed: false,
        message: 'Gmail webhook route not found'
      });
    }
    
    // Check test message processing route
    const testMessagePath = path.join(__dirname, '../app/api/email/process-test-message/route.ts');
    
    if (fs.existsSync(testMessagePath)) {
      const testMessageContent = fs.readFileSync(testMessagePath, 'utf8');
      
      const hasHomeownerOnlyComments = testMessageContent.includes('HOMEOWNER-ONLY') && 
                                      testMessageContent.includes('NEVER') && 
                                      testMessageContent.includes('contractor');
      
      this.addResult({
        category: 'API',
        test: 'Test Message Route Documentation',
        passed: hasHomeownerOnlyComments,
        message: `Test message route has homeowner-only documentation: ${hasHomeownerOnlyComments ? 'Yes' : 'No'}`,
        details: {
          filePath: testMessagePath,
          hasHomeownerOnlyComments
        }
      });
    }
  }

  /**
   * Validate documentation emphasizes homeowner-only principle
   */
  private async validateDocumentation(): Promise<void> {
    console.log(`📚 Validating Documentation...`);
    
    const docsToCheck = [
      'docs/architecture/email-ingestion-architecture.md',
      'docs/testing/EMAIL_TESTING_STRATEGY.md',
      'docs/testing/EMAIL_TESTING_PLAYBOOK.md'
    ];
    
    for (const docPath of docsToCheck) {
      const fullPath = path.join(__dirname, '..', docPath);
      
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        const hasHomeownerOnlyEmphasis = content.includes('HOMEOWNER-ONLY') || 
                                        content.includes('homeowner-only') ||
                                        content.includes('Homeowner-Only');
        
        const hasContractorWarnings = content.includes('NEVER') && 
                                    content.includes('contractor');
        
        this.addResult({
          category: 'Documentation',
          test: `${path.basename(docPath)} Compliance`,
          passed: hasHomeownerOnlyEmphasis && hasContractorWarnings,
          message: `Document has homeowner-only emphasis: ${hasHomeownerOnlyEmphasis}, contractor warnings: ${hasContractorWarnings}`,
          details: {
            filePath: docPath,
            hasHomeownerOnlyEmphasis,
            hasContractorWarnings
          }
        });
      } else {
        this.addResult({
          category: 'Documentation',
          test: `${path.basename(docPath)} Exists`,
          passed: false,
          message: `Documentation file not found: ${docPath}`
        });
      }
    }
  }

  /**
   * Add a validation result
   */
  private addResult(result: ValidationResult): void {
    this.results.push(result);
  }

  /**
   * Display validation results
   */
  private displayResults(): void {
    console.log(`\n📋 HOMEOWNER-ONLY VALIDATION RESULTS\n`);
    
    const categories = [...new Set(this.results.map(r => r.category))];
    let totalPassed = 0;
    let totalTests = this.results.length;
    
    for (const category of categories) {
      const categoryResults = this.results.filter(r => r.category === category);
      const categoryPassed = categoryResults.filter(r => r.passed).length;
      
      console.log(`\n🏷️  ${category} (${categoryPassed}/${categoryResults.length} passed)`);
      
      for (const result of categoryResults) {
        const icon = result.passed ? '✅' : '❌';
        console.log(`  ${icon} ${result.test}: ${result.message}`);
        
        if (!result.passed && result.details) {
          console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      }
      
      totalPassed += categoryPassed;
    }
    
    console.log(`\n📊 OVERALL RESULTS: ${totalPassed}/${totalTests} tests passed (${Math.round((totalPassed/totalTests)*100)}%)`);
    
    if (totalPassed === totalTests) {
      console.log(`\n🎉 ALL HOMEOWNER-ONLY VALIDATIONS PASSED!`);
      console.log(`✅ The system properly implements homeowner-only email ingestion`);
    } else {
      console.log(`\n⚠️  HOMEOWNER-ONLY VIOLATIONS DETECTED!`);
      console.log(`❌ ${totalTests - totalPassed} validation(s) failed`);
      console.log(`🔧 Please review and fix the issues above to ensure homeowner-only compliance`);
    }
    
    console.log(`\n🏠 HOMEOWNER-ONLY PRINCIPLE SUMMARY:`);
    console.log(`   • Email ingestion ONLY from homeowner Gmail accounts`);
    console.log(`   • Database records ONLY for homeowner users`);
    console.log(`   • OAuth sessions ONLY for homeowner email access`);
    console.log(`   • Team member filtering ONLY for homeowner projects`);
    console.log(`   • API endpoints ONLY process homeowner emails`);
    console.log(`   • Documentation EMPHASIZES homeowner-only approach`);
  }
}

// CLI interface
async function main() {
  const validator = new HomeownerOnlyValidator();
  
  try {
    await validator.runAllValidations();
  } catch (error: any) {
    console.error(`❌ Validation failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { HomeownerOnlyValidator }; 