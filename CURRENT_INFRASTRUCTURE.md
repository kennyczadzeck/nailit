# NailIt Current Infrastructure State

This document provides a comprehensive overview of the current NailIt infrastructure as it exists today.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: AWS Amplify (Next.js/React)                      │
│ • App ID: d1rq0k9js5lwg3                                   │
│ • Repository: github.com/kennyczadzeck/nailit             │
│ • Auto-deploy on branch push                               │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ Database: Neon PostgreSQL (Serverless)                     │
│ • Account: kenny@kennyczadzeck.com                         │
│ • Project: nailit-production                               │
│ • Multi-branch setup for environments                      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ AWS Services (Account: 207091906248)                       │
│ • S3: Email storage buckets                                │
│ • SQS: Email and AI processing queues                      │
│ • SNS: Notification topics                                 │
│ • Region: us-east-1                                        │
└─────────────────────────────────────────────────────────────┘
```

## 🌍 Three Environment Setup

| Environment | Git Branch | Amplify URL | Neon Database Branch |
|-------------|------------|-------------|---------------------|
| **Development** | `develop` | `https://develop.d1rq0k9js5lwg3.amplifyapp.com` | `br-still-paper-a5tgtem8` |
| **Staging** | `staging` | `https://staging.d1rq0k9js5lwg3.amplifyapp.com` | `br-raspy-sound-a5eg97xu` |
| **Production** | `main` | `https://main.d1rq0k9js5lwg3.amplifyapp.com` | `br-misty-frog-a5pcr9pt` |

## 📊 Current AWS Resources

### Account Information
- **AWS Account ID**: 207091906248
- **Primary Region**: us-east-1
- **Resource Naming Pattern**: `nailit-{env}-{service}-{account}`

### S3 Buckets
```
Development:  nailit-dev-emails-207091906248
Staging:      nailit-staging-emails-207091906248  (inferred)
Production:   nailit-prod-emails-207091906248     (inferred)
```

### SQS Queues
```
Email Processing:
- Development:  nailit-dev-email-queue
- Staging:      nailit-staging-email-queue        (inferred)  
- Production:   nailit-prod-email-queue           (inferred)

AI Processing:
- Development:  nailit-dev-ai-queue
- Staging:      nailit-staging-ai-queue           (inferred)
- Production:   nailit-prod-ai-queue              (inferred)
```

### SNS Topics
```
Notifications:
- Development:  nailit-dev-notifications
- Staging:      nailit-staging-notifications      (inferred)
- Production:   nailit-prod-notifications         (inferred)
```

## 🔧 Current Environment Variables

### Development Environment (.env.local)
```bash
# Database Configuration
DATABASE_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_MIGRATION_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth Configuration  
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="+hP31rrZgohD7u3uHr/ASb1WE9j3MYjxHtTBmaaU+3M="

# Google OAuth
GOOGLE_CLIENT_ID="442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0"

# AWS Configuration
AWS_REGION="us-east-1"
AWS_S3_BUCKET="nailit-dev-emails-207091906248"
AWS_SQS_EMAIL_QUEUE="https://sqs.us-east-1.amazonaws.com/207091906248/nailit-dev-email-queue"
AWS_SNS_TOPIC="arn:aws:sns:us-east-1:207091906248:nailit-dev-notifications"
```

### Staging Environment (Amplify Console)
```bash
# Database Configuration
DATABASE_URL="postgresql://neondb_owner:{password}@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_MIGRATION_URL="postgresql://neondb_owner:{password}@ep-raspy-sound-a5eg97xu.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://staging.d1rq0k9js5lwg3.amplifyapp.com"
NEXTAUTH_SECRET="NBlPlLjnXdsdp9eMCAdWFUzXzRXRGvAQxMQPBPXzusI="

# AWS Configuration
NAILIT_AWS_REGION="us-east-1"
# Other AWS variables configured per environment
```

### Production Environment (Amplify Console)
```bash
# Database Configuration  
DATABASE_URL="postgresql://neondb_owner:{password}@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_MIGRATION_URL="postgresql://neondb_owner:{password}@ep-misty-frog-a5pcr9pt.us-east-2.aws.neon.tech/neondb?sslmode=require"

# NextAuth Configuration
NEXTAUTH_URL="https://main.d1rq0k9js5lwg3.amplifyapp.com"  
NEXTAUTH_SECRET="Bhd5kv2FV4JrltkygT6FtAG8JoRwRBQSOJPmfzSFoYM="

# AWS Configuration
NAILIT_AWS_REGION="us-east-1"
# Other AWS variables configured per environment
```

## 🚀 Deployment Workflow

### Current Process
1. **Code Changes** → Push to `develop` branch
2. **Amplify Auto-Deploy** → Builds and deploys to development environment
3. **Manual Testing** → Verify functionality on development environment
4. **Progressive Merge** → `develop` → `staging` → `main`
5. **Each merge** triggers automatic Amplify deployment to respective environment

### Build Configuration
- **Source**: Repository-based `amplify.yml` file
- **Environment Detection**: Smart detection based on `DATABASE_URL` patterns
- **Build Strategy**: 
  - Development: `prisma db push` (rapid iteration)
  - Staging/Production: `prisma migrate deploy` (formal migrations)

## 📁 Key Files

### Application Configuration
- `next.config.ts` - Next.js configuration with environment variable injection
- `amplify.yml` - Build configuration with environment-specific logic
- `prisma/schema.prisma` - Database schema with dual URL configuration

### Infrastructure Documentation
- `SERVERLESS_ARCHITECTURE.md` - Serverless migration planning
- `docs/aws-infrastructure-management-plan.md` - Detailed CDK strategy
- `app/lib/aws-config.ts` - Runtime AWS service configuration

## 🔍 Monitoring & Debug Tools

### Debug Endpoints
- `/api/debug-env` - Environment variable verification
- `/api/debug-all-env` - Comprehensive environment inspection

### Health Checks
- Database connectivity verification
- Environment variable presence validation
- NextAuth configuration verification

## 🛡️ Security Configuration

### Authentication
- **Provider**: NextAuth with Google OAuth
- **Session Management**: JWT-based sessions
- **Environment-specific secrets**: Unique `NEXTAUTH_SECRET` per environment

### Database Security
- **SSL Required**: All connections use `sslmode=require`
- **Connection Pooling**: Separate pooled/direct URLs for different use cases
- **Branch Isolation**: Environment-specific database branches

### AWS Security
- **IAM**: Minimal required permissions (to be formalized with CDK)
- **Encryption**: S3 buckets encrypted at rest
- **Network**: No VPC complexity (serverless approach)

## 🔄 Migration History

### Recent Changes
1. **Fixed DATABASE_MIGRATION_URL Issue** - Added to `next.config.ts` env section
2. **Progressive Deployment Pipeline** - Established develop → staging → main flow  
3. **Environment Variable Standardization** - Moved from Secrets Manager to standard env vars
4. **Smart Build Detection** - Implemented environment detection in `amplify.yml`

### Current Issues Resolved
- ✅ Database migration URL availability at runtime
- ✅ Environment-specific configuration management
- ✅ Three-environment deployment workflow
- ✅ Authentication secrets management

## 📈 Future Infrastructure Plans

### Proposed CDK Implementation
The `infrastructure/` directory contains CDK files that will:
1. **Codify current AWS resources** in declarative format
2. **Enable version-controlled infrastructure** changes
3. **Automate resource provisioning** across environments
4. **Standardize IAM policies** and security configurations

### Migration Strategy
1. **Document current state** ✅ (this file)
2. **Create CDK definitions** ✅ (infrastructure/ directory)
3. **Deploy CDK alongside existing resources** (planned)
4. **Gradually migrate to CDK-managed resources** (planned)
5. **Decommission manually-created resources** (planned)

## 📞 Operational Procedures

### Environment Variable Updates
1. **Local Development**: Update `.env.local`
2. **Staging/Production**: Update via Amplify Console → Environment Variables
3. **Restart Required**: Yes - redeploy via git push or manual Amplify trigger

### Database Management
1. **Schema Changes**: Apply to development first via `prisma db push`
2. **Migrations**: Create migrations for staging/production via `prisma migrate dev`
3. **Branch Management**: Done via Neon console

### Troubleshooting
1. **Check build logs** in Amplify console
2. **Verify environment variables** via debug endpoints
3. **Test database connectivity** via Neon console
4. **Review application logs** in Amplify console

---

**Last Updated**: 2024-12-01  
**Environment Status**: ✅ All environments operational  
**Infrastructure Management**: Manual + CDK (in progress) 