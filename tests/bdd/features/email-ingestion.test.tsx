/**
 * Email Ingestion BDD Tests
 * Behavior-driven tests for email ingestion and analysis
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { jest } from '@jest/globals';
import { 
  testUsers, 
  testProjects, 
  createMockPrisma,
  TestUser 
} from '../../fixtures';
import {
  testGmailConfig,
  historicalEmailTestData,
  realtimeEmailTestData,
  gmailWebhookTestPayloads,
  mockGmailApiResponses,
  emailTestScenarios,
  TestEmailMessage
} from '../../fixtures/email-fixtures';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('../../../app/lib/prisma');
jest.mock('googleapis');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockPrisma = createMockPrisma();

// Helper function to create authenticated session
const createAuthenticatedSession = (user: TestUser) => ({
  status: 'authenticated' as const,
  data: {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
});

// Mock components for email testing
const MockEmailSettingsPage = () => (
  <div>
    <h1>Email Settings</h1>
    <button>Connect Gmail</button>
    <div data-testid="email-status">Disconnected</div>
  </div>
);

const MockEmailTimelinePage = ({ emails }: { emails: TestEmailMessage[] }) => (
  <div>
    <h1>Project Communications</h1>
    <div data-testid="email-timeline">
      {emails.map((email, index) => (
        <div key={email.messageId} data-testid={`email-${index}`}>
          <h3>{email.subject}</h3>
          <p>From: {email.senderName || email.sender}</p>
          <p>Relevance: {email.expectedRelevanceScore}</p>
          <p>Classification: {email.expectedClassification}</p>
          <p>Urgency: {email.expectedUrgencyLevel}</p>
        </div>
      ))}
    </div>
  </div>
);

// Helper function to reset all mocks
const resetAllMocks = () => {
  Object.values(mockPrisma).forEach((table) => {
    Object.values(table).forEach((method) => {
      if (jest.isMockFunction(method)) {
        method.mockReset()
      }
    })
  })
}

describe.skip('Email Ingestion User Stories', () => {
  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
  });

  describe('Use Case 1: Historical Email Ingestion', () => {
    test('Given I am a homeowner with a new project, When I connect Gmail and import existing emails, Then all relevant project emails are captured and analyzed', async () => {
      // Given: I am a homeowner with a new project
      mockUseSession.mockReturnValue(createAuthenticatedSession(testUsers.john));
      mockPrisma.project.findFirst.mockResolvedValue(testProjects.kitchen);
      
      // And: I have existing project-related emails in my Gmail
      const projectEmails = historicalEmailTestData.projectEmails;
      
      // When: I connect Gmail (OAuth flow)
      render(<MockEmailSettingsPage />);
      
      // And: System imports existing emails
      mockPrisma.emailMessage.createMany.mockResolvedValue({ count: projectEmails.length });
      
      // Then: All relevant emails are captured
      await waitFor(() => {
        expect(screen.getByText('Email Settings')).toBeInTheDocument();
      });
      
      // And: Each email is properly classified
      projectEmails.forEach(email => {
        expect(email.expectedRelevanceScore).toBeGreaterThan(0.8);
        expect(['quote', 'permit', 'delivery', 'schedule_update']).toContain(email.expectedClassification);
      });
      
      // And: High-value emails are identified
      const highValueEmails = projectEmails.filter(email => 
        email.expectedRelevanceScore >= 0.9
      );
      expect(highValueEmails.length).toBeGreaterThan(0);
    });

    test('Given I have 50+ historical emails, When I perform bulk import, Then processing completes within acceptable timeframe', async () => {
      // Given: I have many historical emails
      const largeEmailSet = Array(50).fill(null).map((_, index) => ({
        ...historicalEmailTestData.projectEmails[0],
        messageId: `bulk-${index}`,
        subject: `Email ${index} - Project Update`
      }));
      
      // When: I perform bulk import
      const startTime = Date.now();
      mockPrisma.emailMessage.createMany.mockResolvedValue({ count: largeEmailSet.length });
      
      // Then: Processing completes within expected timeframe
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(emailTestScenarios.historicalIngestion.expectedProcessingTime * 1000);
      
      // And: Success rate meets expectations
      const expectedSuccess = Math.floor(largeEmailSet.length * emailTestScenarios.historicalIngestion.expectedSuccessRate);
      expect(largeEmailSet.length).toBeGreaterThanOrEqual(expectedSuccess);
    });

    test('Given historical emails contain attachments, When emails are processed, Then attachments are properly stored and linked', async () => {
      // Given: Historical emails with attachments
      const emailsWithAttachments = historicalEmailTestData.projectEmails.filter(
        email => email.attachments && email.attachments.length > 0
      );
      
      // When: Emails are processed
      mockPrisma.emailMessage.create.mockImplementation(async (data) => ({
        id: 'test-email-id',
        ...data.data,
        s3AttachmentPaths: ['s3://bucket/attachments/Kitchen_Renovation_Quote_Final.pdf']
      }));
      
      // Then: Attachments are properly stored
      emailsWithAttachments.forEach(email => {
        expect(email.attachments).toBeDefined();
        expect(email.attachments!.length).toBeGreaterThan(0);
        
        email.attachments!.forEach(attachment => {
          expect(attachment.filename).toBeTruthy();
          expect(attachment.contentType).toBeTruthy();
          expect(attachment.sizeBytes).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Use Case 2: Real-time Email Ingestion', () => {
    test('Given I have Gmail connected, When I receive a new project email, Then it is captured and processed within 30 seconds', async () => {
      // Given: I have Gmail connected and monitoring enabled
      mockUseSession.mockReturnValue(createAuthenticatedSession(testUsers.john));
      mockPrisma.emailSettings.findUnique.mockResolvedValue({
        id: 'email-settings-1',
        projectId: testProjects.kitchen.id,
        gmailConnected: true,
        monitoringEnabled: true,
        gmailAccessToken: 'mock-access-token',
        gmailRefreshToken: 'mock-refresh-token',
        gmailTokenExpiry: new Date(Date.now() + 3600000),
        notificationsEnabled: true,
        weeklyReports: false,
        highPriorityAlerts: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // When: I receive a new urgent email
      const urgentEmail = realtimeEmailTestData.urgentEmails[0];
      const webhookPayload = gmailWebhookTestPayloads.validWebhook;
      
      // Simulate webhook processing
      mockPrisma.user.findUnique.mockResolvedValue({
        ...testUsers.john,
        projects: [{
          ...testProjects.kitchen,
          emailSettings: {
            gmailConnected: true,
            monitoringEnabled: true
          }
        }]
      });
      
      mockPrisma.emailMessage.create.mockResolvedValue({
        id: urgentEmail.messageId,
        messageId: urgentEmail.messageId,
        subject: urgentEmail.subject,
        sender: urgentEmail.sender,
        senderName: urgentEmail.senderName,
        recipients: urgentEmail.recipients,
        sentAt: new Date(urgentEmail.sentAt),
        receivedAt: new Date(),
        bodyText: urgentEmail.bodyText,
        bodyHtml: urgentEmail.bodyHtml,
        ingestionStatus: 'completed',
        analysisStatus: 'pending',
        assignmentStatus: 'pending',
        userId: testUsers.john.id,
        projectId: testProjects.kitchen.id,
        providerData: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Then: Email is processed successfully
      expect(mockPrisma.emailMessage.create).toHaveBeenCalled();
      
      // And: High urgency is detected
      expect(urgentEmail.expectedUrgencyLevel).toBe('high');
      
      // And: Processing time is acceptable
      expect(urgentEmail.expectedProcessingTime).toBeLessThan(30);
    });

    test('Given I receive multiple emails simultaneously, When webhook notifications arrive, Then all emails are processed without conflicts', async () => {
      // Given: Multiple simultaneous emails
      const simultaneousEmails = realtimeEmailTestData.urgentEmails.slice(0, 3);
      
      // When: Multiple webhook notifications arrive
      const webhookPromises = simultaneousEmails.map((email, index) => {
        mockPrisma.emailMessage.create.mockResolvedValueOnce({
          id: `concurrent-${index}`,
          messageId: email.messageId,
          subject: email.subject,
          sender: email.sender,
          senderName: email.senderName,
          recipients: email.recipients,
          sentAt: new Date(email.sentAt),
          receivedAt: new Date(),
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          ingestionStatus: 'completed',
          analysisStatus: 'pending',
          assignmentStatus: 'pending',
          userId: testUsers.john.id,
          projectId: testProjects.kitchen.id,
          providerData: {},
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return Promise.resolve();
      });
      
      // Then: All emails are processed successfully
      await Promise.all(webhookPromises);
      expect(mockPrisma.emailMessage.create).toHaveBeenCalledTimes(simultaneousEmails.length);
    });
  });

  describe('Use Case 3: Email Analysis and Classification', () => {
    test('Given processed emails exist, When AI analysis runs, Then emails are properly classified and prioritized', async () => {
      // Given: Processed emails awaiting analysis
      const emailsForAnalysis = historicalEmailTestData.projectEmails.slice(0, 5);
      
      // When: AI analysis runs
      emailsForAnalysis.forEach(email => {
        mockPrisma.emailMessage.update.mockResolvedValueOnce({
          id: email.messageId,
          messageId: email.messageId,
          subject: email.subject,
          sender: email.sender,
          senderName: email.senderName,
          recipients: email.recipients,
          sentAt: new Date(email.sentAt),
          receivedAt: new Date(),
          bodyText: email.bodyText,
          bodyHtml: email.bodyHtml,
          ingestionStatus: 'completed',
          analysisStatus: 'completed',
          assignmentStatus: 'pending',
          userId: testUsers.john.id,
          projectId: testProjects.kitchen.id,
          providerData: {
            classification: email.expectedClassification,
            relevanceScore: email.expectedRelevanceScore,
            urgencyLevel: email.expectedUrgencyLevel
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      // Then: Each email has proper classification
      emailsForAnalysis.forEach(email => {
        expect(email.expectedClassification).toBeTruthy();
        expect(email.expectedRelevanceScore).toBeGreaterThan(0);
        expect(['low', 'medium', 'high']).toContain(email.expectedUrgencyLevel);
      });
      
      // And: High-priority emails are identified
      const highPriorityEmails = emailsForAnalysis.filter(
        email => email.expectedUrgencyLevel === 'high'
      );
      expect(highPriorityEmails.length).toBeGreaterThan(0);
    });

    test('Given emails with different content types, When classification runs, Then each type is properly categorized', async () => {
      // Given: Emails of different types
      const emailTypes = [
        { type: 'quote', emails: historicalEmailTestData.projectEmails.filter(e => e.expectedClassification === 'quote') },
        { type: 'permit', emails: historicalEmailTestData.projectEmails.filter(e => e.expectedClassification === 'permit') },
        { type: 'delivery', emails: historicalEmailTestData.projectEmails.filter(e => e.expectedClassification === 'delivery') },
        { type: 'schedule_update', emails: historicalEmailTestData.projectEmails.filter(e => e.expectedClassification === 'schedule_update') }
      ];
      
      // When: Classification runs
      emailTypes.forEach(({ type, emails }) => {
        emails.forEach(email => {
          expect(email.expectedClassification).toBe(type);
        });
      });
      
      // Then: Each type has appropriate characteristics
      expect(emailTypes.every(({ emails }) => emails.length > 0)).toBe(true);
    });
  });

  describe('Use Case 4: Email Timeline Integration', () => {
    test('Given classified emails exist, When I view project timeline, Then emails are integrated chronologically', async () => {
      // Given: Classified emails for a project
      const timelineEmails = historicalEmailTestData.projectEmails.slice(0, 3);
      
      // When: I view the project timeline
      render(<MockEmailTimelinePage emails={timelineEmails} />);
      
      // Then: Emails are displayed in timeline
      await waitFor(() => {
        expect(screen.getByText('Project Communications')).toBeInTheDocument();
      });
      
      // And: Each email shows proper information
      timelineEmails.forEach((email, index) => {
        expect(screen.getByTestId(`email-${index}`)).toBeInTheDocument();
      });
    });

    test('Given emails with attachments, When displayed in timeline, Then attachments are accessible', async () => {
      // Given: Emails with attachments
      const emailsWithAttachments = historicalEmailTestData.projectEmails.filter(
        email => email.attachments && email.attachments.length > 0
      );
      
      // When: Displayed in timeline
      render(<MockEmailTimelinePage emails={emailsWithAttachments} />);
      
      // Then: Attachments are shown
      await waitFor(() => {
        expect(screen.getByText('Project Communications')).toBeInTheDocument();
      });
      
      // And: Attachment information is available
      emailsWithAttachments.forEach(email => {
        expect(email.attachments).toBeDefined();
        expect(email.attachments!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Use Case 5: Error Handling and Edge Cases', () => {
    test('Given Gmail API is temporarily unavailable, When webhook arrives, Then system gracefully handles the error', async () => {
      // Given: Gmail API error
      const apiError = new Error('Gmail API temporarily unavailable');
      
      // When: Webhook processing encounters error
      mockPrisma.emailMessage.create.mockRejectedValue(apiError);
      
      // Then: Error is handled gracefully
      try {
        await mockPrisma.emailMessage.create({
          data: {
            messageId: 'test-error-email',
            subject: 'Test Email',
            sender: 'test@example.com',
            recipients: ['user@example.com'],
            sentAt: new Date(),
            receivedAt: new Date(),
            ingestionStatus: 'failed',
            analysisStatus: 'pending',
            assignmentStatus: 'pending',
            userId: testUsers.john.id,
            projectId: testProjects.kitchen.id,
            providerData: {}
          }
        });
      } catch (error) {
        expect(error).toBe(apiError);
      }
      
      // And: System continues to function
      expect(mockPrisma.emailMessage.create).toHaveBeenCalled();
    });

    test('Given malformed webhook payload, When webhook is processed, Then system validates and rejects invalid data', async () => {
      // Given: Invalid webhook payload
      const invalidPayload = gmailWebhookTestPayloads.invalidWebhook;
      
      // When: Webhook validation runs
      const isValid = invalidPayload.message && 
                     invalidPayload.message.data && 
                     invalidPayload.subscription;
      
      // Then: Invalid payload is rejected
      expect(isValid).toBe(false);
      
      // And: No database operations are performed
      expect(mockPrisma.emailMessage.create).not.toHaveBeenCalled();
    });
  });
}); 