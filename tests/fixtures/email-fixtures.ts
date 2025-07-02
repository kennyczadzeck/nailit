/**
 * Email Testing Fixtures
 * Comprehensive test data for email ingestion scenarios
 */

export interface TestEmailMessage {
  messageId: string;
  threadId?: string;
  subject: string;
  sender: string;
  senderName?: string;
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  sentAt: Date;
  bodyText: string;
  bodyHtml?: string;
  attachments?: TestEmailAttachment[];
  
  // Expected AI analysis results
  expectedRelevanceScore: number;
  expectedClassification: string;
  expectedUrgencyLevel: 'low' | 'normal' | 'high' | 'urgent';
  expectedProjectAssociation?: string;
  expectedContainsChanges: boolean;
  expectedExtractedData?: {
    amounts?: number[];
    dates?: string[];
    contacts?: string[];
    addresses?: string[];
  };
}

export interface TestEmailAttachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  content?: string; // Base64 or text content
}

// Test Gmail account configuration
export const testGmailConfig = {
  // Dedicated test account for email ingestion testing
  testAccount: 'nailit.email.testing@gmail.com',
  
  // OAuth credentials for test account (staging only)
  stagingOAuth: {
    clientId: process.env.GMAIL_TEST_CLIENT_ID,
    clientSecret: process.env.GMAIL_TEST_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_TEST_REFRESH_TOKEN,
  },
  
  // Test project team members (emails filtered by these addresses)
  teamMembers: [
    'contractor.test@gmail.com',
    'architect.test@gmail.com', 
    'inspector.test@citycode.gov',
    'supplier.test@materials.com'
  ],

  // Important: Only emails FROM team members are processed
  // This eliminates the need for low-relevance filtering of marketing emails
  filteringStrategy: 'team_member_whitelist'
};

// Use Case 1: Historical Email Ingestion Test Data
export const historicalEmailTestData = {
  // High relevance construction emails
  projectEmails: [
    {
      messageId: 'hist-001-kitchen-quote',
      subject: 'Kitchen renovation quote - final version',
      sender: 'contractor.test@gmail.com',
      senderName: 'Mike Johnson - GC Pro',
      recipients: ['nailit.email.testing@gmail.com'],
      sentAt: new Date('2024-11-15T10:30:00Z'),
      bodyText: `Hi Sarah,

Attached is the final quote for your kitchen renovation project. 

Project Details:
- Total cost: $45,000 (includes materials and labor)
- Timeline: 6-8 weeks starting December 1st
- Permits: We will handle all permit applications
- Materials: High-end quartz countertops, custom cabinets

Please review and let me know if you have any questions.

Best regards,
Mike Johnson
General Contractor Pro
(555) 123-4567`,
      attachments: [
        {
          filename: 'Kitchen_Renovation_Quote_Final.pdf',
          contentType: 'application/pdf',
          sizeBytes: 245760
        }
      ],
      expectedRelevanceScore: 0.95,
      expectedClassification: 'quote',
      expectedUrgencyLevel: 'normal',
      expectedContainsChanges: true,
      expectedExtractedData: {
        amounts: [45000],
        dates: ['2024-12-01'],
        contacts: ['Mike Johnson', '(555) 123-4567']
      }
    },
    
    {
      messageId: 'hist-002-permit-approval',
      subject: 'Building Permit BP-2024-1156 - APPROVED',
      sender: 'permits@citycode.gov',
      senderName: 'City Building Department',
      recipients: ['nailit.email.testing@gmail.com'],
      ccRecipients: ['contractor.test@gmail.com'],
      sentAt: new Date('2024-11-20T14:15:00Z'),
      bodyText: `Permit Holder: Sarah Johnson
Project Address: 123 Main Street, Anytown, ST 12345

Your building permit application has been APPROVED.

Permit Number: BP-2024-1156
Project Type: Kitchen Renovation
Approved Date: November 20, 2024
Expiration Date: May 20, 2025

Construction may begin on Monday, November 25th, 2024.

Required inspections:
1. Electrical rough-in
2. Plumbing rough-in  
3. Final inspection

Contact Building Inspector John Smith at (555) 987-6543 to schedule inspections.`,
      expectedRelevanceScore: 1.0,
      expectedClassification: 'permit',
      expectedUrgencyLevel: 'high',
      expectedContainsChanges: true,
      expectedExtractedData: {
        dates: ['2024-11-25', '2025-05-20'],
        contacts: ['John Smith', '(555) 987-6543'],
        addresses: ['123 Main Street, Anytown, ST 12345']
      }
    },

    {
      messageId: 'hist-003-material-delivery',
      subject: 'Delivery scheduled - Quartz countertops',
      sender: 'supplier.test@materials.com',
      senderName: 'Premium Materials Supply',
      recipients: ['nailit.email.testing@gmail.com'],
      ccRecipients: ['contractor.test@gmail.com'],
      sentAt: new Date('2024-12-02T09:00:00Z'),
      bodyText: `Dear Sarah,

Your quartz countertops are ready for delivery!

Delivery Details:
- Date: Thursday, December 5th
- Time: 8:00 AM - 12:00 PM
- Items: Calacatta quartz slabs (3 pieces)
- Cost: $8,500

Please ensure someone is available to receive the delivery. Contractor Mike Johnson has been notified.

Contact our delivery team at (555) 444-2222 with any questions.

Best regards,
Premium Materials Supply`,
      expectedRelevanceScore: 0.90,
      expectedClassification: 'delivery',
      expectedUrgencyLevel: 'normal',
      expectedContainsChanges: false,
      expectedExtractedData: {
        amounts: [8500],
        dates: ['2024-12-05'],
        contacts: ['(555) 444-2222']
      }
    }
  ],

  // Medium relevance emails
  generalEmails: [
    {
      messageId: 'hist-004-weather-delay',
      subject: 'Re: Kitchen project - weather delay',
      sender: 'contractor.test@gmail.com',
      recipients: ['nailit.email.testing@gmail.com'],
      sentAt: new Date('2024-12-03T16:45:00Z'),
      bodyText: `Hi Sarah,

Due to the storm forecast for this weekend, we'll need to delay the countertop installation by 2 days. 

New schedule:
- Countertop delivery: Still Thursday Dec 5th
- Installation: Monday Dec 9th (instead of Saturday Dec 7th)

This won't affect the overall timeline. Thanks for understanding!

Mike`,
      expectedRelevanceScore: 0.85,
      expectedClassification: 'schedule_update',
      expectedUrgencyLevel: 'normal',
      expectedContainsChanges: true,
      expectedExtractedData: {
        dates: ['2024-12-05', '2024-12-09', '2024-12-07']
      }
    }
  ],

  // Edge case emails (from team members but lower project relevance)
  edgeCaseEmails: [
    {
      messageId: 'hist-005-personal-note',
      subject: 'Thanks for the coffee!',
      sender: 'contractor.test@gmail.com',
      recipients: ['nailit.email.testing@gmail.com'],
      sentAt: new Date('2024-11-29T08:00:00Z'),
      bodyText: `Hi Sarah,

Thanks for the coffee this morning! Really appreciate it.

By the way, I noticed you might want to consider adding a backsplash to the kitchen design - it would really make the space pop.

Have a great weekend!
Mike`,
      expectedRelevanceScore: 0.65, // From team member but personal/informal
      expectedClassification: 'general_communication',
      expectedUrgencyLevel: 'low',
      expectedContainsChanges: false,
      expectedExtractedData: {
        // Should still extract potential project suggestions
      }
    }
  ]
};

// Use Case 2: Real-time Email Ingestion Test Data
export const realtimeEmailTestData = {
  urgentEmails: [
    {
      messageId: 'realtime-001-urgent-inspection',
      subject: 'URGENT: Electrical inspection tomorrow 9 AM',
      sender: 'inspector.test@citycode.gov',
      recipients: ['nailit.email.testing@gmail.com'],
      ccRecipients: ['contractor.test@gmail.com'],
      sentAt: new Date(), // Current time
      bodyText: `URGENT NOTICE

Your electrical inspection is scheduled for tomorrow (${new Date(Date.now() + 24*60*60*1000).toLocaleDateString()}) at 9:00 AM.

Inspector: John Smith
Permit: BP-2024-1156
Address: 123 Main Street

Please ensure:
- All electrical work is complete
- Work area is accessible
- Someone is present to meet inspector

Failure to be ready will result in re-scheduling fees.

Contact: (555) 987-6543`,
      expectedRelevanceScore: 1.0,
      expectedClassification: 'inspection',
      expectedUrgencyLevel: 'urgent',
      expectedContainsChanges: true,
      expectedExtractedData: {
        dates: [new Date(Date.now() + 24*60*60*1000).toISOString().split('T')[0]],
        contacts: ['John Smith', '(555) 987-6543']
      }
    }
  ],

  changeOrders: [
    {
      messageId: 'realtime-002-change-order',
      subject: 'Change order required - additional electrical work',
      sender: 'contractor.test@gmail.com',
      recipients: ['nailit.email.testing@gmail.com'],
      sentAt: new Date(),
      bodyText: `Hi Sarah,

During the electrical rough-in, we discovered the panel needs upgrading to handle the new kitchen load.

Additional work required:
- Panel upgrade from 100A to 200A service
- Additional cost: $2,800
- Additional time: 2 days

This is required by code and must be completed before inspection.

Please confirm if you'd like us to proceed.

Mike Johnson
General Contractor Pro`,
      expectedRelevanceScore: 0.98,
      expectedClassification: 'change_order',
      expectedUrgencyLevel: 'high',
      expectedContainsChanges: true,
      expectedExtractedData: {
        amounts: [2800]
      }
    }
  ]
};

// Webhook test payloads
export const gmailWebhookTestPayloads = {
  validWebhook: {
    message: {
      data: Buffer.from(JSON.stringify({
        emailAddress: 'nailit.email.testing@gmail.com',
        historyId: '123456'
      })).toString('base64'),
      messageId: 'webhook-msg-001',
      publishTime: new Date().toISOString()
    }
  },
  
  invalidWebhook: {
    message: {
      data: 'invalid-base64-data',
      messageId: 'webhook-msg-002'
    }
  }
};

// Mock Gmail API responses
export const mockGmailApiResponses = {
  getProfile: {
    emailAddress: 'nailit.email.testing@gmail.com',
    messagesTotal: 150,
    threadsTotal: 45
  },
  
  listMessages: {
    messages: [
      { id: 'hist-001-kitchen-quote', threadId: 'thread-001' },
      { id: 'hist-002-permit-approval', threadId: 'thread-002' }
    ],
    nextPageToken: 'next-page-token-123'
  },
  
  getMessage: (messageId: string) => {
    const email = [...historicalEmailTestData.projectEmails, ...historicalEmailTestData.generalEmails, ...historicalEmailTestData.edgeCaseEmails]
      .find(e => e.messageId === messageId) as TestEmailMessage | undefined;
    
    if (!email) return null;
    
    return {
      id: email.messageId,
      threadId: email.threadId || 'thread-default',
      payload: {
        headers: [
          { name: 'Subject', value: email.subject },
          { name: 'From', value: `${email.senderName || email.sender} <${email.sender}>` },
          { name: 'To', value: email.recipients.join(', ') },
          { name: 'Date', value: email.sentAt.toISOString() }
        ],
        body: {
          data: Buffer.from(email.bodyText).toString('base64')
        },
        parts: email.attachments?.map((att: TestEmailAttachment) => ({
          filename: att.filename,
          mimeType: att.contentType,
          body: { size: att.sizeBytes }
        }))
      }
    };
  }
};

// Test scenarios for BDD tests
export const emailTestScenarios = {
  historicalIngestion: {
    description: 'Bulk import existing project emails',
    emailCount: historicalEmailTestData.projectEmails.length,
    expectedProcessingTime: 30, // seconds
    expectedSuccessRate: 0.95
  },
  
  realtimeIngestion: {
    description: 'Real-time processing of new emails',
    maxProcessingTime: 30, // seconds  
    webhookDelay: 5, // seconds
    expectedRelevanceAccuracy: 0.90
  }
}; 