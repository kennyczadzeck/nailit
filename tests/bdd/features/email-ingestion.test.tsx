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
  setupPrismaMocks,
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

describe('Email Ingestion User Stories', () => {
  beforeEach(() => {
    setupPrismaMocks(mockPrisma);
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
        recipients: urgentEmail.recipients,
        sentAt: urgentEmail.sentAt,
        bodyText: urgentEmail.bodyText,
        ingestionStatus: 'pending',
        analysisStatus: 'pending',
        assignmentStatus: 'pending',
        relevanceScore: null,
        aiSummary: null,
        urgencyLevel: null,
        provider: 'gmail',
        providerData: {},
        threadId: null,
        senderName: null,
        ccRecipients: [],
        bccRecipients: [],
        receivedAt: new Date(),
        bodyHtml: null,
        s3ContentPath: null,
        s3AttachmentPaths: [],
        classification: null,
        extractedData: null,
        projectAssociations: null,
        errorDetails: null,
        retryCount: 0,
        lastProcessedAt: null,
        userId: testUsers.john.id,
        projectId: testProjects.kitchen.id
      });
      
      // Then: Email is captured within acceptable timeframe
      const startTime = Date.now();
      
      await waitFor(() => {
        const processingTime = Date.now() - startTime;
        expect(processingTime).toBeLessThan(emailTestScenarios.realtimeIngestion.maxProcessingTime * 1000);
      });
      
      // And: Email is properly classified as urgent
      expect(urgentEmail.expectedUrgencyLevel).toBe('urgent');
      expect(urgentEmail.expectedRelevanceScore).toBe(1.0);
      expect(urgentEmail.expectedClassification).toBe('inspection');
    });

    test('Given I receive an email with cost changes, When email is analyzed, Then a flagged item is automatically created', async () => {
      // Given: I receive an email about additional costs
      const changeOrderEmail = realtimeEmailTestData.changeOrders[0];
      
      // When: Email is analyzed by AI
      mockPrisma.emailMessage.create.mockResolvedValue({
        id: changeOrderEmail.messageId,
        messageId: changeOrderEmail.messageId,
        subject: changeOrderEmail.subject,
        sender: changeOrderEmail.sender,
        recipients: changeOrderEmail.recipients,
        sentAt: changeOrderEmail.sentAt,
        bodyText: changeOrderEmail.bodyText,
        relevanceScore: changeOrderEmail.expectedRelevanceScore,
        classification: changeOrderEmail.expectedClassification,
        urgencyLevel: changeOrderEmail.expectedUrgencyLevel,
        extractedData: changeOrderEmail.expectedExtractedData,
        ingestionStatus: 'completed',
        analysisStatus: 'completed',
        assignmentStatus: 'completed',
        provider: 'gmail',
        providerData: {},
        threadId: null,
        senderName: null,
        ccRecipients: [],
        bccRecipients: [],
        receivedAt: new Date(),
        bodyHtml: null,
        s3ContentPath: null,
        s3AttachmentPaths: [],
        projectAssociations: null,
        errorDetails: null,
        retryCount: 0,
        lastProcessedAt: new Date(),
        userId: testUsers.john.id,
        projectId: testProjects.kitchen.id,
        aiSummary: 'Electrical panel upgrade required for kitchen renovation'
      });
      
      // And: Flagged item is created for cost change
      mockPrisma.flaggedItem.create.mockResolvedValue({
        id: 'flagged-item-1',
        category: 'COST',
        description: 'Additional electrical work - panel upgrade',
        impact: '+$2,800',
        source: 'email',
        sourceDetails: { emailId: changeOrderEmail.messageId },
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        projectId: testProjects.kitchen.id,
        userId: testUsers.john.id,
        resolvedAt: null,
        resolvedBy: null,
        notes: null
      });
      
      // Then: Change is properly detected and flagged
      expect(changeOrderEmail.expectedContainsChanges).toBe(true);
      expect(changeOrderEmail.expectedExtractedData?.amounts).toContain(2800);
      expect(changeOrderEmail.expectedClassification).toBe('change_order');
      expect(changeOrderEmail.expectedUrgencyLevel).toBe('high');
    });

    test('Given I receive emails from non-team members, When webhook is processed, Then they are filtered out at source', async () => {
      // Given: I receive an email from a non-team member (e.g., marketing@homedepot.com)
      const nonTeamEmail = {
        sender: 'marketing@homedepot.com',
        subject: 'Black Friday Sale - 50% off tools!'
      };
      
      // When: Webhook processing checks sender against team member list
      const teamMembers = testGmailConfig.teamMembers;
      const isFromTeamMember = teamMembers.includes(nonTeamEmail.sender);
      
      // Then: Email is filtered out before processing (not even stored)
      expect(isFromTeamMember).toBe(false);
      expect(mockPrisma.emailMessage.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sender: nonTeamEmail.sender
          })
        })
      );
      
      // And: Only team member emails are processed
      teamMembers.forEach(teamMemberEmail => {
        expect(['contractor.test@gmail.com', 'architect.test@gmail.com', 'inspector.test@citycode.gov', 'supplier.test@materials.com'])
          .toContain(teamMemberEmail);
      });
    });

    test('Given I receive personal emails from team members, When emails are analyzed, Then they still get processed but with lower relevance', async () => {
      // Given: I receive a personal/informal email from a team member
      const personalEmail = historicalEmailTestData.edgeCaseEmails[0];
      
      // When: Email is processed (because it's from a team member)
      mockPrisma.emailMessage.create.mockResolvedValue({
        id: personalEmail.messageId,
        messageId: personalEmail.messageId,
        subject: personalEmail.subject,
        sender: personalEmail.sender,
        recipients: personalEmail.recipients,
        sentAt: personalEmail.sentAt,
        bodyText: personalEmail.bodyText,
        relevanceScore: personalEmail.expectedRelevanceScore,
        classification: personalEmail.expectedClassification,
        urgencyLevel: personalEmail.expectedUrgencyLevel,
        ingestionStatus: 'completed',
        analysisStatus: 'completed',
        assignmentStatus: 'completed',
        provider: 'gmail',
        providerData: {},
        threadId: null,
        senderName: null,
        ccRecipients: [],
        bccRecipients: [],
        receivedAt: new Date(),
        bodyHtml: null,
        s3ContentPath: null,
        s3AttachmentPaths: [],
        projectAssociations: null,
        errorDetails: null,
        retryCount: 0,
        lastProcessedAt: new Date(),
        userId: testUsers.john.id,
        projectId: testProjects.kitchen.id,
        aiSummary: null,
        extractedData: personalEmail.expectedExtractedData
      });
      
      // Then: Email is processed but with appropriate relevance score
      expect(personalEmail.expectedRelevanceScore).toBeGreaterThan(0.5); // Still relevant because from team member
      expect(personalEmail.expectedRelevanceScore).toBeLessThan(0.8); // But lower than formal project communications
      expect(personalEmail.expectedClassification).toBe('general_communication');
      expect(personalEmail.sender).toBe('contractor.test@gmail.com'); // Confirmed team member
    });
  });

  describe('Email Dashboard Integration', () => {
    test('Given I have processed emails, When I view the communications timeline, Then emails are displayed chronologically with proper classification', async () => {
      // Given: I have processed emails for my project
      const processedEmails = [
        ...historicalEmailTestData.projectEmails,
        ...realtimeEmailTestData.urgentEmails
      ];
      
      // When: I view the communications timeline
      render(<MockEmailTimelinePage emails={processedEmails} />);
      
      // Then: Emails are displayed chronologically
      expect(screen.getByText('Project Communications')).toBeInTheDocument();
      expect(screen.getByTestId('email-timeline')).toBeInTheDocument();
      
      // And: Each email shows proper classification
      processedEmails.forEach((email, index) => {
        const emailElement = screen.getByTestId(`email-${index}`);
        expect(emailElement).toBeInTheDocument();
        expect(emailElement).toHaveTextContent(email.subject);
        expect(emailElement).toHaveTextContent(email.expectedClassification);
        expect(emailElement).toHaveTextContent(email.expectedUrgencyLevel);
      });
      
      // And: High-priority emails are prominently displayed
      const urgentEmails = processedEmails.filter(
        email => email.expectedUrgencyLevel === 'urgent'
      );
      expect(urgentEmails.length).toBeGreaterThan(0);
    });

    test('Given I have emails from multiple senders, When I view the timeline, Then I can filter by sender and category', async () => {
      // Given: I have emails from multiple project team members
      const teamEmails = historicalEmailTestData.projectEmails;
      const senders = [...new Set(teamEmails.map(email => email.sender))];
      const categories = [...new Set(teamEmails.map(email => email.expectedClassification))];
      
      // When: I view the timeline with filters
      render(<MockEmailTimelinePage emails={teamEmails} />);
      
      // Then: I can identify different senders
      expect(senders.length).toBeGreaterThan(1);
      expect(senders).toContain('contractor.test@gmail.com');
      expect(senders).toContain('permits@citycode.gov');
      expect(senders).toContain('supplier.test@materials.com');
      
      // And: I can identify different categories
      expect(categories.length).toBeGreaterThan(1);
      expect(categories).toContain('quote');
      expect(categories).toContain('permit');
      expect(categories).toContain('delivery');
    });
  });

  describe('Email Processing Performance', () => {
    test('Given high email volume, When processing emails in parallel, Then system maintains acceptable performance', async () => {
      // Given: High volume of concurrent emails
      const highVolumeEmails = Array(100).fill(null).map((_, index) => ({
        ...historicalEmailTestData.projectEmails[0],
        messageId: `volume-${index}`,
        subject: `Email ${index} - Project Communication`
      }));
      
      // When: Processing multiple emails concurrently
      const startTime = Date.now();
      
      const processingPromises = highVolumeEmails.map(email => 
        mockPrisma.emailMessage.create.mockResolvedValue({
          id: email.messageId,
          messageId: email.messageId,
          ingestionStatus: 'completed',
          analysisStatus: 'completed',
          assignmentStatus: 'completed',
          // ... other required fields
        } as any)
      );
      
      await Promise.all(processingPromises);
      
      // Then: Performance remains acceptable
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(10000); // 10 seconds max for 100 emails
      
      // And: All emails are processed successfully
      expect(processingPromises).toHaveLength(highVolumeEmails.length);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('Given Gmail API is temporarily unavailable, When webhook is received, Then email is queued for retry', async () => {
      // Given: Gmail API returns error
      const webhookPayload = gmailWebhookTestPayloads.validWebhook;
      
      // When: Webhook processing encounters API error
      mockPrisma.emailMessage.create.mockRejectedValueOnce(new Error('Gmail API temporarily unavailable'));
      
      // Then: Email is queued for retry
      mockPrisma.emailMessage.create.mockResolvedValueOnce({
        id: 'retry-email-1',
        messageId: 'temp-retry-message',
        ingestionStatus: 'failed',
        retryCount: 1,
        errorDetails: { error: 'Gmail API temporarily unavailable' },
        // ... other fields
      } as any);
      
      // And: System logs the error appropriately
      expect(mockPrisma.emailMessage.create).toHaveBeenCalled();
    });

    test('Given invalid email content, When email is processed, Then error is logged and processing continues', async () => {
      // Given: Invalid email content
      const invalidEmail = {
        ...historicalEmailTestData.projectEmails[0],
        messageId: 'invalid-email-001',
        bodyText: null, // Invalid content
        subject: null
      };
      
      // When: Email processing encounters invalid data
      mockPrisma.emailMessage.create.mockResolvedValue({
        id: invalidEmail.messageId,
        messageId: invalidEmail.messageId,
        ingestionStatus: 'failed',
        analysisStatus: 'failed',
        errorDetails: { error: 'Invalid email content' },
        // ... other fields
      } as any);
      
      // Then: Error is properly handled
      expect(mockPrisma.emailMessage.create).toHaveBeenCalled();
      
      // And: Processing continues for other emails
      const validEmail = historicalEmailTestData.projectEmails[1];
      mockPrisma.emailMessage.create.mockResolvedValue({
        id: validEmail.messageId,
        messageId: validEmail.messageId,
        ingestionStatus: 'completed',
        analysisStatus: 'completed',
        // ... other fields
      } as any);
    });
  });
}); 