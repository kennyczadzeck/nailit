# Email Ingestion and Storage Architecture Strategy

## 🏗️ **System Architecture Overview**

### **Core Philosophy**
- **Serverless-First**: Leverage existing AWS serverless infrastructure for scalability and cost efficiency
- **Event-Driven**: Real-time processing pipeline with SQS queues and webhooks
- **AI-Native**: Built-in intelligence for content analysis and project association
- **Security-First**: End-to-end encryption, secure token storage, and minimal permissions

---

## 🎯 **Architecture Strategy**

### **1. Microservices Architecture Pattern**
```
┌─────────────────────────────────────────────────────────────────────┐
│                     EMAIL PROCESSING PIPELINE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │   Gmail     │    │  Outlook    │    │   Future    │              │
│  │  Webhooks   │    │  Webhooks   │    │ Providers   │              │
│  └─────┬───────┘    └─────┬───────┘    └─────┬───────┘              │
│        │                  │                  │                      │
│        └──────────────────┼──────────────────┘                      │
│                           │                                         │
│  ┌─────────────────────────▼─────────────────────────┐              │
│  │              INGESTION SERVICE                    │              │
│  │        /api/email/webhook/{provider}              │              │
│  │  • Webhook verification                           │              │
│  │  • Message extraction                             │              │
│  │  • Queue distribution                             │              │
│  └─────────────────────┬───────────────────────────┘              │
│                        │                                           │
│  ┌─────────────────────▼───────────────────────────┐              │
│  │                 SQS QUEUES                       │              │
│  │  email-processing-queue ────┐                   │              │
│  │  email-analysis-queue ──────┤                   │              │
│  │  email-association-queue ───┤                   │              │
│  │  email-notification-queue ──┘                   │              │
│  └─────────────────────┬───────────────────────────┘              │
│                        │                                           │
│  ┌─────────────────────▼───────────────────────────┐              │
│  │              PROCESSING SERVICES                 │              │
│  │  • Content Fetcher Service                       │              │
│  │  • AI Analysis Service                           │              │
│  │  • Project Association Service                   │              │
│  │  • Notification Service                          │              │
│  └─────────────────────┬───────────────────────────┘              │
│                        │                                           │
│  ┌─────────────────────▼───────────────────────────┐              │
│  │                STORAGE LAYER                     │              │
│  │  S3 Bucket ────────┬─── PostgreSQL               │              │
│  │  • Raw emails      │    • Metadata               │              │
│  │  • Attachments     │    • Analysis results       │              │
│  │  • Processed data  │    • Project associations   │              │
│  └────────────────────┴─────────────────────────────┘              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### **2. Data Flow Architecture**
```
Email Provider → Webhook → API Route → SQS Queue → Processing Service → Storage → UI
      ↓           ↓         ↓          ↓             ↓                ↓       ↓
   Gmail API   Verification Message  Parallel      AI Analysis     S3 +   Dashboard
   Push Notif   & Auth      Queue    Processing    & Association  Database  Updates
```

---

## 🔧 **Technical Implementation Strategy**

### **Phase 1: Foundation Infrastructure (Week 1)**

#### **Database Schema Extensions**
```typescript
// Add to existing Prisma schema
model EmailMessage {
  id              String   @id @default(cuid())
  
  // Provider metadata
  messageId       String   @unique
  threadId        String?
  provider        String   // "gmail", "outlook"
  providerData    Json?    // Provider-specific metadata
  
  // Email details
  subject         String?
  sender          String
  senderName      String?
  recipients      String[]
  ccRecipients    String[]
  bccRecipients   String[]
  sentAt          DateTime
  receivedAt      DateTime
  
  // Content storage
  bodyText        String?
  bodyHtml        String?
  s3ContentPath   String?     // S3 path for full email content
  s3AttachmentPaths String[]  // S3 paths for attachments
  
  // Processing pipeline status
  ingestionStatus String   @default("pending") // pending, processing, completed, failed
  analysisStatus  String   @default("pending") // pending, processing, completed, failed
  associationStatus String @default("pending") // pending, processing, completed, failed
  
  // AI analysis results
  relevanceScore  Float?      // 0.0-1.0 construction project relevance
  aiSummary       String?     // AI-generated summary
  classification  Json?       // { category: "quote", confidence: 0.95, subcategory: "..." }
  actionItems     Json?       // [{ task, deadline, assignee, priority }]
  urgencyLevel    String?     // "low", "normal", "high", "urgent"
  extractedData   Json?       // { amounts: [], dates: [], contacts: [], addresses: [] }
  
  // Project association
  projectAssociations Json?   // [{ projectId, confidence, type: "primary"|"referenced" }]
  
  // Error handling
  processingErrors Json?      // { ingestion: "error", analysis: "error", association: "error" }
  retryCount      Int     @default(0)
  lastProcessedAt DateTime?
  
  // Relations
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId       String?  // Primary project association
  project         Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("email_messages")
  @@index([userId, receivedAt])
  @@index([projectId, receivedAt])
  @@index([ingestionStatus])
  @@index([analysisStatus])
  @@index([urgencyLevel])
}

model EmailAttachment {
  id              String   @id @default(cuid())
  
  // Attachment metadata
  filename        String
  contentType     String
  sizeBytes       Int
  s3Path          String   // S3 storage path
  
  // Processing status
  isProcessed     Boolean  @default(false)
  extractedText   String?  // OCR or parsed text content
  aiAnalysis      Json?    // AI analysis of attachment content
  
  // Relations
  emailMessageId  String
  emailMessage    EmailMessage @relation(fields: [emailMessageId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("email_attachments")
}

model EmailProvider {
  id              String   @id @default(cuid())
  
  // Provider details
  type            String   // "gmail", "outlook"
  email           String   // Connected email address
  isActive        Boolean  @default(true)
  
  // OAuth tokens (encrypted)
  accessToken     String?
  refreshToken    String?
  tokenExpiry     DateTime?
  
  // Webhook configuration
  webhookId       String?  // Provider-specific webhook ID
  webhookActive   Boolean  @default(false)
  
  // Monitoring settings
  lastSyncAt      DateTime?
  syncErrors      Json?
  
  // Relations
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("email_providers")
  @@unique([userId, type, email])
}
```

#### **CDK Infrastructure Extensions**
```typescript
// Add to existing NailItInfrastructureStack
export class EmailProcessingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EmailProcessingStackProps) {
    super(scope, id, props);

    // Additional SQS Queues for email processing
    const emailProcessingQueue = new sqs.Queue(this, 'EmailProcessingQueue', {
      queueName: `nailit-${props.envConfig.resourceSuffix}-email-processing`,
      visibilityTimeout: cdk.Duration.minutes(15),
      retentionPeriod: cdk.Duration.days(14),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'EmailProcessingDLQ', {
          queueName: `nailit-${props.envConfig.resourceSuffix}-email-processing-dlq`,
          retentionPeriod: cdk.Duration.days(14),
        }),
        maxReceiveCount: 3,
      },
    });

    const emailAnalysisQueue = new sqs.Queue(this, 'EmailAnalysisQueue', {
      queueName: `nailit-${props.envConfig.resourceSuffix}-email-analysis`,
      visibilityTimeout: cdk.Duration.minutes(10),
      retentionPeriod: cdk.Duration.days(14),
    });

    const emailAssociationQueue = new sqs.Queue(this, 'EmailAssociationQueue', {
      queueName: `nailit-${props.envConfig.resourceSuffix}-email-association`,
      visibilityTimeout: cdk.Duration.minutes(5),
      retentionPeriod: cdk.Duration.days(14),
    });

    // Lambda Functions for email processing
    const emailIngestionFunction = new nodejs.NodejsFunction(this, 'EmailIngestionFunction', {
      functionName: `nailit-${props.envConfig.resourceSuffix}-email-ingestion`,
      entry: 'src/lambda/email-ingestion/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        DATABASE_URL: props.databaseUrl,
        EMAIL_PROCESSING_QUEUE_URL: emailProcessingQueue.queueUrl,
        S3_BUCKET: props.emailBucket.bucketName,
      },
    });

    const emailAnalysisFunction = new nodejs.NodejsFunction(this, 'EmailAnalysisFunction', {
      functionName: `nailit-${props.envConfig.resourceSuffix}-email-analysis`,
      entry: 'src/lambda/email-analysis/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      environment: {
        DATABASE_URL: props.databaseUrl,
        OPENAI_API_KEY: props.openaiApiKey,
        S3_BUCKET: props.emailBucket.bucketName,
        EMAIL_ASSOCIATION_QUEUE_URL: emailAssociationQueue.queueUrl,
      },
    });

    // SQS event sources
    emailIngestionFunction.addEventSource(new SqsEventSource(emailProcessingQueue));
    emailAnalysisFunction.addEventSource(new SqsEventSource(emailAnalysisQueue));

    // IAM permissions
    props.emailBucket.grantReadWrite(emailIngestionFunction);
    props.emailBucket.grantRead(emailAnalysisFunction);
    emailProcessingQueue.grantSendMessages(emailIngestionFunction);
    emailAnalysisQueue.grantConsumeMessages(emailAnalysisFunction);
  }
}
```

### **Phase 2: Core Services Implementation (Weeks 2-4)**

#### **API Route Structure**
```
app/api/email/
├── webhook/
│   ├── gmail/route.ts           # Gmail push notifications
│   ├── outlook/route.ts         # Microsoft Graph webhooks  
│   └── verify/route.ts          # Webhook verification
├── oauth/
│   ├── gmail/
│   │   ├── route.ts             # Initiate OAuth flow
│   │   └── callback/route.ts    # Handle OAuth callback
│   └── outlook/
│       ├── route.ts             # Initiate OAuth flow
│       └── callback/route.ts    # Handle OAuth callback
├── providers/
│   ├── route.ts                 # List connected providers
│   ├── connect/route.ts         # Connect new provider
│   └── disconnect/route.ts      # Disconnect provider
├── messages/
│   ├── route.ts                 # List emails with filtering
│   ├── [id]/route.ts           # Get specific email
│   ├── [id]/content/route.ts   # Get full email content from S3
│   └── [id]/reprocess/route.ts # Reprocess email
├── analysis/
│   ├── trigger/route.ts         # Manually trigger analysis
│   └── feedback/route.ts       # Submit AI feedback
└── sync/
    ├── route.ts                 # Manual sync trigger
    └── status/route.ts          # Sync status
```

#### **Service Layer Architecture**
```typescript
// Core service interfaces
interface EmailIngestionService {
  processWebhook(provider: string, payload: any): Promise<void>;
  fetchEmailContent(provider: string, messageId: string): Promise<EmailContent>;
  storeEmailContent(email: EmailContent): Promise<string>; // Returns S3 path
}

interface EmailAnalysisService {
  analyzeRelevance(content: EmailContent, userContext: UserContext): Promise<RelevanceScore>;
  classifyEmail(content: EmailContent): Promise<EmailClassification>;
  extractEntities(content: EmailContent): Promise<ExtractedEntities>;
  detectUrgency(content: EmailContent): Promise<UrgencyLevel>;
  extractActionItems(content: EmailContent): Promise<ActionItem[]>;
}

interface ProjectAssociationService {
  associateWithProjects(email: EmailMessage, analysis: EmailAnalysis): Promise<ProjectAssociation[]>;
  calculateAssociationConfidence(email: EmailMessage, project: Project): Promise<number>;
  findMultiProjectReferences(content: string): Promise<ProjectReference[]>;
}

interface NotificationService {
  shouldTriggerNotification(email: EmailMessage, analysis: EmailAnalysis): Promise<boolean>;
  sendEmailNotification(email: EmailMessage, recipients: string[]): Promise<void>;
  sendPushNotification(email: EmailMessage, userId: string): Promise<void>;
}
```

### **Phase 3: AI Processing Pipeline (Weeks 5-7)**

#### **AI Analysis Architecture**
```typescript
class EmailAnalysisEngine {
  private openai: OpenAI;
  private userContextCache: Map<string, UserContext>;

  async analyzeEmail(email: EmailMessage): Promise<EmailAnalysis> {
    const userContext = await this.getUserContext(email.userId);
    
    // Parallel analysis for efficiency
    const [relevance, classification, entities, urgency, actionItems] = await Promise.all([
      this.analyzeRelevance(email, userContext),
      this.classifyEmail(email),
      this.extractEntities(email),
      this.detectUrgency(email),
      this.extractActionItems(email)
    ]);

    return {
      relevanceScore: relevance.score,
      classification,
      extractedData: entities,
      urgencyLevel: urgency,
      actionItems,
      aiSummary: await this.generateSummary(email, { relevance, classification, entities }),
      confidence: this.calculateOverallConfidence([relevance, classification, entities, urgency])
    };
  }

  private async analyzeRelevance(email: EmailMessage, context: UserContext): Promise<RelevanceAnalysis> {
    const prompt = this.buildRelevancePrompt(email, context);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: RELEVANCE_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  private buildRelevancePrompt(email: EmailMessage, context: UserContext): string {
    return `
Analyze this email for construction project relevance:

Email Details:
- Subject: ${email.subject}
- From: ${email.sender}
- Content: ${email.bodyText || email.bodyHtml}

User Context:
- Active Projects: ${context.projects.map(p => p.name).join(', ')}
- Project Participants: ${context.participants.join(', ')}
- Project Addresses: ${context.addresses.join(', ')}

Return JSON:
{
  "score": 0.0-1.0,
  "reasoning": "explanation",
  "projectMatches": ["project names"],
  "participantMatches": ["contact names"],
  "confidence": 0.0-1.0
}
    `;
  }
}
```

### **Phase 4: Real-time Processing (Weeks 8-10)**

#### **Event-Driven Processing Flow**
```typescript
// Webhook handler implementation
export async function POST(request: NextRequest) {
  const provider = getProviderFromPath(request.url);
  const signature = request.headers.get('x-webhook-signature');
  const body = await request.text();

  // 1. Verify webhook authenticity
  if (!verifyWebhookSignature(provider, body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Parse webhook payload
  const webhook = parseWebhookPayload(provider, body);
  
  // 3. Queue for processing
  await queueEmailForProcessing({
    provider,
    messageId: webhook.messageId,
    userId: webhook.userId,
    timestamp: new Date()
  });

  return NextResponse.json({ success: true });
}

// Processing queue handler
async function processEmailMessage(queueMessage: EmailQueueMessage) {
  try {
    // 1. Fetch full email content
    const emailContent = await fetchEmailFromProvider(queueMessage);
    
    // 2. Store in database and S3
    const emailRecord = await storeEmailMessage(emailContent);
    
    // 3. Queue for AI analysis
    await queueForAnalysis(emailRecord.id);
    
    // 4. Update processing status
    await updateEmailStatus(emailRecord.id, 'ingested');
    
  } catch (error) {
    await handleProcessingError(queueMessage, error);
  }
}
```

---

## 🚀 **Phased Development Plan**

### **Phase 1: Foundation (Weeks 1-3)**
**Goal**: Establish core infrastructure and basic email ingestion

**Week 1: Database & Infrastructure**
- [ ] Extend Prisma schema with EmailMessage, EmailAttachment, EmailProvider models
- [ ] Run database migrations across all environments
- [ ] Deploy CDK updates for additional SQS queues
- [ ] Set up S3 bucket policies and lifecycle rules

**Week 2: OAuth Implementation**
- [ ] Implement Gmail OAuth 2.0 flow with PKCE
- [ ] Create OAuth callback handlers
- [ ] Build provider management UI
- [ ] Test OAuth flow end-to-end

**Week 3: Basic Ingestion**
- [ ] Implement Gmail webhook handlers
- [ ] Create email content fetching service
- [ ] Build S3 storage pipeline
- [ ] Test basic email capture and storage

**Exit Criteria Phase 1:**
- [ ] Gmail OAuth flow completely functional
- [ ] Webhooks receiving and processing notifications
- [ ] Email content stored securely in S3
- [ ] Basic metadata recorded in database
- [ ] No data loss in processing pipeline

### **Phase 2: AI Analysis Engine (Weeks 4-6)**
**Goal**: Implement intelligent email analysis and classification

**Week 4: AI Service Foundation**
- [ ] Set up OpenAI API integration
- [ ] Implement relevance scoring algorithm
- [ ] Build email classification system
- [ ] Create entity extraction pipeline

**Week 5: Advanced Analysis**
- [ ] Implement urgency detection
- [ ] Build action item extraction
- [ ] Create email summarization
- [ ] Develop confidence scoring system

**Week 6: Analysis Integration**
- [ ] Integrate AI services with processing pipeline
- [ ] Implement analysis result storage
- [ ] Build analysis feedback system
- [ ] Test analysis accuracy and performance

**Exit Criteria Phase 2:**
- [ ] Relevance scoring accuracy >90% on test dataset
- [ ] Email classification accuracy >85% on test dataset
- [ ] Entity extraction functional for all key data types
- [ ] Analysis results properly stored and retrievable
- [ ] Performance under 30 seconds per email

### **Phase 3: Project Association (Weeks 7-8)**
**Goal**: Automatically link emails to relevant projects

**Week 7: Association Algorithm**
- [ ] Implement participant matching logic
- [ ] Build content similarity analysis
- [ ] Create project context scoring
- [ ] Develop confidence calculation

**Week 8: Multi-Project Support**
- [ ] Implement multi-project detection
- [ ] Build primary/secondary association logic
- [ ] Create manual override system
- [ ] Test association accuracy

**Exit Criteria Phase 3:**
- [ ] Project association accuracy >80% on test dataset
- [ ] Multi-project detection working correctly
- [ ] Manual override system functional
- [ ] Association confidence scores accurate

### **Phase 4: Dashboard Integration (Weeks 9-10)**
**Goal**: Present email data in user-friendly interface

**Week 9: Email Views**
- [ ] Build email timeline component
- [ ] Create email detail views
- [ ] Implement filtering and search
- [ ] Add email status indicators

**Week 10: Integration & Optimization**
- [ ] Integrate with project dashboard
- [ ] Optimize performance for large volumes
- [ ] Add real-time updates
- [ ] Implement responsive design

**Exit Criteria Phase 4:**
- [ ] Email timeline view fully functional
- [ ] Search and filtering working correctly
- [ ] Performance optimized for 1000+ emails
- [ ] Real-time updates operational

### **Phase 5: Advanced Features (Weeks 11-13)**
**Goal**: Add multi-provider support and advanced capabilities

**Week 11: Outlook Integration**
- [ ] Implement Microsoft Graph OAuth
- [ ] Build Outlook webhook handlers
- [ ] Adapt processing pipeline for Outlook
- [ ] Test Outlook integration

**Week 12: Multi-Account Management**
- [ ] Build account management interface
- [ ] Implement per-account controls
- [ ] Add account status monitoring
- [ ] Test multi-account scenarios

**Week 13: Notifications & Alerts**
- [ ] Implement urgent email detection
- [ ] Build notification delivery system
- [ ] Create notification preferences
- [ ] Test alerting pipeline

**Exit Criteria Phase 5:**
- [ ] Outlook integration fully functional
- [ ] Multi-account management working
- [ ] Notification system operational
- [ ] All providers working in parallel

---

## 🧪 **Testing Strategy**

### **Behavior-Driven Development Approach**

#### **Test Framework Structure**
```typescript
// tests/bdd/features/email-processing.feature
Feature: Email Processing Pipeline
  As a project manager
  I want automated email processing
  So that I never miss important project communications

Background:
  Given I am a logged-in user with active projects
  And I have Gmail connected with valid OAuth tokens

Scenario: Real-time Email Ingestion
  Given my Gmail account receives a new email from a contractor
  When the Gmail webhook is triggered
  Then the email is captured within 30 seconds
  And stored securely in S3 with encryption
  And metadata is recorded in database
  And processing status is set to "pending"

Scenario: AI Content Analysis
  Given an email is successfully ingested
  When the AI analysis pipeline processes it
  Then relevance score is calculated between 0.0-1.0
  And email category is assigned with confidence score
  And important entities are extracted accurately
  And urgency level is determined appropriately
  And results are stored in database

Scenario: Project Association
  Given an email has been analyzed by AI
  When the project association algorithm runs
  Then email is linked to the most relevant project
  And association confidence score is provided
  And multi-project references are detected
  And user can override incorrect associations

Scenario: Dashboard Integration
  Given processed emails exist for my projects
  When I view the project communications timeline
  Then I see emails sorted chronologically
  And can filter by category, urgency, or date
  And can search email content and metadata
  And can access full email content and attachments
```

#### **Integration Test Categories**

**1. OAuth Flow Tests**
```typescript
describe('Gmail OAuth Integration', () => {
  test('should complete OAuth flow successfully', async () => {
    // Test OAuth authorization URL generation
    // Test callback handling and token storage
    // Test token refresh mechanism
    // Test error handling for invalid tokens
  });
});
```

**2. Webhook Processing Tests**
```typescript
describe('Email Webhook Processing', () => {
  test('should process Gmail webhook correctly', async () => {
    // Test webhook signature verification
    // Test payload parsing and extraction
    // Test queue message creation
    // Test error handling for malformed payloads
  });
});
```

**3. AI Analysis Tests**
```typescript
describe('Email AI Analysis', () => {
  test('should analyze email relevance accurately', async () => {
    // Test relevance scoring with known datasets
    // Test classification accuracy
    // Test entity extraction precision
    // Test urgency detection accuracy
  });
});
```

**4. Storage Integration Tests**
```typescript
describe('Email Storage Pipeline', () => {
  test('should store email content securely', async () => {
    // Test S3 upload with encryption
    // Test database metadata storage
    // Test attachment handling
    // Test storage lifecycle management
  });
});
```

**5. Performance Tests**
```typescript
describe('System Performance', () => {
  test('should handle high email volumes', async () => {
    // Test processing 1000+ emails
    // Test concurrent processing
    // Test memory usage optimization
    // Test response time requirements
  });
});
```

**6. Security Tests**
```typescript
describe('Security & Privacy', () => {
  test('should protect sensitive email data', async () => {
    // Test data encryption at rest and in transit
    // Test access control and authorization
    // Test token security and rotation
    // Test audit trail completeness
  });
});
```

### **Test Data Management**
```typescript
// Test data fixtures for consistent testing
const testEmails = {
  highRelevance: {
    subject: "Urgent: Foundation inspection scheduled for tomorrow",
    sender: "inspector@citycode.gov",
    content: "Inspector will arrive at 8 AM for foundation inspection..."
  },
  quote: {
    subject: "Electrical work quote - Kitchen renovation",
    sender: "mike@electricpro.com", 
    content: "Please find attached quote for electrical work totaling $3,500..."
  },
  lowRelevance: {
    subject: "Newsletter: Home improvement trends",
    sender: "newsletter@homedepot.com",
    content: "Check out the latest trends in home improvement..."
  }
};
```

### **Continuous Integration Pipeline**
```yaml
# .github/workflows/email-processing-tests.yml
name: Email Processing Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_API_KEY }}
      
      - name: Run BDD tests
        run: npm run test:bdd
      
      - name: Run performance tests
        run: npm run test:performance
```

This comprehensive architecture strategy provides a solid foundation for implementing intelligent email processing with clear phases, measurable success criteria, and robust testing strategies that align with your existing infrastructure. 