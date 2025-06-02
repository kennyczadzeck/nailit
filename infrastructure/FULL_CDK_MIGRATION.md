# Complete CDK Migration Guide
## Moving ALL AWS Infrastructure (Including Amplify) to CDK

This guide outlines what it would take to manage **everything** via CDK, including your Amplify application.

## 🎯 What Full CDK Would Give You

### 📋 Complete Infrastructure as Code
- **Version Control**: All infrastructure changes tracked in Git
- **Reproducibility**: Recreate entire environments from code  
- **Consistency**: Identical configuration across dev/staging/prod
- **Integration**: Tight coupling between Amplify and AWS services
- **Automation**: Deploy everything with single command

### 🔄 Deployment Workflows
```bash
# Deploy everything for development
cdk deploy --context environment=development

# Deploy everything for staging  
cdk deploy --context environment=staging

# Deploy everything for production
cdk deploy --context environment=production

# Deploy ALL environments at once (Amplify + all infrastructure)
cdk deploy --context environment=all
```

## 📊 What Would Be CDK-Managed

| Resource Type | Current State | Full CDK State |
|---------------|---------------|----------------|
| **Amplify App** | 🖱️ Manual Console | 🏗️ CDK Managed |
| **Amplify Branches** | 🖱️ Manual Console | 🏗️ CDK Managed |
| **Environment Variables** | 🖱️ Manual Console | 🏗️ CDK Managed |
| **Build Settings** | 📁 Repository (`amplify.yml`) | 🏗️ CDK Managed |
| **Custom Domains** | 🖱️ Manual Console | 🏗️ CDK Managed |
| **IAM Roles** | 🖱️ Manual Console | 🏗️ CDK Managed |
| **S3/SQS/SNS** | 🔄 Planned CDK | ✅ CDK Managed |

## 🛠️ Implementation Requirements

### 1. Prerequisites
```bash
# GitHub Personal Access Token (for CDK to access repo)
export GITHUB_ACCESS_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# Custom domain (optional but recommended)
# Domain: nailit.dev
# Subdomains: app.nailit.dev, staging.nailit.dev, develop.nailit.dev
```

### 2. Updated Package.json Scripts
```json
{
  "scripts": {
    "deploy:dev": "cdk deploy --context environment=development",
    "deploy:staging": "cdk deploy --context environment=staging", 
    "deploy:prod": "cdk deploy --context environment=production",
    "deploy:all": "cdk deploy --context environment=all",
    "deploy:amplify-only": "cdk deploy NailIt-Amplify-Stack",
    "deploy:infra-only": "cdk deploy NailIt-*-Stack --exclude NailIt-Amplify-Stack"
  }
}
```

### 3. Environment Variable Management
All environment variables move from Amplify Console to CDK code:

```typescript
// In CDK Stack
environmentVariables: {
  DATABASE_URL: 'postgresql://...',
  DATABASE_MIGRATION_URL: 'postgresql://...',
  NEXTAUTH_SECRET: 'environment-specific-secret',
  NEXTAUTH_URL: 'https://develop.d1rq0k9js5lwg3.amplifyapp.com',
  GOOGLE_CLIENT_ID: '1045127662265-abc123.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'environment-specific-secret',
  AWS_S3_BUCKET: cdk.Fn.importValue(`NailIt-dev-EmailBucket`),
  AWS_SQS_EMAIL_QUEUE: cdk.Fn.importValue(`NailIt-dev-EmailQueue`),
  AWS_SNS_TOPIC: cdk.Fn.importValue(`NailIt-dev-NotificationTopic`),
}
```

## ✅ Benefits of Full CDK

### 🚀 Operational Benefits
- **Single Command Deploy**: Deploy everything with one command
- **Environment Consistency**: Guaranteed identical configurations
- **Rollback Capability**: CDK rollback includes Amplify configuration
- **Change Tracking**: Git history shows all infrastructure changes
- **Cross-Service Integration**: Easy references between resources

### 💰 Cost Benefits
- **Resource Optimization**: Better lifecycle management
- **Tag Consistency**: Improved cost allocation tracking
- **Unused Resource Detection**: CDK drift detection

### 🔒 Security Benefits
- **IAM Precision**: Exact permissions via CDK policies
- **Secret Management**: Centralized secret handling
- **Compliance**: Auditable infrastructure changes

## ⚠️ Challenges & Considerations

### 🚨 Migration Complexity
- **Initial Setup**: More complex than current manual approach
- **Learning Curve**: Team needs CDK + Amplify CDK knowledge
- **Environment Variables**: Must migrate secrets carefully
- **GitHub Token**: Requires secure token management

### 🔄 Deployment Workflow Changes
- **Current**: Push to GitHub → Amplify auto-deploys
- **Full CDK**: CDK deploy → Creates/Updates Amplify → GitHub still triggers builds

### 🛡️ Risk Mitigation
- **Staged Migration**: Move one environment at a time
- **Backup Strategy**: Export current Amplify configuration
- **Rollback Plan**: Keep manual configuration until verified

## 📋 Migration Strategy

### Phase 1: Infrastructure Only (Current Plan)
```bash
# Deploy AWS services via CDK, keep Amplify manual
npm run deploy:dev
npm run deploy:staging  
npm run deploy:prod
```

### Phase 2: Amplify via CDK (Optional Future Enhancement)
```bash
# After Phase 1 is stable, add Amplify to CDK
npm run deploy:all  # Deploys infrastructure + Amplify configuration
```

### Phase 3: Complete Automation
```bash
# CI/CD pipeline deploys everything
# GitHub Actions → CDK Deploy → Amplify Updates → Application Deploys
```

## 🎛️ Deployment Commands

### Current Workflow (Manual Amplify)
```bash
# Infrastructure only
cd infrastructure
npm run deploy:dev

# Application deployment
git push origin develop  # Amplify auto-deploys
```

### Full CDK Workflow
```bash
# Everything together
cd infrastructure
npm run deploy:all

# Or individual environments
npm run deploy:dev      # Infrastructure + Amplify config for dev
npm run deploy:staging  # Infrastructure + Amplify config for staging
npm run deploy:prod     # Infrastructure + Amplify config for prod
```

## 🤔 Recommendation

### For Your Current Situation
**Stick with current approach** for these reasons:

1. **Working System**: Your 3-environment Amplify setup works perfectly
2. **Low Risk**: Manual Amplify configuration is stable and familiar
3. **Incremental Value**: CDK for AWS services gives most benefits
4. **Future Option**: Can always migrate Amplify later if needed

### When Full CDK Makes Sense
- **Multiple Teams**: Need consistent infrastructure across teams
- **Complex Integrations**: Tight coupling between Amplify and AWS services
- **Compliance Requirements**: Need complete infrastructure auditability  
- **Scale**: Managing 10+ environments or applications

## 📝 Implementation Example

If you want to proceed with full CDK, the implementation would:

1. **Preserve Current URLs**: Keep `d1rq0k9js5lwg3.amplifyapp.com` domains
2. **Maintain GitHub Integration**: Same repository triggers
3. **Keep Environment Detection**: Same `amplify.yml` logic in CDK
4. **Preserve Secrets**: Migrate environment variables safely

The key insight: **You can have best of both worlds** - CDK for AWS services (cost savings, IaC benefits) while keeping Amplify manual (proven, stable, working).

---

**My Recommendation**: Proceed with the current infrastructure migration plan (Phase 1) and consider Amplify CDK (Phase 2) only if you encounter limitations with the manual approach. 