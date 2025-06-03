# NailIt Email Monitoring System Architecture Diagram

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          NAILIT EMAIL MONITORING SYSTEM                        │
│                              AWS-Based Architecture                             │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Next.js 15 App  │  AWS Amplify  │  CloudFront CDN  │  NextAuth.js OAuth     │
│  ┌─────────────┐  │  ┌─────────┐  │  ┌─────────────┐  │  ┌──────────────────┐ │
│  │ Dashboard   │  │  │ Hosting │  │  │ Global Edge │  │  │ Gmail/Outlook    │ │
│  │ Timeline    │  │  │ CI/CD   │  │  │ Caching     │  │  │ Token Management │ │
│  │ Settings    │  │  │ SSL/TLS │  │  │ Compression │  │  │ Refresh Handling │ │
│  └─────────────┘  │  └─────────┘  │  └─────────────┘  │  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               API GATEWAY LAYER                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│   API Gateway   │  Email Webhooks  │  OAuth Callbacks │   Rate Limiting       │
│  ┌─────────────┐ │ ┌─────────────┐  │ ┌──────────────┐ │ ┌─────────────────┐   │
│  │ REST APIs   │ │ │ /gmail/hook │  │ │ /auth/gmail  │ │ │ 1000 req/sec    │   │
│  │ GraphQL     │ │ │ /outlook/   │  │ │ /auth/outlook│ │ │ Burst: 2000     │   │
│  │ WebSocket   │ │ │  hook       │  │ │ /auth/twilio │ │ │ Throttling      │   │
│  └─────────────┘ │ └─────────────┘  │ └──────────────┘ │ └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             PROCESSING LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Lambda Functions       │   SQS Queues       │   EventBridge       │   SNS     │
│ ┌─────────────────────┐ │ ┌─────────────────┐ │ ┌─────────────────┐ │ ┌───────┐ │
│ │ email-webhook-      │ │ │ incoming-emails │ │ │ email.received  │ │ │ SMS   │ │
│ │   handler (256MB)   │ │ │ processing-queue│ │ │ email.processed │ │ │ Email │ │
│ │ email-fetcher       │ │ │ dlq-queue       │ │ │ action.detected │ │ │ Push  │ │
│ │   (512MB)           │ │ │                 │ │ │ deadline.alert  │ │ │ Webhook│ │
│ │ email-parser        │ │ │ Visibility: 60s │ │ │ Custom Rules    │ │ └───────┘ │
│ │   (256MB)           │ │ │ Retention: 14d  │ │ │ Triggers        │ │           │
│ │ notification-       │ │ │ DLQ: 3 attempts │ │ │ Schedulers      │ │           │
│ │   dispatcher        │ │ └─────────────────┘ │ └─────────────────┘ │           │
│ └─────────────────────┘ │                     │                     │           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               AI/ML LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│   AWS Bedrock          │  AI Functions        │  Prompt Engineering │  Models  │
│ ┌─────────────────────┐ │ ┌─────────────────┐  │ ┌─────────────────┐ │ ┌──────┐ │
│ │ Claude 3.5 Sonnet   │ │ │ relevance-      │  │ │ Construction    │ │ │Claude│ │
│ │ Claude 3 Haiku      │ │ │   analyzer      │  │ │ Keywords        │ │ │ GPT-4│ │
│ │ GPT-4 Turbo (fallbk)│ │ │ content-        │  │ │ Email Templates │ │ │ Local│ │
│ │                     │ │ │   classifier    │  │ │ Action Patterns │ │ │ Fine │ │
│ │ Text Generation     │ │ │ summarizer      │  │ │ Context Prompts │ │ │ Tuned│ │
│ │ Entity Extraction   │ │ │ action-extractor│  │ │ S3 Bucket Store │ │ └──────┘ │
│ │ Sentiment Analysis  │ │ │ sentiment-      │  │ │ Version Control │ │          │
│ └─────────────────────┘ │ │   analyzer      │  │ └─────────────────┘ │          │
│                         │ └─────────────────┘  │                     │          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STORAGE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  RDS PostgreSQL     │   S3 Buckets        │  ElastiCache Redis │  CloudFront   │
│ ┌─────────────────┐ │ ┌─────────────────┐  │ ┌────────────────┐ │ ┌───────────┐ │
│ │ Multi-AZ        │ │ │ raw-emails/     │  │ │ Session Cache  │ │ │ Global    │ │
│ │ Read Replicas   │ │ │ processed/      │  │ │ Prompt Cache   │ │ │ Edge      │ │
│ │ Backup: 7 days  │ │ │ attachments/    │  │ │ User Sessions  │ │ │ Locations │ │
│ │ Encryption      │ │ │ ai-analysis/    │  │ │ Rate Limiting  │ │ │ Static    │ │
│ │                 │ │ │                 │  │ │ TTL: 1-24hrs   │ │ │ Assets    │ │
│ │ Users           │ │ │ Lifecycle:      │  │ │ Redis 6.2      │ │ │ API Cache │ │
│ │ Projects        │ │ │ - IA: 30 days   │  │ │ Cluster Mode   │ │ │ Headers   │ │
│ │ Email Messages  │ │ │ - Glacier: 90d  │  │ └────────────────┘ │ └───────────┘ │
│ │ Attachments     │ │ │ - Deep: 1 year  │  │                    │               │
│ │ AI Analysis     │ │ │ Encryption: KMS │  │                    │               │
│ └─────────────────┘ │ └─────────────────┘  │                    │               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING & SECURITY LAYER                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│   CloudWatch        │   X-Ray Tracing    │   KMS Encryption   │   IAM Security  │
│ ┌─────────────────┐ │ ┌─────────────────┐ │ ┌────────────────┐ │ ┌─────────────┐ │
│ │ Custom Metrics  │ │ │ End-to-End      │ │ │ Data at Rest   │ │ │ Roles &     │ │
│ │ - Email Rate    │ │ │ Request Traces  │ │ │ Data in Transit│ │ │ Policies    │ │
│ │ - AI Accuracy   │ │ │ Performance     │ │ │ Token Storage  │ │ │ Least       │ │
│ │ - Error Rates   │ │ │ Bottlenecks     │ │ │ Database       │ │ │ Privilege   │ │
│ │ - Cost Tracking │ │ │ Service Maps    │ │ │ S3 Objects     │ │ │ MFA Required│ │
│ │                 │ │ │ Error Analysis  │ │ │ Auto Rotation  │ │ │ Audit Logs  │ │
│ │ Alarms & Alerts │ │ │ Latency Dist.   │ │ │ Key Management │ │ │ Compliance  │ │
│ │ Dashboards      │ │ │ Real-time       │ │ └────────────────┘ │ └─────────────┘ │
│ └─────────────────┘ │ └─────────────────┘ │                    │                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Gmail     │    │  Outlook    │    │    SMS      │    │   Voice     │
│   Webhook   │    │  Webhook    │    │ (Twilio)    │    │ (Twilio)    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       └──────────────────┼──────────────────┼──────────────────┘
                          │                  │
                          ▼                  ▼
                ┌─────────────────────────────────┐
                │        API Gateway              │
                │  - Authentication               │
                │  - Rate Limiting                │
                │  - Request Validation           │
                └──────────────┬──────────────────┘
                               │
                               ▼
                ┌─────────────────────────────────┐
                │         SQS Queue               │
                │  - Incoming Messages            │
                │  - Dead Letter Queue            │
                │  - Retry Logic                  │
                └──────────────┬──────────────────┘
                               │
                               ▼
                ┌─────────────────────────────────┐
                │      Lambda Processor           │
                │  1. Email Fetching              │
                │  2. Content Parsing             │
                │  3. Attachment Processing       │
                └──────────────┬──────────────────┘
                               │
                               ▼
                ┌─────────────────────────────────┐
                │        AI Analysis              │
                │  1. Relevance Scoring           │
                │  2. Content Classification      │
                │  3. Entity Extraction           │
                │  4. Action Item Detection       │
                │  5. Sentiment Analysis          │
                └──────────────┬──────────────────┘
                               │
                               ▼
                ┌─────────────────────────────────┐
                │      Data Storage               │
                │  - PostgreSQL (metadata)        │
                │  - S3 (content & attachments)   │
                │  - Redis (cache & sessions)     │
                └──────────────┬──────────────────┘
                               │
                               ▼
                ┌─────────────────────────────────┐
                │      Event Processing           │
                │  - EventBridge Rules            │
                │  - Notification Routing         │
                │  - Alert Generation             │
                └──────────────┬──────────────────┘
                               │
                               ▼
                ┌─────────────────────────────────┐
                │    Multi-Channel Delivery       │
                │  - In-App Notifications         │
                │  - Email Alerts (SES)           │
                │  - SMS Messages (SNS)           │
                │  - Push Notifications           │
                │  - Webhook Integrations         │
                └─────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY LAYERS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        PERIMETER SECURITY                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │ CloudFront  │  │     WAF     │  │    Shield   │  │   Route53   │   │   │
│  │  │ SSL/TLS     │  │ SQL Inject  │  │ DDoS Protect│  │ DNS Protect │   │   │
│  │  │ Headers     │  │ XSS Protect │  │ Layer 3/4   │  │ Health Check│   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        NETWORK SECURITY                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │     VPC     │  │  Security   │  │     NACLs   │  │   Private   │   │   │
│  │  │ Isolation   │  │   Groups    │  │ Network ACL │  │   Subnets   │   │   │
│  │  │ CIDR Blocks │  │ Port Rules  │  │ Stateless   │  │ No Internet │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      APPLICATION SECURITY                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │     IAM     │  │   Lambda    │  │  API Gateway│  │ Application │   │   │
│  │  │ Roles       │  │ Execution   │  │ Authorizers │  │ Layer Auth  │   │   │
│  │  │ Policies    │  │ Roles       │  │ JWT Tokens  │  │ NextAuth.js │   │   │
│  │  │ MFA Required│  │ Env Vars    │  │ OAuth 2.0   │  │ Sessions    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                       │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        DATA SECURITY                                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │     KMS     │  │   S3 Bucket │  │     RDS     │  │   Secrets   │   │   │
│  │  │ Key Mgmt    │  │ Encryption  │  │ Encryption  │  │   Manager   │   │   │
│  │  │ Auto Rotate │  │ At Rest     │  │ At Rest     │  │ Auto Rotate │   │   │
│  │  │ Multi-Region│  │ Server Side │  │ In Transit  │  │ Fine Access │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Performance Metrics & SLAs

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PERFORMANCE TARGETS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Latency Targets                    │   Throughput Targets                      │
│  ┌─────────────────────────────┐   │   ┌─────────────────────────────────────┐ │
│  │ API Response Times          │   │   │ Email Processing Rate           │     │ │
│  │ ├─ Authentication: < 500ms  │   │   │ ├─ Gmail: 1000 emails/min       │     │ │
│  │ ├─ Email Fetch: < 5s        │   │   │ ├─ Outlook: 800 emails/min      │     │ │
│  │ ├─ AI Analysis: < 30s       │   │   │ ├─ SMS: 500 messages/min        │     │ │
│  │ ├─ Notification: < 2s       │   │   │ └─ Voice: 50 calls/min          │     │ │
│  │ └─ Dashboard Load: < 3s     │   │   │                                 │     │ │
│  │                             │   │   │ Concurrent Users                │     │ │
│  │ End-to-End Processing       │   │   │ ├─ Active Sessions: 10,000       │     │ │
│  │ ├─ P50: < 15s              │   │   │ ├─ Peak Concurrent: 2,500        │     │ │
│  │ ├─ P95: < 45s              │   │   │ ├─ Database Connections: 500     │     │ │
│  │ ├─ P99: < 90s              │   │   │ └─ Lambda Concurrency: 1000     │     │ │
│  └─────────────────────────────┘   │   └─────────────────────────────────────┘ │
│                                     │                                           │
│  Availability Targets               │   Accuracy Targets                        │
│  ┌─────────────────────────────┐   │   ┌─────────────────────────────────────┐ │
│  │ System Uptime               │   │   │ AI Analysis Accuracy            │     │ │
│  │ ├─ API Gateway: 99.9%       │   │   │ ├─ Relevance Scoring: > 90%     │     │ │
│  │ ├─ Lambda: 99.95%           │   │   │ ├─ Classification: > 95%         │     │ │
│  │ ├─ RDS: 99.95%              │   │   │ ├─ Action Items: > 85%           │     │ │
│  │ ├─ S3: 99.99%               │   │   │ └─ Sentiment: > 80%             │     │ │
│  │ └─ Overall: 99.9%           │   │   │                                 │     │ │
│  │                             │   │   │ Email Processing Success        │     │ │
│  │ Recovery Targets            │   │   │ ├─ Gmail API: > 99.5%            │     │ │
│  │ ├─ RTO: < 15 minutes        │   │   │ ├─ Outlook API: > 99.0%          │     │ │
│  │ ├─ RPO: < 5 minutes         │   │   │ ├─ Webhook Delivery: > 98%       │     │ │
│  │ └─ MTTR: < 30 minutes       │   │   │ └─ Notification Delivery: > 99% │     │ │
│  └─────────────────────────────┘   │   └─────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```
 