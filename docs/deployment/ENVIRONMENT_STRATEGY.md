# Multi-Environment Strategy

## Overview

This document outlines our comprehensive environment strategy using:
- **Git Branching**: Feature → Develop → Staging → Production
- **Neon Database Branching**: Schema branching that mirrors git workflow
- **AWS Amplify Environments**: Separate deployments for each environment
- **Prisma Migrations**: Proper schema versioning across environments

## 🌳 **Environment Architecture**

```
Production:  main branch        → AWS Amplify (prod)    → Neon main branch
Staging:     staging branch     → AWS Amplify (staging) → Neon staging branch  
Development: develop branch     → AWS Amplify (dev)     → Neon dev branch
Features:    feature/* branches → Local/Preview         → Neon feature branches
```

## 🔄 **Git Branching Strategy**

### Branch Structure
```bash
main                    # Production-ready code
├── staging            # Pre-production testing
├── develop            # Integration branch
└── feature/           # Feature development
    ├── feature/user-auth
    ├── feature/email-monitoring
    └── feature/dashboard-ui
```

### Workflow
1. **Feature Development**: Create `feature/your-feature` from `develop`
2. **Integration**: PR `feature/your-feature` → `develop`
3. **Staging**: PR `develop` → `staging` (weekly/bi-weekly)
4. **Production**: PR `staging` → `main` (after QA approval)

## 🗄️ **Neon Database Branching Strategy**

### Database Branch Structure
```
neon_main_branch        # Production database
├── neon_staging_branch # Staging with production data copy
├── neon_dev_branch     # Development with sample data
└── feature_branches/   # Schema experimentation
    ├── schema_v2_test
    └── email_settings_rework
```

### Benefits of Neon Branching
- **Schema Safety**: Test migrations on copy of production data
- **Fast Creation**: New database branches in seconds
- **Zero Downtime**: Schema changes without affecting production
- **Data Reset**: Easy to reset dev/staging data from production

### Migration Workflow with Neon
```bash
# 1. Create feature branch (both git and database)
git checkout -b feature/new-schema
# Neon: Create feature branch from main

# 2. Develop schema changes
npx prisma db push              # Push to feature database branch
npx prisma studio              # Test with Neon studio

# 3. Create formal migration
npx prisma migrate dev --name add-new-feature

# 4. Test on staging database
# Neon: Merge feature branch → staging branch
npx prisma migrate deploy      # Apply to staging

# 5. Deploy to production
# After PR approval: Neon staging → main
npx prisma migrate deploy      # Apply to production
```

## 🚀 **AWS Amplify Multi-Environment Setup**

### Environment Configuration

#### Production Environment
```yaml
# amplify.yml (main branch)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install --legacy-peer-deps
        - npx prisma migrate deploy        # Use formal migrations
        - npx prisma generate
    build:
      commands:
        - npm run build -- --no-lint
  artifacts:
    baseDirectory: .next
    files: ['**/*']
```

#### Staging Environment  
```yaml
# amplify.yml (staging branch)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install --legacy-peer-deps
        - npx prisma migrate deploy        # Test migrations
        - npx prisma generate
    build:
      commands:
        - npm run build -- --no-lint
  artifacts:
    baseDirectory: .next
    files: ['**/*']
```

#### Development Environment
```yaml
# amplify.yml (develop branch)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install --legacy-peer-deps
        - npx prisma db push --accept-data-loss  # Rapid iteration
        - npx prisma generate
    build:
      commands:
        - npm run build -- --no-lint
  artifacts:
    baseDirectory: .next
    files: ['**/*']
```

## 🔧 **Environment Variables Strategy**

### Environment-Specific Variables
```bash
# Production
DATABASE_URL=neon_main_branch_url
DIRECT_URL=neon_main_direct_url
NEXTAUTH_URL=https://nailit.app

# Staging
DATABASE_URL=neon_staging_branch_url
DIRECT_URL=neon_staging_direct_url
NEXTAUTH_URL=https://staging.nailit.app

# Development
DATABASE_URL=neon_dev_branch_url
DIRECT_URL=neon_dev_direct_url
NEXTAUTH_URL=https://dev.nailit.app
```

### AWS Parameter Store Integration (Future)
```bash
# Store environment-specific secrets
aws ssm put-parameter --name "/nailit/prod/DATABASE_URL" --value "$PROD_DB_URL" --type "SecureString"
aws ssm put-parameter --name "/nailit/staging/DATABASE_URL" --value "$STAGING_DB_URL" --type "SecureString"
aws ssm put-parameter --name "/nailit/dev/DATABASE_URL" --value "$DEV_DB_URL" --type "SecureString"
```

## 📋 **Implementation Plan**

### Phase 1: Setup Git Branches (This Week)
```bash
# Create and push new branches
git checkout -b develop
git push origin develop

git checkout -b staging  
git push origin staging

# Set up branch protection rules in GitHub
```

### Phase 2: Setup Neon Database Branches (This Week)
- [ ] Create `staging` branch from `main` in Neon console
- [ ] Create `dev` branch from `main` in Neon console
- [ ] Test schema changes on `dev` branch
- [ ] Document Neon MCP integration setup

### Phase 3: Setup AWS Amplify Environments (Next Week)
- [ ] Create staging environment in AWS Amplify
- [ ] Create development environment in AWS Amplify
- [ ] Configure environment-specific variables
- [ ] Test deployment pipeline

### Phase 4: Migration to Formal Migrations (Following Week)
- [ ] Create initial migration from current schema
- [ ] Update production to use `prisma migrate deploy`
- [ ] Test rollback procedures
- [ ] Document emergency procedures

## 🛠️ **Neon MCP Integration Benefits**

Having Neon's MCP integration would be extremely helpful for:

### 1. **Automated Branch Management**
```typescript
// Potential automation with MCP
await neon.createBranch({
  name: `feature-${gitBranch}`,
  parent: 'main',
  purpose: 'schema-development'
})
```

### 2. **Schema Diff Automation**
- Compare schema changes between branches
- Generate migration previews
- Validate schema compatibility

### 3. **Data Management**
- Reset development data from production snapshots
- Create test datasets for different scenarios
- Manage branch lifecycle automatically

### 4. **Monitoring & Alerts**
- Track schema changes across environments
- Alert on dangerous migrations
- Monitor branch resource usage

## 🚨 **Emergency Procedures**

### Production Schema Issue
1. **Immediate**: Rollback via Neon point-in-time recovery
2. **Diagnose**: Check differences between Neon branches
3. **Fix**: Apply hotfix migration or revert schema
4. **Prevent**: Improve staging testing procedures

### Environment Sync Issues
1. **Check**: Neon branch status and migrations
2. **Compare**: Schema differences between environments
3. **Sync**: Reset problematic environment from working branch
4. **Update**: Documentation and procedures

## 📊 **Success Metrics**

### Deployment Safety
- [ ] Zero production schema failures
- [ ] All changes tested in staging first
- [ ] Rollback capability within 5 minutes

### Development Velocity  
- [ ] Feature branches deployable within 1 hour
- [ ] Schema changes testable immediately
- [ ] No blocking of parallel development

### Team Collaboration
- [ ] Clear environment ownership
- [ ] Documented promotion process
- [ ] Automated environment status checks

## 🎯 **Next Actions**

1. **Set up Neon MCP integration** (your offer - yes please!)
2. **Create git branches** and protection rules
3. **Setup Neon database branches** 
4. **Configure AWS Amplify environments**
5. **Test the complete workflow** with a sample feature

Would you like to proceed with setting up the Neon MCP integration? That would significantly accelerate our environment management capabilities! 