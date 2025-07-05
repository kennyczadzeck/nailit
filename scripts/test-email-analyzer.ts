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

  // Create test data
  console.log('3. Creating test data...');
  
  const testProject: Project = {
    id: 'proj-123',
    name: 'Modern Kitchen Renovation',
    type: 'Residential Renovation',
    phase: 'construction',
    address: '456 Oak Street, Springfield, IL',
    budget: 85000,
    spent_to_date: 32000,
    start_date: '2024-06-01',
    estimated_completion: '2024-09-15',
    current_phase: 'systems',
    phase_activities: ['electrical', 'plumbing', 'HVAC'],
    change_order_threshold: 2500,
    days_remaining: 45,
    team_members: [
      { name: 'John Smith', email: 'john@example.com', role: 'Project Manager' },
      { name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Homeowner' }
    ],
    contractors: [
      { company: 'Elite Electric', specialty: 'Electrical' },
      { company: 'ProPlumb Solutions', specialty: 'Plumbing' }
    ]
  };

  // Test different types of emails
  const testEmails: EmailMessage[] = [
    {
      id: 'email-1',
      from: 'billing@eliteelectric.com',
      to: 'john@example.com',
      subject: 'Invoice #2024-1156 - Kitchen Electrical Work',
      body: `Hi John,

Please find attached invoice #2024-1156 for the electrical work completed in the kitchen renovation project at 456 Oak Street.

Work completed:
- Installed new electrical panel (200A)
- Wired kitchen outlets and lighting
- Added dedicated circuits for appliances
- Passed electrical inspection on July 3rd

Total amount: $3,250.00
Payment due: July 20th, 2024

Please let me know if you have any questions.

Best regards,
Mike Thompson
Elite Electric`,
      date: '2024-07-05T10:30:00Z',
      attachments: ['invoice-2024-1156.pdf']
    },
    {
      id: 'email-2',
      from: 'foreman@proplumb.com',
      to: 'john@example.com',
      subject: 'Schedule Update - Plumbing Delay',
      body: `John,

I need to update you on the plumbing schedule for the kitchen project. We've encountered an issue with the main water line that will require additional work.

The city inspector found that the existing line doesn't meet current codes and needs to be replaced. This will add 3-4 days to our timeline and approximately $1,800 in additional costs.

We can start the replacement work Monday if you approve the change order. This would push our completion date from July 15th to July 19th.

Let me know how you'd like to proceed.

Thanks,
Dave Martinez
ProPlumb Solutions`,
      date: '2024-07-05T14:15:00Z'
    }
  ];

  console.log('✅ Test data created\n');

  // Analyze each email
  console.log('4. Analyzing test emails...\n');
  
  for (let i = 0; i < testEmails.length; i++) {
    const email = testEmails[i];
    console.log(`📧 Analyzing Email ${i + 1}: "${email.subject}"`);
    console.log(`From: ${email.from}`);
    console.log(`Type: Expected ${i === 0 ? 'invoice' : 'schedule_update'}\n`);

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