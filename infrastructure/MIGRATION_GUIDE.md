# NailIt Infrastructure Migration Guide
## From VPC-based to Serverless CDK

This guide shows how to migrate from the legacy VPC-based infrastructure to the new serverless architecture **while preserving all your Amplify and GitHub branch work**.

## 🛡️ What This Migration PRESERVES

✅ **All Amplify Configuration**
- 3 environments: develop, staging, main
- GitHub branch auto-deployment
- Environment variables in Amplify console
- Build configuration (`amplify.yml`)

✅ **All Application Work** 
- Next.js application code
- Database integration (Neon PostgreSQL)
- Authentication (NextAuth + Google OAuth)
- Debug endpoints and monitoring
- Progressive deployment workflow

✅ **All Environment Setup**
- Branch-based environment detection
- Unique secrets per environment
- Database branch mapping
- Smart build strategies

## 🔄 What This Migration CHANGES

❌ **Removes (Cost Savings)**
- VPC and networking complexity
- RDS PostgreSQL (replaced with Neon)
- ElastiCache Redis (will add Upstash when needed)
- NAT Gateway (expensive!)
- Lambda VPC configuration

✅ **Adds (Serverless Benefits)**
- Simplified S3, SQS, SNS management
- Environment-specific resource naming
- Proper IAM policies
- Cost-optimized architecture

## 📋 Migration Steps

### Phase 1: Deploy New Serverless Infrastructure

```bash
# 1. Install CDK dependencies
cd infrastructure
npm install

# 2. Deploy development environment first
npm run deploy:dev

# 3. Note the CDK outputs (S3 bucket, SQS URLs, SNS ARN)
```

### Phase 2: Update Amplify Environment Variables

For each environment (dev, staging, prod), update these variables in Amplify Console:

```bash
# Replace old values with CDK outputs
AWS_S3_BUCKET=nailit-dev-emails-207091906248           # From CDK output
AWS_SQS_EMAIL_QUEUE=https://sqs.us-east-1.amazonaws.com/207091906248/nailit-dev-email-queue  # From CDK output  
AWS_SNS_TOPIC=arn:aws:sns:us-east-1:207091906248:nailit-dev-notifications                   # From CDK output
```

### Phase 3: Test Each Environment

```bash
# 1. Deploy to development
git push origin develop

# 2. Test functionality via debug endpoints:
# https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/debug-env

# 3. Verify all environment variables are correct

# 4. Repeat for staging and production
npm run deploy:staging
git push origin staging

npm run deploy:prod  
git push origin main
```

### Phase 4: Cleanup Legacy Infrastructure

```bash
# Only after verifying all environments work
cd archive/legacy-infrastructure
cdk destroy NailIt-dev-Stack
```

## 🔧 Environment-Specific Deployment

### Development
```bash
cd infrastructure
npm run deploy:dev
# Updates: nailit-dev-emails-207091906248, nailit-dev-email-queue, etc.
```

### Staging  
```bash
npm run deploy:staging
# Creates: nailit-staging-emails-207091906248, nailit-staging-email-queue, etc.
```

### Production
```bash
npm run deploy:prod
# Creates: nailit-prod-emails-207091906248, nailit-prod-email-queue, etc.
```

## 📊 Resource Mapping

| Legacy Resource | New Serverless Resource | Notes |
|----------------|------------------------|--------|
| VPC + Subnets | ❌ Removed | No longer needed |
| RDS PostgreSQL | 🔄 Neon PostgreSQL | Already migrated |
| ElastiCache Redis | 🔄 Upstash Redis | Future addition |
| S3 Bucket | ✅ S3 Bucket | CDK-managed with lifecycle |
| SQS Queues | ✅ SQS Queues | CDK-managed with DLQ |
| SNS Topics | ✅ SNS Topics | CDK-managed |
| Lambda in VPC | 🔄 Lambda (no VPC) | Future addition |

## 🎯 Post-Migration Benefits

### Cost Savings
- **Remove NAT Gateway**: ~$45/month savings
- **Remove RDS**: ~$15/month savings  
- **Remove ElastiCache**: ~$15/month savings
- **Total Savings**: ~$75/month

### Operational Benefits
- **Faster deployments**: No VPC complexity
- **Easier debugging**: No networking issues
- **Better scaling**: Serverless auto-scaling
- **Simplified IAM**: Clear resource permissions

## 🚨 Safety Checklist

Before starting migration:

- [ ] **Backup verification**: Confirm all environments are working
- [ ] **Environment variables documented**: Know all current Amplify settings
- [ ] **Database access confirmed**: Neon connections working
- [ ] **CDK deployment tested**: Successfully deploy to development first

During migration:

- [ ] **One environment at a time**: Never migrate all environments simultaneously
- [ ] **Test after each environment**: Verify functionality before proceeding
- [ ] **Keep legacy stack**: Don't destroy until all environments verified

After migration:

- [ ] **All environments working**: Development, staging, production functional
- [ ] **Debug endpoints responding**: Environment variable checks passing
- [ ] **Authentication working**: Google OAuth and NextAuth functional
- [ ] **Database operations working**: Can create/read data

## 🔄 Rollback Plan

If anything goes wrong:

1. **Revert Amplify environment variables** to previous values
2. **Redeploy application** via git push to restore previous state
3. **Keep legacy CDK stack** until issues resolved
4. **Debug via endpoints** to identify specific issues

## 📞 Troubleshooting

### Common Issues

**Environment variables not updating**
- Solution: Trigger manual redeploy in Amplify console

**CDK deployment fails**
- Solution: Check AWS credentials and permissions
- Solution: Verify account ID and region settings

**Application can't connect to AWS services**
- Solution: Verify IAM permissions in CDK stack
- Solution: Check environment variable names match exactly

### Debug Commands

```bash
# Check CDK deployment status
cd infrastructure && cdk diff

# Check environment variables
curl https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/debug-env

# Check AWS resources exist
aws s3 ls | grep nailit
aws sqs list-queues | grep nailit
```

---

**The key insight**: Your Amplify and GitHub work is preserved because it's completely separate from the AWS resource management layer. We're only changing how AWS resources are created and managed, not how your application deploys or runs. 