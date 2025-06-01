# Archived Infrastructure

## 📁 **Contents**
- `legacy-infrastructure/` - Original AWS CDK infrastructure stack

## 🗃️ **Why Archived?**

### **Original Architecture (2025-05)**
- **Approach**: Lambda-centric serverless with VPC
- **Components**: VPC, RDS, Redis, Lambda, API Gateway, SQS, SNS
- **Complexity**: High (VPC management, security groups)
- **Cost**: ~$50-100/month (VPC, RDS, Redis, NAT Gateway)

### **New Architecture (2025-06)**
- **Approach**: Amplify + Neon serverless
- **Components**: Amplify (hosting), Neon (database), NextAuth (auth)
- **Complexity**: Low (managed services only)
- **Cost**: ~$5-20/month (Amplify + Neon free tier)

## 🎯 **Migration Decision**

**Date**: June 1, 2025
**Reason**: Simplified architecture is more appropriate for MVP stage
**Benefits**:
- ✅ 80% cost reduction
- ✅ 90% complexity reduction  
- ✅ Zero infrastructure maintenance
- ✅ Faster development cycles
- ✅ Better scaling characteristics

## 🚀 **Current Architecture**

```
AWS Amplify (Frontend + Build Pipeline)
    ↓
Neon PostgreSQL (External, Managed)
    ↓
NextAuth.js (Authentication)
    ↓
Google OAuth + APIs
```

## 📋 **Future Services Strategy**

When additional AWS services are needed:
- Add **incremental CDK stacks** for specific services
- Keep core hosting on **Amplify** 
- Use **targeted infrastructure** (S3, SNS, SES) as needed

## 🔗 **References**
- Current setup: `docs/INFRASTRUCTURE_MIGRATION_PLAN.md`
- Environment strategy: `docs/ENVIRONMENT_STRATEGY.md`
- Database setup: `docs/NEON_DATABASE_SETUP.md` 