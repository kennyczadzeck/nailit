# Infrastructure Migration Plan: Legacy → Serverless

## 🔍 **Current State Analysis**

### **Legacy Infrastructure (CDK Stack)**
Your current CDK infrastructure was designed for a **Lambda-centric architecture**:

```
❌ COMPLEX LEGACY ARCHITECTURE
┌─────────────────────────────────────────────────┐
│ VPC + Multi-AZ + NAT Gateways                   │
├─────────────────────────────────────────────────┤
│ RDS PostgreSQL (in VPC)                         │
├─────────────────────────────────────────────────┤
│ ElastiCache Redis                                │
├─────────────────────────────────────────────────┤
│ Lambda Functions (in VPC)                       │
├─────────────────────────────────────────────────┤
│ API Gateway                                      │
├─────────────────────────────────────────────────┤
│ SQS + SNS + S3                                   │
└─────────────────────────────────────────────────┘
```

### **New Serverless Architecture**
Your current working setup is much simpler:

```
✅ SIMPLIFIED SERVERLESS ARCHITECTURE
┌─────────────────────────────────────────────────┐
│ AWS Amplify (Frontend + Build Pipeline)         │
├─────────────────────────────────────────────────┤
│ Neon PostgreSQL (External, Managed)             │
├─────────────────────────────────────────────────┤
│ NextAuth.js (No server state needed)            │
├─────────────────────────────────────────────────┤
│ Google OAuth + APIs                             │
└─────────────────────────────────────────────────┘
```

## 📋 **What Needs To Happen**

### **🗑️ REMOVE (Complex, Unused Infrastructure)**
- ❌ **VPC + Subnets + NAT Gateways** - Not needed for Amplify
- ❌ **RDS PostgreSQL** - Replaced by Neon  
- ❌ **ElastiCache Redis** - Not currently used
- ❌ **Lambda Functions** - Replaced by Next.js API routes
- ❌ **API Gateway** - Replaced by Amplify hosting
- ❌ **SQS Queues** - Not currently implemented
- ❌ **SNS Topics** - Not currently implemented
- ❌ **S3 Buckets** - Can use for file uploads later
- ❌ **IAM Roles for Lambda** - Not needed

### **✅ KEEP (Simple, Useful Resources)**
- ✅ **S3 Bucket** - For file uploads, attachments (future)
- ✅ **SNS Topics** - For notifications (future)
- ✅ **CloudWatch Logs** - For monitoring (future)

### **🆕 ADD (Amplify Multi-Environment)**
- 🆕 **Amplify Apps** per environment (production, staging, develop)
- 🆕 **Custom Domain** management (future)
- 🆕 **Environment-specific configurations**

## 🏗️ **New Infrastructure Strategy**

### **Environment Setup Required**

#### **Option 1: AWS Amplify Console Only** ⭐ **RECOMMENDED**
**Where to Configure**: AWS Amplify Console
**What's Needed**:
```bash
# Production Environment
Branch: main
DATABASE_URL: neon_production_url
NEXTAUTH_URL: https://nailit.app

# Staging Environment  
Branch: staging
DATABASE_URL: neon_staging_url
NEXTAUTH_URL: https://staging.nailit.app

# Development Environment
Branch: develop
DATABASE_URL: neon_dev_url
NEXTAUTH_URL: https://dev.nailit.app
```

#### **Option 2: Hybrid (CDK + Amplify)** 
**If you want IaC management**:
- Use CDK for: S3, SNS, CloudWatch, custom domains
- Use Amplify Console for: App hosting, environment variables

#### **Option 3: Full CDK Migration**
**Most complex but most control**:
- Migrate Amplify apps to CDK management
- Requires custom domain setup
- More DevOps overhead

## 🎯 **Recommended Approach: Option 1**

### **Why Amplify Console Only?**
1. **Simplicity**: No infrastructure code to maintain
2. **Speed**: Set up environments in minutes
3. **Built-in Features**: Branch-based deployments, environment variables
4. **Cost**: No additional AWS resources running
5. **Maintenance**: Zero infrastructure maintenance

### **What About Future Complexity?**
When you need additional AWS services:
```typescript
// Add CDK stack for specific services only
export class NailItServicesStack extends cdk.Stack {
  // Only add when actually needed:
  // - S3 for file uploads
  // - SNS for notifications  
  // - SES for email sending
  // - Lambda for background processing
}
```

## 📋 **Implementation Plan**

### **Phase 1: Environment Setup (This Week)**

#### **Step 1: Create Amplify Environments**
```bash
# In AWS Amplify Console:
1. Go to existing app
2. Connect staging branch → Create staging environment
3. Connect develop branch → Create development environment
4. Configure environment variables for each
```

#### **Step 2: Configure Environment Variables**
For each environment, add these in Amplify Console:

**Production Environment Variables:**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://main.d1rq0k9js5lwg3.amplifyapp.com
NEXTAUTH_SECRET=[production-secret]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

**Staging Environment Variables:**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://staging.[app-id].amplifyapp.com
NEXTAUTH_SECRET=[staging-secret]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

**Development Environment Variables:**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://develop.[app-id].amplifyapp.com
NEXTAUTH_SECRET=[dev-secret]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

#### **Step 3: Update Amplify Build Configs**
Set branch-specific build configs:
- **main branch**: Use `amplify.yml` (formal migrations)
- **staging branch**: Use `amplify-staging.yml` (formal migrations)
- **develop branch**: Use `amplify-develop.yml` (db push)

### **Phase 2: Core Email Monitoring Implementation (Weeks 2-4)**

#### **🚨 CRITICAL: Missing Core Functionality**

The current simplified architecture is missing **NailIt's core value proposition**:

```
❌ MISSING COMPONENTS FOR EMAIL MONITORING:
┌─────────────────────────────────────────────────────────────────┐
│ 📧 Email Ingestion (Gmail/Outlook APIs)                        │
├─────────────────────────────────────────────────────────────────┤
│ 🗄️ Email Storage (S3 for content + attachments)               │
├─────────────────────────────────────────────────────────────────┤
│ 🤖 AI Analysis Pipeline (Bedrock/OpenAI)                       │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Content Classification & Entity Extraction                  │
├─────────────────────────────────────────────────────────────────┤
│ 🔔 Smart Notifications & Alerts                                │
├─────────────────────────────────────────────────────────────────┤
│ 📱 SMS Integration (Twilio)                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### **✅ SERVERLESS EMAIL MONITORING ARCHITECTURE**

**Replace Complex Lambda Infrastructure With:**

```
✅ SIMPLIFIED EMAIL PIPELINE:
┌─────────────────────────────────────────────────────────────────┐
│ AWS Amplify (Frontend + Next.js API Routes)                    │
├─────────────────────────────────────────────────────────────────┤
│ Neon PostgreSQL (Email metadata + analysis results)            │
├─────────────────────────────────────────────────────────────────┤
│ Vercel Edge Functions (Email processing + AI analysis)         │
├─────────────────────────────────────────────────────────────────┤
│ AWS S3 (Email content + attachments storage)                   │
├─────────────────────────────────────────────────────────────────┤
│ Gmail/Outlook APIs (Direct integration)                        │
├─────────────────────────────────────────────────────────────────┤
│ OpenAI API (AI analysis + classification)                      │
├─────────────────────────────────────────────────────────────────┤
│ Twilio (SMS integration)                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### **Step 1: Add Missing Database Tables**

**Add to Prisma Schema:**
```sql
-- Email integration tables
model EmailSettings {
  // Already exists in schema ✅
}

model EmailMessage {
  id              String   @id @default(cuid())
  
  // Email metadata
  messageId       String   @unique
  threadId        String?
  subject         String?
  sender          String
  recipients      String[]
  sentAt          DateTime
  receivedAt      DateTime
  
  // Content storage
  bodyText        String?
  bodyHtml        String?
  s3ContentPath   String?  // S3 path for full content
  attachmentPaths String[] // S3 paths for attachments
  
  // AI analysis results
  relevanceScore  Float?
  aiSummary       String?
  classification  Json?    // Categories, entities, etc.
  actionItems     Json?    // Extracted action items
  urgencyLevel    String?  // low, normal, high, urgent
  
  // Processing status
  status          String   @default("pending") // pending, processed, archived, error
  processedAt     DateTime?
  
  // Relations
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  projectId       String?
  project         Project? @relation(fields: [projectId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("email_messages")
}

model SmsMessage {
  id              String   @id @default(cuid())
  
  // SMS metadata
  twilioSid       String   @unique
  fromNumber      String
  toNumber        String
  body            String
  direction       String   // inbound, outbound
  
  // AI analysis (similar to email)
  relevanceScore  Float?
  aiSummary       String?
  classification  Json?
  urgencyLevel    String?
  
  // Relations
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  projectId       String?
  project         Project? @relation(fields: [projectId], references: [id])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@map("sms_messages")
}
```

#### **Step 2: Add Core Email Processing Routes**

**New API Routes Needed:**
```
app/api/
├── email/
│   ├── webhook/gmail/route.ts        # Gmail push notifications
│   ├── webhook/outlook/route.ts      # Outlook Graph webhooks
│   ├── oauth/gmail/route.ts          # Gmail OAuth flow
│   ├── oauth/outlook/route.ts        # Outlook OAuth flow
│   ├── sync/route.ts                 # Manual email sync
│   └── process/route.ts              # Email processing endpoint
├── sms/
│   ├── webhook/route.ts              # Twilio SMS webhooks
│   └── send/route.ts                 # Send SMS endpoint
├── ai/
│   ├── analyze-email/route.ts        # AI email analysis
│   ├── analyze-sms/route.ts          # AI SMS analysis
│   └── classify-content/route.ts     # Content classification
└── storage/
    ├── upload/route.ts               # S3 upload for attachments
    └── download/route.ts             # S3 download with auth
```

#### **Step 3: Required Environment Variables**

**Add to all environments:**
```bash
# Email Integration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret

# AI Processing
OPENAI_API_KEY=your_openai_api_key

# Storage
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=nailit-email-storage
AWS_S3_REGION=us-east-1

# SMS Integration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Webhooks
WEBHOOK_SECRET=your_webhook_verification_secret
```

#### **Step 4: Email Processing Implementation**

**Core Email Processing Flow:**
```typescript
// app/api/email/webhook/gmail/route.ts
export async function POST(request: Request) {
  // 1. Verify webhook authenticity
  // 2. Extract message ID from Gmail push notification
  // 3. Fetch full email content via Gmail API
  // 4. Store email content in S3
  // 5. Store metadata in Neon database
  // 6. Queue for AI analysis
  // 7. Process AI analysis
  // 8. Update database with results
  // 9. Send notifications if urgent
}

// app/api/ai/analyze-email/route.ts
export async function POST(request: Request) {
  // 1. Retrieve email content from S3
  // 2. Call OpenAI for analysis:
  //    - Relevance scoring (construction project related?)
  //    - Content classification (quote, invoice, schedule, etc.)
  //    - Entity extraction (dates, amounts, contacts)
  //    - Action item detection
  //    - Urgency assessment
  // 3. Store analysis results in database
  // 4. Trigger notifications if needed
}
```

#### **Step 5: Required AWS Services (Minimal)**

**S3 Bucket Configuration:**
```bash
# Create S3 bucket for email storage
aws s3 mb s3://nailit-email-storage-production
aws s3 mb s3://nailit-email-storage-staging  
aws s3 mb s3://nailit-email-storage-development

# Set up bucket policies for security
# Configure lifecycle policies for cost optimization
```

**IAM Role for S3 Access:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::nailit-email-storage-*/*"
      ]
    }
  ]
}
```

### **Phase 3: SMS & Advanced Features (Weeks 5-6)**

#### **SMS Integration Implementation**
- Twilio webhook endpoint for incoming SMS
- SMS processing and AI analysis pipeline  
- Project phone number management
- Two-way SMS communication

#### **Advanced Email Features**
- Email thread management and conversation tracking
- Attachment processing and OCR
- Advanced project association algorithms
- Email search and filtering capabilities

### **Phase 4: AI Enhancement & Optimization (Weeks 7-8)**

#### **Advanced AI Features**
- Fine-tuned models for construction domain
- Multi-modal analysis (text + images)
- Predictive analytics for project issues
- Custom classification categories per user

#### **Performance Optimization**
- Email processing performance optimization
- Caching strategies for AI results
- Background processing for large email volumes
- Real-time vs batch processing strategies

## 💰 **Updated Cost Analysis With Core Features**

### **Complete Serverless Architecture Cost:**
- **AWS Amplify**: $5-15/month (hosting + build minutes)
- **Neon PostgreSQL**: $0-25/month (free tier → pro)
- **AWS S3**: $10-50/month (email content storage)
- **OpenAI API**: $50-200/month (email analysis volume)
- **Twilio**: $1-10/month (SMS volume)
- **Gmail/Outlook APIs**: Free (within reasonable limits)

**Total: $66-300/month** (vs. $600-1500 with complex infrastructure)

### **Scaling Strategy:**
- **0-100 users**: Stay within free tiers (~$66/month)
- **100-1000 users**: Scale gradually (~$150/month)
- **1000+ users**: Add dedicated infrastructure as needed

### **Phase 3: Legacy Cleanup (Next Week)**

**✅ DECISION: Archive Legacy Infrastructure**

The original CDK infrastructure was designed for a different architecture pattern. With our successful serverless approach that provides all the same functionality at 80% cost reduction, we should:

1. **Archive legacy CDK code** to `archive/legacy-infrastructure/`
2. **Document the decision** in the archive README
3. **Focus on implementing email monitoring features** (see `docs/EMAIL_MONITORING_IMPLEMENTATION.md`)

### **Phase 4: Advanced Features Implementation (Weeks 9-12)**

**📧 Email Monitoring System Implementation**

Detailed implementation guide: **`docs/EMAIL_MONITORING_IMPLEMENTATION.md`**

**Core Components to Implement:**
- Gmail/Outlook OAuth integration and webhooks
- AI-powered email analysis via OpenAI
- S3 storage for email content and attachments
- Advanced project association algorithms
- SMS integration via Twilio
- Real-time dashboard updates

**Estimated Development Time:** 8 weeks for full email monitoring system

## ✅ **Recommended Next Actions**

1. **✅ Set up Amplify environments** (3 environments)
2. **✅ Configure environment variables** (from Neon setup doc)
3. **✅ Test deployment pipeline** (all branches → environments)
4. **✅ Archive legacy CDK infrastructure** (document decision)
5. **📋 Plan future services** (S3 for uploads, SNS for notifications)

**Bottom Line**: Your current serverless approach is **significantly simpler and more cost-effective** than the original CDK architecture. Focus on Amplify environments first, worry about additional AWS services later when you actually need them. 