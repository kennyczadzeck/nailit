# Email Ingestion and Storage Architecture Strategy

## 🏗️ **System Architecture Overview**

### **Core Philosophy**
- **Homeowner-Centric**: **CRITICAL PRINCIPLE** - Email ingestion ONLY processes emails from the homeowner's Gmail account (the nailit user). This ensures complete project communication visibility while maintaining privacy and relevance.
- **Serverless-First**: Leverage existing AWS serverless infrastructure for scalability and cost efficiency
- **Event-Driven**: Real-time processing pipeline with SQS queues and webhooks
- **AI-Native**: Built-in intelligence for content analysis and project association
- **Security-First**: End-to-end encryption, secure token storage, and minimal permissions

## 🎯 **CRITICAL ARCHITECTURAL PRINCIPLE: Homeowner-Only Email Ingestion**

### **Why Homeowner-Only?**
The homeowner is the **single source of truth** for all project communications because:

1. **Complete Visibility**: Homeowner receives ALL project-related emails (from contractors, permits, suppliers, etc.)
2. **Privacy Compliance**: Only accessing the nailit user's own email account
3. **Relevance Filtering**: Homeowner's inbox naturally filters to project-relevant communications
4. **Bidirectional Capture**: Both contractor→homeowner and homeowner→contractor emails are captured
5. **Unified Timeline**: Single account provides complete communication history

### **Email Flow Architecture**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    HOMEOWNER-ONLY EMAIL INGESTION                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    CONTRACTORS                                  │ │
│  │  contractor1@company.com  contractor2@company.com              │ │
│  │  inspector@city.gov       supplier@materials.com              │ │
│  └─────────────────────┬───────────────────────────────────────────┘ │
│                        │ ALL EMAILS SENT TO                        │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │               HOMEOWNER GMAIL ACCOUNT                          │ │
│  │            homeowner@gmail.com (NAILIT USER)                   │ │
│  │                                                                 │ │
│  │  📧 Contractor quotes    📧 Permit approvals                   │ │
│  │  📧 Schedule updates     📧 Invoice notifications              │ │
│  │  📧 Delivery notices     📧 Change order requests             │ │
│  │  📧 Homeowner replies    📧 Follow-up questions               │ │
│  └─────────────────────┬───────────────────────────────────────────┘ │
│                        │ NAILIT INGESTION (HOMEOWNER ONLY)        │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                 NAILIT DATABASE                                 │ │
│  │        Complete Project Communication History                   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### **NEVER Access Contractor Emails Directly**
- ❌ **NEVER** connect to contractor Gmail accounts
- ❌ **NEVER** request contractor email access
- ❌ **NEVER** process emails from contractor inboxes
- ✅ **ALWAYS** process only homeowner Gmail account
- ✅ **CAPTURE** contractor emails when they send to homeowner
- ✅ **MAINTAIN** complete conversation history through homeowner inbox

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

#### **Homeowner-Only Database Schema**
```typescript
// CRITICAL: All email ingestion is homeowner-centric
model EmailMessage {
  id              String   @id @default(cuid())
  
  // HOMEOWNER-ONLY: Always from homeowner's Gmail account
  provider        String   // Always "gmail" for homeowner account
  providerData    Json?    // Homeowner Gmail API metadata only
  
  // Email details (captured from homeowner's perspective)
  subject         String?
  sender          String   // Can be contractor OR homeowner
  recipients      String[] // Can be contractor OR homeowner
  sentAt          DateTime
  receivedAt      DateTime // When homeowner received it
  
  // Content storage (from homeowner's Gmail)
  bodyText        String?
  bodyHtml        String?
  s3ContentPath   String?     // S3 path for homeowner's email content
  s3AttachmentPaths String[]  // Attachments from homeowner's Gmail
  
  // Processing pipeline status
  ingestionStatus String   @default("pending") // pending, processing, completed, failed
  analysisStatus  String   @default("pending") // pending, processing, completed, failed
  assignmentStatus String @default("pending") // pending, processing, completed, failed
  
  // AI analysis results (homeowner-focused)
  relevanceScore  Float?      // 0.0-1.0 project relevance FOR HOMEOWNER
  aiSummary       String?     // AI summary from homeowner's perspective
  classification  Json?       // Classification for homeowner's project
  actionItems     Json?       // Action items for homeowner
  urgencyLevel    String?     // Urgency level for homeowner
  extractedData   Json?       // Data extracted from homeowner's emails
  
  // Project association (homeowner's projects only)
  projectAssociations Json?   // Homeowner's project associations only
  
  // Relations (homeowner-centric)
  userId          String      // ALWAYS the homeowner's user ID
  user            User        // ALWAYS the homeowner
  projectId       String?     // ALWAYS homeowner's project
  project         Project?    // ALWAYS homeowner's project
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("email_messages")
  @@index([userId, receivedAt])  // Homeowner's emails by date
  @@index([projectId, receivedAt]) // Homeowner's project emails
}
```

#### **Homeowner-Only OAuth Configuration**
```typescript
// CRITICAL: Only homeowner Gmail OAuth is supported
model EmailProvider {
  id              String   @id @default(cuid())
  
  // Provider details (homeowner only)
  type            String   // ALWAYS "gmail"
  email           String   // ALWAYS homeowner's email
  isActive        Boolean  @default(true)
  
  // OAuth tokens (homeowner's Gmail only)
  accessToken     String?  // Homeowner's Gmail access token
  refreshToken    String?  // Homeowner's Gmail refresh token
  tokenExpiry     DateTime?
  
  // Webhook configuration (homeowner's Gmail only)
  webhookId       String?  // Gmail webhook for homeowner account
  webhookActive   Boolean  @default(false)
  
  // Relations (homeowner only)
  userId          String   // ALWAYS homeowner's user ID
  user            User     // ALWAYS homeowner
  
  @@map("email_providers")
  @@unique([userId, type, email]) // One Gmail per homeowner
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

### **Phase 2: Homeowner-Only Processing Pipeline (Weeks 2-4)**

#### **API Route Structure (Homeowner-Focused)**
```
app/api/email/
├── webhook/
│   └── gmail/route.ts           # HOMEOWNER Gmail webhooks ONLY
├── oauth/
│   └── gmail/
│       ├── route.ts             # HOMEOWNER Gmail OAuth ONLY
│       └── callback/route.ts    # HOMEOWNER Gmail callback ONLY
├── providers/
│   ├── route.ts                 # List HOMEOWNER Gmail connection
│   ├── connect/route.ts         # Connect HOMEOWNER Gmail ONLY
│   └── disconnect/route.ts      # Disconnect HOMEOWNER Gmail
├── messages/
│   ├── route.ts                 # List HOMEOWNER's emails
│   ├── [id]/route.ts           # Get HOMEOWNER's email
│   └── [id]/content/route.ts   # Get HOMEOWNER's email content
└── sync/
    ├── route.ts                 # Sync HOMEOWNER Gmail ONLY
    └── status/route.ts          # HOMEOWNER Gmail sync status
```

#### **Homeowner-Only Service Layer**
```typescript
// Core service interfaces (homeowner-centric)
interface EmailIngestionService {
  // ONLY processes homeowner Gmail webhooks
  processHomeownerWebhook(payload: any): Promise<void>;
  
  // ONLY fetches from homeowner Gmail
  fetchHomeownerEmailContent(messageId: string): Promise<EmailContent>;
  
  // ONLY stores homeowner email content
  storeHomeownerEmailContent(email: EmailContent): Promise<string>;
}

interface EmailAnalysisService {
  // Analyzes relevance FOR HOMEOWNER
  analyzeHomeownerRelevance(content: EmailContent, homeownerContext: UserContext): Promise<RelevanceScore>;
  
  // Classifies email from HOMEOWNER'S perspective
  classifyHomeownerEmail(content: EmailContent): Promise<EmailClassification>;
  
  // Extracts entities relevant to HOMEOWNER
  extractHomeownerEntities(content: EmailContent): Promise<ExtractedEntities>;
}

interface ProjectAssociationService {
  // Associates with HOMEOWNER'S projects only
  associateWithHomeownerProjects(email: EmailMessage, analysis: EmailAnalysis): Promise<ProjectAssociation[]>;
  
  // Calculates confidence for HOMEOWNER'S project association
  calculateHomeownerAssociationConfidence(email: EmailMessage, homeownerProject: Project): Promise<number>;
}
```

### **Phase 3: Homeowner-Only AI Processing (Weeks 5-7)**

#### **Homeowner-Focused AI Analysis**
```typescript
class HomeownerEmailAnalysisEngine {
  private openai: OpenAI;
  private homeownerContextCache: Map<string, HomeownerContext>;

  async analyzeHomeownerEmail(email: EmailMessage): Promise<EmailAnalysis> {
    // CRITICAL: Only analyze from homeowner's perspective
    const homeownerContext = await this.getHomeownerContext(email.userId);
    
    // All analysis is homeowner-focused
    const [relevance, classification, entities, urgency, actionItems] = await Promise.all([
      this.analyzeHomeownerRelevance(email, homeownerContext),
      this.classifyHomeownerEmail(email),
      this.extractHomeownerEntities(email),
      this.detectHomeownerUrgency(email),
      this.extractHomeownerActionItems(email)
    ]);

    return {
      relevanceScore: relevance.score,
      classification,
      extractedData: entities,
      urgencyLevel: urgency,
      actionItems,
      aiSummary: await this.generateHomeownerSummary(email, { relevance, classification, entities }),
      confidence: this.calculateOverallConfidence([relevance, classification, entities, urgency])
    };
  }

  private async analyzeHomeownerRelevance(email: EmailMessage, homeownerContext: HomeownerContext): Promise<RelevanceAnalysis> {
    const prompt = this.buildHomeownerRelevancePrompt(email, homeownerContext);
    
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: HOMEOWNER_RELEVANCE_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  private buildHomeownerRelevancePrompt(email: EmailMessage, homeownerContext: HomeownerContext): string {
    return `
Analyze this email for construction project relevance FROM THE HOMEOWNER'S PERSPECTIVE:

Email Details:
- Subject: ${email.subject}
- From: ${email.sender}
- To: ${email.recipients.join(', ')}
- Content: ${email.bodyText || email.bodyHtml}

Homeowner Context:
- Homeowner Projects: ${homeownerContext.projects.map(p => p.name).join(', ')}
- Project Contractors: ${homeownerContext.contractors.join(', ')}
- Project Addresses: ${homeownerContext.addresses.join(', ')}

IMPORTANT: This email was found in the HOMEOWNER'S Gmail inbox. Analyze its relevance 
to the homeowner's renovation projects and determine what action the homeowner should take.

Return JSON:
{
  "score": 0.0-1.0,
  "reasoning": "explanation from homeowner's perspective",
  "projectMatches": ["homeowner's project names"],
  "contractorMatches": ["contractor names"],
  "homeownerActionRequired": true/false,
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

## 🚀 **Homeowner-Only Development Plan**

### **Phase 1: Homeowner Foundation (Weeks 1-3)**
**Goal**: Establish homeowner-only email ingestion infrastructure

**Week 1: Homeowner Database & Infrastructure**
- [ ] Extend Prisma schema with homeowner-only EmailMessage model
- [ ] Add homeowner-only constraints and indexes
- [ ] Deploy CDK updates for homeowner Gmail processing
- [ ] Set up S3 bucket for homeowner email content only

**Week 2: Homeowner OAuth Implementation**
- [ ] Implement homeowner-only Gmail OAuth 2.0 flow
- [ ] Create homeowner OAuth callback handlers
- [ ] Build homeowner provider management UI
- [ ] Test homeowner OAuth flow end-to-end

**Week 3: Homeowner Email Ingestion**
- [ ] Implement homeowner Gmail webhook handlers
- [ ] Create homeowner email content fetching service
- [ ] Build homeowner S3 storage pipeline
- [ ] Test homeowner email capture and storage

**Exit Criteria Phase 1:**
- [ ] Homeowner Gmail OAuth flow completely functional
- [ ] Homeowner webhooks receiving and processing notifications
- [ ] Homeowner email content stored securely in S3
- [ ] Homeowner metadata recorded in database
- [ ] No contractor email access attempted

### **Phase 2: Homeowner AI Analysis (Weeks 4-6)**
**Goal**: Implement homeowner-focused email analysis

**Week 4: Homeowner AI Foundation**
- [ ] Set up homeowner-focused OpenAI prompts
- [ ] Implement homeowner relevance scoring
- [ ] Build homeowner email classification
- [ ] Create homeowner entity extraction

**Week 5: Homeowner Advanced Analysis**
- [ ] Implement homeowner urgency detection
- [ ] Build homeowner action item extraction
- [ ] Create homeowner email summarization
- [ ] Develop homeowner confidence scoring

**Week 6: Homeowner Analysis Integration**
- [ ] Integrate homeowner AI services with processing pipeline
- [ ] Implement homeowner analysis result storage
- [ ] Build homeowner analysis feedback system
- [ ] Test homeowner analysis accuracy

**Exit Criteria Phase 2:**
- [ ] Homeowner relevance scoring accuracy >90%
- [ ] Homeowner email classification accuracy >85%
- [ ] Homeowner entity extraction functional
- [ ] Homeowner analysis results stored properly
- [ ] No contractor-specific analysis attempted

### **Phase 3: Homeowner Project Association (Weeks 7-8)**
**Goal**: Link emails to homeowner's projects only

**Week 7: Homeowner Association Algorithm**
- [ ] Implement homeowner project matching logic
- [ ] Build homeowner content similarity analysis
- [ ] Create homeowner project context scoring
- [ ] Develop homeowner confidence calculation

**Week 8: Homeowner Multi-Project Support**
- [ ] Implement homeowner multi-project detection
- [ ] Build homeowner project association logic
- [ ] Create homeowner manual override system
- [ ] Test homeowner association accuracy

**Exit Criteria Phase 3:**
- [ ] Homeowner project association accuracy >80%
- [ ] Homeowner multi-project detection working
- [ ] Homeowner override system functional
- [ ] No contractor project association attempted

---

## 🧪 **Homeowner-Only Testing Strategy**

### **Testing Philosophy**
All testing focuses exclusively on the homeowner's email experience:

1. **Homeowner Gmail Account Testing**: Use `nailit.test.homeowner@gmail.com` as the ONLY source
2. **Contractor Email Simulation**: Generate emails FROM contractors TO homeowner
3. **Bidirectional Capture**: Test both contractor→homeowner and homeowner→contractor flows
4. **Homeowner Perspective**: All analysis and classification from homeowner's viewpoint

### **Test Data Strategy**
```typescript
// Homeowner-only test configuration
const homeownerTestConfig = {
  // ONLY homeowner Gmail account
  homeownerEmail: 'nailit.test.homeowner@gmail.com',
  
  // Contractor emails (send TO homeowner, never access directly)
  contractorEmails: [
    'nailit.test.contractor@gmail.com',
    'inspector@city.gov',
    'supplier@materials.com'
  ],
  
  // Test scenarios (all from homeowner's perspective)
  testScenarios: [
    'Contractor sends quote to homeowner',
    'Homeowner replies with questions',
    'Inspector sends permit approval to homeowner',
    'Homeowner forwards email to contractor',
    'Supplier sends delivery notice to homeowner'
  ]
};
```

### **Homeowner-Only Integration Tests**
```typescript
describe('Homeowner Email Integration', () => {
  test('should process homeowner Gmail webhook only', async () => {
    // Test homeowner Gmail webhook processing
    // Verify no contractor Gmail access attempted
    // Confirm homeowner emails captured correctly
  });
  
  test('should analyze emails from homeowner perspective', async () => {
    // Test homeowner-focused AI analysis
    // Verify homeowner project association
    // Confirm homeowner action items extracted
  });
});
```

---

## 📋 **Homeowner-Only Compliance Checklist**

### **Architecture Compliance**
- [ ] All email ingestion uses homeowner Gmail account only
- [ ] No contractor email accounts accessed directly
- [ ] All OAuth flows are homeowner-only
- [ ] All webhooks are homeowner Gmail webhooks
- [ ] All database records are homeowner-centric

### **AI Analysis Compliance**
- [ ] All relevance scoring is homeowner-focused
- [ ] All classification is from homeowner's perspective
- [ ] All entity extraction serves homeowner needs
- [ ] All action items are for homeowner
- [ ] All project association is homeowner's projects

### **Testing Compliance**
- [ ] All test accounts use homeowner Gmail only
- [ ] All test scenarios simulate homeowner experience
- [ ] All test data is homeowner-centric
- [ ] All validation checks homeowner perspective
- [ ] No contractor email testing attempted

### **Documentation Compliance**
- [ ] All documentation emphasizes homeowner-only approach
- [ ] All code comments clarify homeowner-only principle
- [ ] All API documentation specifies homeowner-only
- [ ] All user guides focus on homeowner experience
- [ ] All architecture diagrams show homeowner-only flow

---

This comprehensive architecture ensures that NailIt's email ingestion system maintains the critical homeowner-only principle while providing complete project communication visibility and intelligence. 