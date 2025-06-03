# NailIt Email Monitoring System - Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for the NailIt email monitoring system, featuring intelligent email ingestion, AI-powered analysis, and multi-channel communication monitoring. The system is designed to automatically detect project-relevant communications and extract actionable insights for construction project management.

## System Architecture Overview

### Core Technology Stack
- **Cloud Provider**: Amazon Web Services (AWS)
- **Frontend**: Next.js 15 on AWS Amplify Hosting
- **Database**: Amazon RDS PostgreSQL (Multi-AZ)
- **Cache**: Amazon ElastiCache Redis
- **Storage**: Amazon S3 with CloudFront CDN
- **AI/ML**: AWS Bedrock (Claude, GPT models)
- **Queue System**: Amazon SQS
- **Event Processing**: AWS Lambda Functions
- **API Gateway**: AWS API Gateway
- **Notifications**: Amazon SNS, SES

## Phase 1: Email Ingestion & Processing (Weeks 1-4)

### Message Ingestion Architecture
```
Gmail/Outlook → API Gateway → Lambda Functions → SQS → Processing Pipeline
```

### Core Components

#### API Gateway Endpoints
- `POST /webhooks/gmail` - Gmail push notifications
- `POST /webhooks/outlook` - Microsoft Graph webhooks
- `GET /auth/gmail/callback` - OAuth callback
- `GET /auth/outlook/callback` - Microsoft OAuth callback

#### Lambda Functions
1. **email-webhook-handler**
   - Receives webhook notifications
   - Validates authentication
   - Queues messages for processing
   - Runtime: Node.js 18.x
   - Memory: 256MB
   - Timeout: 30 seconds

2. **email-fetcher**
   - Retrieves full email content from providers
   - Handles OAuth token refresh
   - Downloads attachments to S3
   - Runtime: Node.js 18.x
   - Memory: 512MB
   - Timeout: 5 minutes

3. **email-parser**
   - Extracts metadata and content
   - Processes attachments
   - Prepares data for AI analysis
   - Runtime: Node.js 18.x
   - Memory: 256MB
   - Timeout: 2 minutes

#### SQS Queues
- **incoming-emails-queue**: Raw email notifications
  - Visibility timeout: 60 seconds
  - Message retention: 14 days
  - DLQ after 3 attempts

- **processing-queue**: Parsed emails ready for AI analysis
  - Visibility timeout: 300 seconds
  - Message retention: 14 days
  - DLQ after 5 attempts

- **dlq-queue**: Dead letter queue for failed processing
  - Message retention: 14 days
  - Alerts on message arrival

#### S3 Storage Strategy
```
Bucket Structure:
├── raw-emails-bucket/
│   ├── 2025/01/30/user-{userId}/email-{id}.eml
│   └── attachments/user-{userId}/email-{id}/
├── processed-content-bucket/
│   ├── extracted-text/user-{userId}/email-{id}.txt
│   └── ai-analysis/user-{userId}/email-{id}.json
└── archive-bucket/ (Glacier for long-term storage)
```

**Lifecycle Policies:**
- Raw emails: IA after 30 days, Glacier after 90 days
- Processed content: IA after 7 days, Glacier after 30 days
- Archive: Deep Archive after 1 year

#### Database Schema Extensions
```sql
-- Email Messages Table
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  thread_id VARCHAR(255),
  message_id VARCHAR(255) UNIQUE NOT NULL,
  subject TEXT,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  recipient_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  sent_at TIMESTAMP NOT NULL,
  received_at TIMESTAMP NOT NULL,
  body_text TEXT,
  body_html TEXT,
  s3_raw_path VARCHAR(500),
  s3_processed_path VARCHAR(500),
  relevance_score DECIMAL(3,2),
  ai_classification JSONB,
  ai_summary TEXT,
  action_items JSONB,
  urgency_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  status VARCHAR(20) DEFAULT 'pending', -- pending, processed, archived, error
  processing_attempts INTEGER DEFAULT 0,
  last_processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Attachments Table
CREATE TABLE email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(100),
  size_bytes INTEGER,
  s3_path VARCHAR(500),
  is_processed BOOLEAN DEFAULT false,
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Email Accounts Table
CREATE TABLE user_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  provider VARCHAR(20) NOT NULL, -- 'google', 'microsoft', 'exchange'
  email_address VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP,
  webhook_secret VARCHAR(100),
  webhook_url VARCHAR(500),
  monitoring_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_cursor VARCHAR(255), -- For incremental sync
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

-- Indexes for performance
CREATE INDEX idx_email_messages_user_project ON email_messages(user_id, project_id);
CREATE INDEX idx_email_messages_sent_at ON email_messages(sent_at);
CREATE INDEX idx_email_messages_status ON email_messages(status);
CREATE INDEX idx_email_messages_relevance ON email_messages(relevance_score) WHERE relevance_score IS NOT NULL;
CREATE INDEX idx_user_email_accounts_provider ON user_email_accounts(provider, monitoring_enabled);
```

## Phase 2: AI Processing Pipeline (Weeks 5-8)

### AI Processing Architecture
```
SQS → Lambda → Bedrock/OpenAI → Classification & Analysis → Database
```

### AWS Bedrock Integration

#### Model Selection Strategy
- **Primary**: Claude 3.5 Sonnet (latest) for complex reasoning
- **Secondary**: Claude 3 Haiku for fast classification
- **Fallback**: GPT-4 Turbo via OpenAI API

#### Lambda Functions

1. **relevance-analyzer**
   - Analyzes email relevance to construction projects
   - Uses project context and team member information
   - Scores 0.0-1.0 relevance
   - Memory: 1GB, Timeout: 2 minutes

2. **content-classifier**
   - Categorizes emails into predefined types
   - Extracts key entities (dates, amounts, contacts)
   - Identifies document types in attachments
   - Memory: 512MB, Timeout: 90 seconds

3. **summarizer**
   - Creates concise email summaries
   - Identifies key decisions and updates
   - Preserves important context
   - Memory: 512MB, Timeout: 2 minutes

4. **action-extractor**
   - Identifies actionable items and deadlines
   - Extracts follow-up requirements
   - Determines responsibility assignments
   - Memory: 512MB, Timeout: 90 seconds

5. **sentiment-analyzer**
   - Analyzes tone and urgency
   - Detects potential issues or conflicts
   - Flags time-sensitive communications
   - Memory: 256MB, Timeout: 30 seconds

#### AI Prompt Engineering System

**S3 Bucket: ai-prompts-bucket/**
```
├── relevance/
│   ├── construction-keywords.json
│   ├── contractor-patterns.json
│   ├── project-context-prompts.txt
│   └── relevance-scoring-rubric.md
├── classification/
│   ├── email-categories.json
│   ├── classification-prompts.txt
│   └── entity-extraction-patterns.json
├── extraction/
│   ├── action-item-patterns.json
│   ├── deadline-extraction-prompts.txt
│   └── responsibility-mapping.json
└── templates/
    ├── summary-templates.json
    └── response-formats.json
```

#### AI Analysis Workflow
1. **Relevance Check** (First gate)
   - Score < 0.3: Mark as irrelevant, minimal processing
   - Score 0.3-0.7: Standard processing
   - Score > 0.7: Priority processing with full analysis

2. **Content Classification**
   - Categories: quote, invoice, schedule_update, material_delivery, 
     permit_status, inspection_report, change_order, communication

3. **Entity Extraction**
   - Dates and deadlines
   - Monetary amounts
   - Contact information
   - Project phases/milestones
   - Material specifications

4. **Action Item Detection**
   - Required responses
   - Approval requests
   - Document submissions
   - Meeting scheduling
   - Payment processing

## Phase 3: Real-time Processing & Notifications (Weeks 9-12)

### Event-Driven Architecture
```
EventBridge Rules → Lambda → SNS → Push Notifications/Webhooks
```

### EventBridge Custom Events
- `email.received` - New email ingested
- `email.processed` - AI analysis complete
- `action.identified` - Action item detected
- `deadline.approaching` - Deadline within threshold
- `issue.detected` - Potential problem identified

### Lambda Functions

1. **notification-dispatcher**
   - Routes notifications based on urgency and type
   - Manages user notification preferences
   - Implements rate limiting and batching
   - Memory: 256MB, Timeout: 30 seconds

2. **urgency-evaluator**
   - Determines notification priority
   - Considers time sensitivity and impact
   - Manages escalation rules
   - Memory: 256MB, Timeout: 15 seconds

### SNS Topics Configuration
- **urgent-notifications**: Immediate alerts (SMS, push)
- **daily-digest**: Batched summaries
- **weekly-reports**: Comprehensive project updates
- **system-alerts**: Infrastructure notifications

### Notification Delivery Channels
- In-app notifications (real-time via WebSocket)
- Email notifications (SES)
- SMS alerts (SNS)
- Push notifications (mobile apps)
- Webhook integrations (third-party tools)

## Phase 4: Multi-Provider Support (Weeks 13-16)

### Provider Abstraction Layer
```
┌─────────────────────────────────────────────────────────────────┐
│                    PROVIDER ABSTRACTION                         │
├─────────────────────────────────────────────────────────────────┤
│ Gmail API ──┐                                                   │
│ Outlook API ─┼─→ Unified Email Service ─→ Processing Pipeline   │
│ Exchange ───┘                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Supported Email Providers

#### Google Gmail
- **API**: Gmail API v1
- **Authentication**: OAuth 2.0 with PKCE
- **Webhooks**: Push notifications via Pub/Sub
- **Scopes**: `gmail.readonly`, `gmail.metadata`

#### Microsoft Outlook/365
- **API**: Microsoft Graph API
- **Authentication**: OAuth 2.0 with PKCE
- **Webhooks**: Microsoft Graph webhooks
- **Scopes**: `Mail.Read`, `User.Read`

#### Microsoft Exchange (On-premises)
- **API**: Exchange Web Services (EWS)
- **Authentication**: Basic/NTLM/OAuth
- **Polling**: Scheduled sync (no webhooks)

### OAuth Implementation

#### Lambda Functions
1. **oauth-handler**
   - Manages OAuth flows for all providers
   - Stores encrypted tokens in database
   - Handles token refresh automatically
   - Memory: 256MB, Timeout: 30 seconds

2. **token-refresher**
   - Scheduled token refresh (EventBridge cron)
   - Validates token expiration
   - Updates stored credentials
   - Memory: 256MB, Timeout: 1 minute

### Provider-Specific Configurations
```typescript
// Provider configuration
interface EmailProvider {
  id: string;
  name: string;
  oauthConfig: {
    clientId: string;
    scopes: string[];
    redirectUri: string;
  };
  apiConfig: {
    baseUrl: string;
    webhookSupport: boolean;
    rateLimit: {
      requestsPerSecond: number;
      burstLimit: number;
    };
  };
}
```

## Phase 5: Advanced Communication Channels (Weeks 17-20)

### SMS Processing Pipeline
```
Twilio Webhook → API Gateway → Lambda → SQS → AI Analysis
```

#### SMS Components
- **Twilio Integration**: Webhook endpoint for incoming SMS
- **Phone Number Management**: Associate numbers with projects
- **Message Classification**: Distinguish project vs. spam messages
- **Response Automation**: Auto-reply with project context

### Voice Processing Pipeline
```
Phone Call → Twilio → S3 Recording → Transcribe → Lambda → AI Analysis
```

#### Voice Components
- **Amazon Transcribe**: Speech-to-text conversion
- **Amazon Comprehend**: NLP analysis of transcriptions
- **Call Recording Storage**: S3 with lifecycle policies
- **Real-time Analysis**: Live transcription for urgent calls

### Enhanced Database Schema
```sql
-- Communication Channels Table
CREATE TABLE communication_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  channel_type VARCHAR(20) NOT NULL, -- email, sms, voice, chat
  identifier VARCHAR(255) NOT NULL, -- email address, phone number, etc.
  provider VARCHAR(50), -- twilio, gmail, outlook, etc.
  configuration JSONB,
  monitoring_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages Table (unified for all channels)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES communication_channels(id),
  external_id VARCHAR(255), -- Provider-specific ID
  message_type VARCHAR(20) NOT NULL, -- email, sms, voice, chat
  direction VARCHAR(10) NOT NULL, -- inbound, outbound
  sender VARCHAR(255),
  recipient VARCHAR(255),
  subject TEXT,
  content TEXT,
  metadata JSONB, -- Channel-specific data
  attachments JSONB, -- File references
  ai_analysis JSONB,
  relevance_score DECIMAL(3,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Infrastructure as Code (AWS CDK)

### CDK Stack Organization
```typescript
// Main stack structure
├── EmailMonitoringStack (main)
├── DatabaseStack (RDS, ElastiCache)
├── StorageStack (S3 buckets)
├── ComputeStack (Lambda functions)
├── ApiStack (API Gateway, webhooks)
├── NotificationStack (SNS, SES)
├── SecurityStack (IAM, KMS)
└── MonitoringStack (CloudWatch, X-Ray)
```

### Key CDK Components

#### Lambda Layer for Shared Dependencies
```typescript
const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
  code: lambda.Code.fromAsset('layers/shared'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
  description: 'Shared utilities and AWS SDK',
});
```

#### Environment Configuration
```typescript
const environment = {
  DATABASE_URL: dbInstance.instanceEndpoint.socketAddress,
  REDIS_URL: redisCluster.redisEndpoint.address,
  S3_BUCKET: emailBucket.bucketName,
  BEDROCK_REGION: 'us-east-1',
  OPENAI_API_KEY: openAiSecret.secretArn,
};
```

## Security & Compliance

### Data Protection Strategy

#### Encryption
- **At Rest**: AES-256 encryption for all S3 objects
- **In Transit**: TLS 1.3 for all API communications
- **Database**: Encryption at rest with KMS
- **Tokens**: Envelope encryption for OAuth tokens

#### KMS Key Management
```typescript
const emailKmsKey = new kms.Key(this, 'EmailEncryptionKey', {
  description: 'Email content encryption',
  enableKeyRotation: true,
  keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
});
```

#### IAM Policies (Least Privilege)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::nailit-emails/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

### Privacy Controls

#### Data Retention Policies
```sql
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email_retention_days INTEGER DEFAULT 365,
  attachment_retention_days INTEGER DEFAULT 90,
  ai_analysis_retention_days INTEGER DEFAULT 180,
  voice_recording_retention_days INTEGER DEFAULT 30,
  sms_retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Automated Data Deletion
- Lambda function for policy enforcement
- CloudWatch Events for scheduled cleanup
- Audit trail for all deletions

### Compliance Features
- **GDPR**: Right to be forgotten, data portability
- **CCPA**: Data transparency and deletion rights
- **SOC 2**: Audit logging and access controls
- **HIPAA**: Enhanced encryption and access logging

## Monitoring & Observability

### CloudWatch Configuration

#### Custom Metrics
- Email processing rate (per minute)
- AI analysis accuracy scores
- Token refresh success rate
- Webhook delivery success rate
- User engagement metrics

#### Alarms
```typescript
new cloudwatch.Alarm(this, 'EmailProcessingFailure', {
  metric: emailProcessingErrors,
  threshold: 10,
  evaluationPeriods: 2,
  treatMissingData: cloudwatch.TreatMissingData.BREACHING,
});
```

#### Dashboards
- Real-time system health
- Email processing pipeline status
- AI model performance metrics
- Cost tracking and optimization

### X-Ray Tracing
- End-to-end request tracing
- Performance bottleneck identification
- Error root cause analysis
- Service map visualization

## Cost Optimization Strategy

### Compute Optimization
- **Lambda**: Provisioned concurrency for hot paths
- **Spot Instances**: Batch processing workloads
- **Right-sizing**: Regular instance type reviews

### Storage Optimization
- **S3 Intelligent Tiering**: Automatic cost optimization
- **Lifecycle Policies**: Graduated storage classes
- **Compression**: Email content compression

### Network Optimization
- **CloudFront**: Global content delivery
- **VPC Endpoints**: Reduce NAT Gateway costs
- **Data Transfer**: Regional optimization

### Estimated Monthly Costs (1000 active users)
- **Lambda**: $150-300 (execution time based)
- **RDS**: $200-400 (Multi-AZ PostgreSQL)
- **S3**: $50-100 (with lifecycle policies)
- **Bedrock**: $100-500 (AI analysis volume)
- **Other Services**: $100-200 (SNS, SES, CloudWatch)
- **Total**: $600-1500/month

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-4)
- [x] AWS infrastructure setup
- [x] Basic Lambda functions
- [x] Gmail integration
- [x] S3 storage configuration
- [x] Database schema migration

### Phase 2: AI Integration (Weeks 5-8)
- [ ] AWS Bedrock setup
- [ ] AI processing pipeline
- [ ] Relevance scoring
- [ ] Content classification
- [ ] Action item extraction

### Phase 3: Enhanced Features (Weeks 9-12)
- [ ] Real-time notifications
- [ ] EventBridge integration
- [ ] User preference management
- [ ] Urgency detection
- [ ] Batch processing optimization

### Phase 4: Multi-Provider (Weeks 13-16)
- [ ] Microsoft OAuth integration
- [ ] Outlook/Exchange support
- [ ] Provider abstraction layer
- [ ] Token management system
- [ ] Unified API interface

### Phase 5: Communication Expansion (Weeks 17-20)
- [ ] Twilio SMS integration
- [ ] Voice call processing
- [ ] Amazon Transcribe setup
- [ ] Multi-channel analytics
- [ ] Advanced reporting

## Risk Mitigation

### Technical Risks
- **API Rate Limits**: Implement exponential backoff
- **Token Expiration**: Proactive refresh strategies
- **AI Model Costs**: Usage monitoring and limits
- **Data Loss**: Multi-region backups

### Operational Risks
- **Vendor Dependencies**: Multi-provider strategies
- **Scaling Issues**: Auto-scaling policies
- **Security Breaches**: Zero-trust architecture
- **Compliance**: Regular audits and updates

### Business Risks
- **Cost Overruns**: Budget alerts and optimization
- **User Adoption**: Comprehensive onboarding
- **Performance Issues**: SLA monitoring
- **Data Privacy**: Transparent policies

## Success Metrics

### Technical KPIs
- Email processing latency < 30 seconds
- AI analysis accuracy > 90%
- System uptime > 99.9%
- Cost per email processed < $0.01

### Business KPIs
- User engagement rate > 70%
- Action item completion rate > 85%
- Time to project insight < 1 hour
- Customer satisfaction score > 4.5/5

---

**Document Version**: 1.0
**Last Updated**: January 30, 2025
**Next Review**: February 15, 2025 