# NailIt Infrastructure as Code

This directory contains the declarative infrastructure definitions for the NailIt renovation project management platform using AWS CDK.

## 🏗️ Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: AWS Amplify (React/Next.js)                      │
│ • App ID: d1rq0k9js5lwg3                                   │
│ • Branches: develop, staging, main                         │
│ • Custom domains: managed manually                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Database: Neon PostgreSQL (Serverless)                     │
│ • Development: br-still-paper-a5tgtem8                     │
│ • Staging: br-raspy-sound-a5eg97xu                         │
│ • Production: br-misty-frog-a5pcr9pt                       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ AWS Services (Managed by CDK)                              │
│ • S3: Email storage                                         │
│ • SQS: Email and AI processing queues                      │
│ • SNS: Notification topic                                   │
│ • IAM: Service roles and policies                          │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

```
infrastructure/
├── bin/
│   └── nailit-app.ts           # CDK app entry point
├── lib/
│   └── nailit-infrastructure-stack.ts  # Main infrastructure stack
├── cdk.json                    # CDK configuration
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── README.md                  # This file
```

## 🌍 Environment Configuration

The infrastructure supports three environments with identical AWS resources but different naming:

| Environment | AWS Resources Suffix | Amplify Branch | Neon Database Branch |
|-------------|---------------------|----------------|---------------------|
| **Development** | `dev` | `develop` | `br-still-paper-a5tgtem8` |
| **Staging** | `staging` | `staging` | `br-raspy-sound-a5eg97xu` |
| **Production** | `prod` | `main` | `br-misty-frog-a5pcr9pt` |

## 🎯 Current Resource Mapping

### AWS Account: 207091906248
### Default Region: us-east-1

| Service | Current Resource Name | CDK Generated Name |
|---------|----------------------|-------------------|
| **S3 Bucket** | `nailit-dev-emails-207091906248` | `nailit-{env}-emails-{account}` |
| **SQS Email Queue** | `nailit-dev-email-queue` | `nailit-{env}-email-queue` |
| **SQS AI Queue** | `nailit-dev-ai-queue` | `nailit-{env}-ai-queue` |
| **SNS Topic** | `nailit-dev-notifications` | `nailit-{env}-notifications` |

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI configured** with appropriate credentials
2. **AWS CDK installed globally**: `npm install -g aws-cdk`
3. **Node.js 18+**

### Installation

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Verify CDK installation
cdk --version

# Bootstrap CDK (first time only)
cdk bootstrap
```

### Deployment Commands

```bash
# Deploy to development environment
npm run deploy:dev

# Deploy to staging environment  
npm run deploy:staging

# Deploy to production environment
npm run deploy:prod

# Preview changes before deployment
npm run diff

# Synthesize CloudFormation templates
npm run synth
```

## 🔧 Current State vs CDK

### ✅ Managed by CDK (Future)
- S3 buckets for email storage
- SQS queues for email and AI processing
- SNS topics for notifications
- IAM roles and policies
- Resource tagging and lifecycle management

### 🔄 Externally Managed (Current)
- **AWS Amplify**: Hosting and CI/CD (manually configured)
- **Neon PostgreSQL**: Database service (external provider)
- **Environment Variables**: Set in Amplify console
- **Custom Domains**: Configured in Amplify console

## 📊 Environment Variables Required

Each environment needs these variables configured in the Amplify console:

### Database Configuration
```bash
DATABASE_URL=postgresql://user:pass@ep-{branch}.neon.tech/neondb?sslmode=require
DATABASE_MIGRATION_URL=postgresql://user:pass@ep-{branch}.neon.tech/neondb?sslmode=require
```

### NextAuth Configuration
```bash
NEXTAUTH_URL=https://{environment}.d1rq0k9js5lwg3.amplifyapp.com
NEXTAUTH_SECRET={unique-secret-per-environment}
```

### Google OAuth
```bash
GOOGLE_CLIENT_ID={oauth-client-id}
GOOGLE_CLIENT_SECRET={oauth-client-secret}
```

### AWS Configuration
```bash
NAILIT_AWS_REGION=us-east-1
AWS_S3_BUCKET={generated-by-cdk}
AWS_SQS_EMAIL_QUEUE={generated-by-cdk}
AWS_SNS_TOPIC={generated-by-cdk}
```

## 🎯 Deployment Strategy

### Current Workflow (Manual + CDK)

1. **Deploy AWS resources** with CDK:
   ```bash
   npm run deploy:dev
   ```

2. **Get CDK outputs** and update Amplify environment variables:
   ```bash
   # CDK will output the resource ARNs/URLs
   # Copy these to Amplify console environment variables
   ```

3. **Deploy application** via git push:
   ```bash
   # From main project directory
   git push origin develop  # Triggers Amplify build
   ```

### Progressive Environment Deployment

```bash
# 1. Deploy infrastructure to dev
cd infrastructure && npm run deploy:dev

# 2. Update dev environment variables in Amplify
# (Use CDK outputs)

# 3. Deploy application to dev
git push origin develop

# 4. Test and verify dev environment

# 5. Repeat for staging
npm run deploy:staging
# Update staging env vars
git push origin staging

# 6. Repeat for production
npm run deploy:prod  
# Update production env vars
git push origin main
```

## 🔍 Monitoring and Outputs

After deployment, CDK provides these outputs:

```bash
# Example outputs
NailIt-dev.EmailBucketName = nailit-dev-emails-207091906248
NailIt-dev.EmailQueueUrl = https://sqs.us-east-1.amazonaws.com/207091906248/nailit-dev-email-queue
NailIt-dev.NotificationTopicArn = arn:aws:sns:us-east-1:207091906248:nailit-dev-notifications
```

## 🛡️ Security Features

- **IAM least privilege**: Roles have minimal required permissions
- **Resource isolation**: Environment-specific resource naming
- **Retention policies**: Production resources retained on stack deletion
- **Encryption**: S3 buckets encrypted at rest
- **Dead letter queues**: Failed message handling for SQS

## 🔄 Migration Notes

### From Manual to CDK Management

1. **Current resources** were created manually in AWS console
2. **CDK will create new resources** with standardized naming
3. **Migration plan**:
   - Deploy CDK resources alongside existing ones
   - Update application configuration to use new resources
   - Migrate data if necessary
   - Decommission old resources

### Zero-Downtime Migration

The CDK deployment creates new resources without affecting existing ones, allowing for gradual migration.

## 🚨 Important Notes

### Database (Neon)
- **Not managed by CDK** - External service
- **Branch management** done in Neon console
- **Connection strings** manually configured in Amplify

### Amplify
- **App and branches** manually configured
- **Build settings** use repository `amplify.yml`
- **Environment variables** manually set per branch

### Cost Optimization
- **Development/Staging**: Resources auto-delete on stack destruction
- **Production**: Resources retained for data safety
- **S3 lifecycle**: Automatic transition to cheaper storage classes

## 📞 Support

For infrastructure issues:
1. Check CDK deployment logs
2. Verify AWS credentials and permissions
3. Ensure Amplify environment variables match CDK outputs
4. Check Neon database connectivity separately 