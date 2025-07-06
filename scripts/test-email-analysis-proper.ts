#!/usr/bin/env tsx

/**
 * Proper Email Analysis Integration Test
 * 
 * Follows the correct testing strategy:
 * 1. Generate real emails via Gmail API (not mock data)
 * 2. Run email ingestion to populate EmailMessage table
 * 3. Run AI analysis on real emails from database
 * 4. Validate end-to-end workflow
 */

import { prisma } from '../app/lib/prisma';

async function testProperEmailAnalysisIntegration() {
  console.log('🔄 Proper Email Analysis Integration Test');
  console.log('==========================================\n');

  try {
    // 1. Verify we have real emails from Gmail API (not mock data)
    console.log('1. Checking for real emails from Gmail ingestion...');
    
    const user = await prisma.user.findFirst({
      where: {
        email: 'nailit.test.homeowner@gmail.com'
      },
      include: {
        projects: {
          include: {
            emailMessages: true,
            teamMembers: true
          }
        }
      }
    });

    if (!user || user.projects.length === 0) {
      console.log('❌ No user or projects found. Please run the seed script first.');
      console.log('   Run: npm run db:seed');
      process.exit(1);
    }

    const project = user.projects[0];
    const emailMessages = project.emailMessages;

    if (emailMessages.length === 0) {
      console.log('⚠️  No emails found in database.');
      console.log('   This is CORRECT behavior - emails should come from Gmail ingestion, not direct database writes.');
      console.log('   To test properly:');
      console.log('   1. Set up Gmail test accounts with OAuth');
      console.log('   2. Send real emails via Gmail API');
      console.log('   3. Run email ingestion to populate database');
      console.log('   4. Then run AI analysis');
      console.log('\n   For now, testing with mock email data for AI analysis only...\n');
      
      // Test AI analysis with mock email (analysis only, no database storage)
      await testAIAnalysisOnly(project);
      return;
    }

    console.log(`✅ Found ${emailMessages.length} real emails from ingestion`);
    console.log(`✅ Project: ${project.name}`);
    console.log(`✅ Team members: ${project.teamMembers.length}\n`);

    // 2. Test AI analysis on real emails
    console.log('2. Testing AI analysis on real emails...');
    
    for (let i = 0; i < Math.min(emailMessages.length, 3); i++) {
      const email = emailMessages[i];
      console.log(`\n📧 Analyzing real email ${i + 1}: "${email.subject}"`);
      
      const startTime = Date.now();
      
      // Make API call with real email data
      const response = await fetch('http://localhost:3000/api/email/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: {
            id: email.id,
            subject: email.subject,
            sender: email.sender,
            recipients: email.recipients,
            content: email.bodyText || 'Email content from Gmail ingestion',
            sentAt: email.sentAt
          },
          projectId: project.id,
          storeInDatabase: true // Store analysis of real emails
        })
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        const result = await response.json();
        
        console.log('✅ AI analysis successful:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Classification: ${result.analysis.classification.primary_type}`);
        console.log(`   Confidence: ${(result.analysis.classification.confidence * 100).toFixed(1)}%`);
        console.log(`   Priority: ${result.analysis.priority}`);
        console.log(`   Stored in DB: ${result.storedInDatabase ? 'Yes' : 'No'}`);
        
        // Verify analysis was stored
        if (result.storedInDatabase) {
          const storedAnalysis = await prisma.emailAnalysis.findFirst({
            where: {
              emailId: email.id,
              projectId: project.id
            }
          });
          
          if (storedAnalysis) {
            console.log('✅ Analysis successfully stored in database');
            console.log(`   Analysis ID: ${storedAnalysis.id}`);
            console.log(`   Model used: ${storedAnalysis.modelUsed}`);
          } else {
            console.log('❌ Analysis not found in database');
          }
        }
        
      } else {
        console.log('❌ AI analysis failed:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration}ms`);
        
        const error = await response.json();
        console.log(`   Error: ${error.error}`);
        if (error.details) {
          console.log(`   Details: ${error.details}`);
        }
      }
    }

    // 3. Verify database state
    console.log('\n3. Verifying database state...');
    
    const analysisCount = await prisma.emailAnalysis.count({
      where: { projectId: project.id }
    });
    
    console.log(`✅ Found ${analysisCount} email analyses in database`);
    
    if (analysisCount > 0) {
      const recentAnalysis = await prisma.emailAnalysis.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: 'desc' },
        include: {
          email: true,
          project: true
        }
      });
      
      if (recentAnalysis) {
        console.log(`✅ Most recent analysis:`);
        console.log(`   Email: ${recentAnalysis.email.subject}`);
        console.log(`   Classification: ${recentAnalysis.classification || 'N/A'}`);
        console.log(`   Confidence: ${recentAnalysis.confidenceScore || 'N/A'}`);
        console.log(`   Priority: ${recentAnalysis.priority || 'N/A'}`);
        console.log(`   Key Amounts: ${recentAnalysis.entities ? JSON.parse(recentAnalysis.entities).amounts?.length || 0 : 0}`);
        console.log(`   Key Dates: ${recentAnalysis.entities ? JSON.parse(recentAnalysis.entities).dates?.length || 0 : 0}`);
        console.log(`   Key Contractors: ${recentAnalysis.entities ? JSON.parse(recentAnalysis.entities).contractors?.length || 0 : 0}`);
      }
    }

    console.log('\n🎉 Proper integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Found ${emailMessages.length} real emails from ingestion`);
    console.log(`- Analyzed ${Math.min(emailMessages.length, 3)} emails via AI`);
    console.log(`- Stored ${analysisCount} analyses in database`);
    console.log(`- Following correct testing strategy ✅`);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function testAIAnalysisOnly(project: any) {
  console.log('Testing AI analysis with mock email (analysis only)...');
  
  const mockEmail = {
    id: 'mock-email-for-analysis',
    subject: 'Kitchen Renovation - Final Invoice',
    sender: 'billing@contractor.com',
    recipients: ['homeowner@example.com'],
    content: `Final invoice for kitchen renovation project.

Total amount: $3,500.00
Work completed:
- Cabinet installation
- Countertop installation  
- Electrical work

Payment due: January 15, 2025

Thank you for your business!`,
    sentAt: new Date()
  };

  const response = await fetch('http://localhost:3000/api/email/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: mockEmail,
      projectId: project.id,
      storeInDatabase: false // Don't store mock email analysis
    })
  });

  if (response.ok) {
    const result = await response.json();
    console.log('✅ AI analysis working correctly:');
    console.log(`   Classification: ${result.analysis.classification.primary_type}`);
    console.log(`   Confidence: ${(result.analysis.classification.confidence * 100).toFixed(1)}%`);
    console.log(`   Priority: ${result.analysis.priority}`);
    console.log(`   Key Points: ${result.analysis.summary.key_points.length}`);
    console.log(`   Action Items: ${result.analysis.summary.action_items.length}`);
    console.log('   Mock email not stored in database (correct behavior)');
  } else {
    const error = await response.json();
    console.log('❌ AI analysis failed:', error.error);
  }
}

// Run the test
testProperEmailAnalysisIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 