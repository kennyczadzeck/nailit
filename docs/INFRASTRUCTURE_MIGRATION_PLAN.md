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

### **Phase 2: Legacy Cleanup (Next Week)**

#### **Option A: Keep CDK for Future Services**
```bash
# Move CDK to "future services" folder
mkdir infrastructure/future-services
mv infrastructure/lib/* infrastructure/future-services/
```

#### **Option B: Complete Removal**
```bash
# If you want to completely remove CDK
rm -rf infrastructure/
```

#### **Option C: Selective Cleanup**
Keep useful parts, remove complex ones:
```typescript
// Keep: S3, SNS, CloudWatch
// Remove: VPC, RDS, Lambda, API Gateway, Redis
```

### **Phase 3: Future Services Strategy**

When you need additional AWS services, add them incrementally:

```typescript
// infrastructure/services/file-upload-stack.ts
export class FileUploadStack extends cdk.Stack {
  // S3 bucket for file uploads
  // Lambda for file processing
  // CloudFront for CDN
}

// infrastructure/services/notification-stack.ts  
export class NotificationStack extends cdk.Stack {
  // SNS for push notifications
  // SES for email sending
  // EventBridge for webhooks
}
```

## 🎯 **Decision Required**

### **Immediate Choice: How to Handle Current CDK Stack?**

**Option 1: Archive (Recommended)**
```bash
mkdir archive/
mv infrastructure/ archive/legacy-infrastructure/
# Document why it's archived in README
```

**Option 2: Selective Keep**
```bash
# Keep only S3 and SNS components
# Remove VPC, RDS, Lambda complexity
```

**Option 3: Complete Removal**
```bash
rm -rf infrastructure/
# Start fresh when you need AWS services
```

## 📊 **Cost & Complexity Comparison**

### **Legacy CDK Architecture**
- **Monthly Cost**: ~$50-100 (VPC, RDS, Redis, NAT Gateway)
- **Complexity**: High (VPC management, security groups, etc.)
- **Maintenance**: Significant (updates, monitoring, scaling)

### **New Serverless Architecture**
- **Monthly Cost**: ~$5-20 (Amplify + Neon free tier)
- **Complexity**: Low (managed services only)
- **Maintenance**: Minimal (platform updates handled automatically)

## ✅ **Recommended Next Actions**

1. **✅ Set up Amplify environments** (3 environments)
2. **✅ Configure environment variables** (from Neon setup doc)
3. **✅ Test deployment pipeline** (all branches → environments)
4. **✅ Archive legacy CDK infrastructure** (document decision)
5. **📋 Plan future services** (S3 for uploads, SNS for notifications)

**Bottom Line**: Your current serverless approach is **significantly simpler and more cost-effective** than the original CDK architecture. Focus on Amplify environments first, worry about additional AWS services later when you actually need them. 