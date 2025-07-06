#!/usr/bin/env tsx

// Test script for the email analyzer implementation

import { EmailAnalyzer } from '../app/lib/ai/email-analyzer';
import { EmailMessage, Project } from '../app/lib/ai/types';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testEmailAnalyzer() {
  console.log('🧪 Testing Email Analyzer Implementation');
  console.log('=====================================\n');

  // Initialize the analyzer
  console.log('1. Initializing EmailAnalyzer...');
  let analyzer: EmailAnalyzer;
  
  try {
    analyzer = new EmailAnalyzer();
    console.log('✅ EmailAnalyzer initialized successfully\n');
  } catch (error) {
    console.error('❌ Failed to initialize EmailAnalyzer:', error);
    process.exit(1);
  }

  // Test connection
  console.log('2. Testing OpenAI connection...');
  const connectionTest = await analyzer.testConnection();
  
  if (connectionTest) {
    console.log('✅ OpenAI connection successful\n');
  } else {
    console.log('❌ OpenAI connection failed\n');
    process.exit(1);
  }

  // Test project data
  const testProject: Project = {
    id: 'test-project-123',
    name: 'Kitchen Renovation',
    description: 'Complete kitchen renovation with new appliances and countertops',
    status: 'ACTIVE',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-123',
    contractor: 'Elite Construction Co.',
    budget: 45000,
    address: '123 Main St, Anytown, USA'
  };

  // Test emails
  const testEmails: EmailMessage[] = [
    {
      id: 'email-1',
      messageId: 'msg-1',
      provider: 'gmail',
      sender: 'billing@eliteelectric.com',
      senderName: 'Elite Electric Billing',
      recipients: ['homeowner@example.com'],
      ccRecipients: [],
      bccRecipients: [],
      subject: 'Invoice #2024-001 - Electrical Work Completed',
      bodyText: `Dear Homeowner,

Please find attached invoice #2024-001 for the electrical work completed on January 15, 2024.

Work Summary:
- Installed new 200A electrical panel
- Upgraded kitchen outlets to GFCI
- Added under-cabinet lighting circuits
- Electrical inspection passed

Total Amount: $3,250.00
Due Date: February 15, 2024

Please remit payment within 30 days.

Best regards,
Elite Electric`,
      sentAt: '2024-01-20T10:30:00Z',
      receivedAt: '2024-01-20T10:30:00Z',
      s3AttachmentPaths: ['invoices/2024-001.pdf'],
      ingestionStatus: 'completed',
      analysisStatus: 'pending',
      assignmentStatus: 'pending',
      containsChanges: false,
      retryCount: 0,
      userId: 'user-123',
      projectId: 'test-project-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'email-2',
      messageId: 'msg-2',
      provider: 'gmail',
      sender: 'foreman@proplumb.com',
      senderName: 'Pro Plumbing Foreman',
      recipients: ['homeowner@example.com'],
      ccRecipients: [],
      bccRecipients: [],
      subject: 'Schedule Update - Plumbing Rough-In Delayed',
      bodyText: `Hi,

I wanted to give you a heads up that we need to push back the plumbing rough-in by 3 days.

The city inspector found an issue with the electrical panel placement that needs to be resolved before we can proceed with the plumbing work. Elite Electric is coming back tomorrow to relocate the panel.

New Schedule:
- Electrical panel relocation: January 22-23
- Plumbing rough-in: January 25-26 (was January 22-23)
- Plumbing inspection: January 29 (was January 26)

This shouldn't affect the overall project timeline as we have some buffer built in.

Let me know if you have any questions.

Thanks,
Mike - Pro Plumbing`,
      sentAt: '2024-01-21T14:15:00Z',
      receivedAt: '2024-01-21T14:15:00Z',
      s3AttachmentPaths: [],
      ingestionStatus: 'completed',
      analysisStatus: 'pending',
      assignmentStatus: 'pending',
      containsChanges: false,
      retryCount: 0,
      userId: 'user-123',
      projectId: 'test-project-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  console.log('🧪 Testing Email Analyzer with realistic construction emails...\n');

  for (const email of testEmails) {
    console.log(`📧 Analyzing email: ${email.subject}`);
    console.log(`From: ${email.sender}`);
    console.log(`Date: ${email.sentAt}`);
    console.log('---');

    const startTime = Date.now();
    const result = await analyzer.analyzeEmail(email, testProject);
    const duration = Date.now() - startTime;

    if (result.success && result.analysis) {
      const analysis = result.analysis;
      
      console.log('✅ Analysis successful:');
      console.log(`   Classification: ${analysis.classification.primary_type} (${(analysis.classification.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`   Priority: ${analysis.priority}`);
      console.log(`   Requires Response: ${analysis.requires_response ? 'Yes' : 'No'}`);
      console.log(`   Key Points: ${analysis.summary.key_points.length}`);
      console.log(`   Action Items: ${analysis.summary.action_items.length}`);
      console.log(`   Entities Found: ${Object.values(analysis.entities).flat().length}`);
      console.log(`   Processing Time: ${duration}ms`);
      console.log(`   Overall Confidence: ${(analysis.confidence_score * 100).toFixed(1)}%`);
      
      if (analysis.entities.amounts.length > 0) {
        console.log(`   💰 Amounts: ${analysis.entities.amounts.join(', ')}`);
      }
      
      if (analysis.entities.dates.length > 0) {
        console.log(`   📅 Dates: ${analysis.entities.dates.join(', ')}`);
      }
      
      console.log('\n');
    } else {
      console.log('❌ Analysis failed:');
      console.log(`   Error: ${result.error?.message}`);
      console.log(`   Type: ${result.error?.type}`);
      console.log(`   Retry Suggested: ${result.error?.retry_suggested ? 'Yes' : 'No'}`);
      console.log('\n');
    }
  }

  console.log('🎉 Email Analyzer testing complete!');
  console.log('\nNext steps:');
  console.log('- Review the analysis results above');
  console.log('- Adjust prompts if needed');
  console.log('- Test with real project emails');
  console.log('- Integrate with email processing pipeline');
}

// Run the test
testEmailAnalyzer().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 