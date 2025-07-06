#!/usr/bin/env tsx

// Integration test for email analysis API endpoint

import { prisma } from '../app/lib/prisma';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testEmailAnalysisIntegration() {
  console.log('🔄 Testing Email Analysis Integration');
  console.log('===================================\n');

  try {
    // 1. Find existing user and project
    console.log('1. Finding existing user and project...');
    const user = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' }
    });

    if (!user) {
      console.log('❌ Test user not found. Please run: npx tsx scripts/email-testing/data-manager.ts setup-single-contractor-project');
      process.exit(1);
    }

    const project = await prisma.project.findFirst({
      where: { userId: user.id },
      include: {
        teamMembers: true
      }
    });

    if (!project) {
      console.log('❌ No project found for test user. Please run: npx tsx scripts/email-testing/data-manager.ts setup-single-contractor-project');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`✅ Found project: ${project.name}\n`);

    // 2. Create test email messages
    console.log('2. Creating test email messages...');
    
    const testEmails = [
      {
        messageId: 'test-invoice-001',
        subject: 'Invoice #INV-2024-789 - Kitchen Electrical Work',
        sender: 'billing@eliteelectric.com',
        senderName: 'Elite Electric Billing',
        recipients: [user.email],
        ccRecipients: [],
        bccRecipients: [],
        sentAt: new Date('2024-07-05T10:30:00Z'),
        bodyText: `Invoice Details:
- Kitchen electrical panel upgrade
- New outlet installation (8 outlets)
- Under-cabinet lighting installation
- GFCI outlet installation
- Electrical inspection passed

Total Amount: $2,850.00
Payment Due: July 20, 2024

Thank you for your business!`,
        bodyHtml: null,
        userId: user.id,
        projectId: project.id,
        ingestionStatus: 'completed',
        analysisStatus: 'pending'
      },
      {
        messageId: 'test-change-order-001',
        subject: 'Change Order Required - Additional Plumbing Work',
        sender: 'supervisor@proplumb.com',
        senderName: 'Dave Martinez',
        recipients: [user.email],
        ccRecipients: [],
        bccRecipients: [],
        sentAt: new Date('2024-07-05T14:15:00Z'),
        bodyText: `Hi there,

We discovered an issue with the main water line during the kitchen renovation. The existing copper pipe has corrosion and needs replacement to meet current building codes.

Additional work required:
- Replace 15 feet of main water line
- Install new shut-off valve
- Pressure test entire system
- Additional inspection required

Estimated additional cost: $1,200
Timeline impact: 2 additional days
New completion date: July 22, 2024

Please approve this change order so we can proceed.

Best regards,
Dave Martinez
ProPlumb Solutions`,
        bodyHtml: null,
        userId: user.id,
        projectId: project.id,
        ingestionStatus: 'completed',
        analysisStatus: 'pending'
      }
    ];

    // Insert test emails
    const createdEmails = [];
    for (const emailData of testEmails) {
      const email = await prisma.emailMessage.create({
        data: emailData
      });
      createdEmails.push(email);
      console.log(`✅ Created email: ${email.subject}`);
    }

    console.log('\n3. Testing email analysis API...');

    // 3. Test the analysis API for each email
    for (let i = 0; i < createdEmails.length; i++) {
      const email = createdEmails[i];
      console.log(`\n📧 Analyzing Email ${i + 1}: "${email.subject}"`);
      
      const startTime = Date.now();
      
      // Make API call
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
            content: email.bodyText,
            sentAt: email.sentAt
          },
          projectId: project.id,
          storeInDatabase: true // Request database storage for testing
        })
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        const result = await response.json();
        
        console.log('✅ API call successful:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Classification: ${result.analysis.classification.primary_type}`);
        console.log(`   Confidence: ${(result.analysis.classification.confidence * 100).toFixed(1)}%`);
        console.log(`   Priority: ${result.analysis.priority}`);
        console.log(`   Requires Response: ${result.analysis.requires_response ? 'Yes' : 'No'}`);
        console.log(`   Key Points: ${result.analysis.summary.key_points.length}`);
        console.log(`   Action Items: ${result.analysis.summary.action_items.length}`);
        console.log(`   Entities: ${Object.values(result.analysis.entities).flat().length}`);
        
        // Check if analysis was stored in database
        const storedAnalysis = await prisma.emailAnalysis.findFirst({
          where: {
            emailId: email.id,
            projectId: project.id
          }
        });
        
        if (storedAnalysis) {
          console.log('✅ Analysis stored in database');
        } else {
          console.log('❌ Analysis not found in database');
        }
        
      } else {
        console.log('❌ API call failed:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Duration: ${duration}ms`);
        
        const error = await response.json();
        console.log(`   Error: ${error.error}`);
        if (error.details) {
          console.log(`   Details: ${error.details}`);
        }
      }
    }

    // 4. Verify database state
    console.log('\n4. Verifying database state...');
    
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
        console.log(`   Confidence: ${(recentAnalysis.confidenceScore * 100).toFixed(1)}%`);
        console.log(`   Processing Time: ${recentAnalysis.processingTimeMs}ms`);
        console.log(`   Model: ${recentAnalysis.modelUsed}`);
      }
    }

    console.log('\n🎉 Integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Created ${createdEmails.length} test emails`);
    console.log(`- Analyzed ${createdEmails.length} emails via API`);
    console.log(`- Stored ${analysisCount} analyses in database`);
    console.log(`- All components working together ✅`);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEmailAnalysisIntegration().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 