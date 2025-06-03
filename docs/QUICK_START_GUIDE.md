# 🚀 NailIt Quick Start Guide

*Last Updated: January 2025*

## 📋 **Project Status: Production Ready**

### **System Health**
- ✅ **3 Environments**: All operational (dev/staging/prod)
- ✅ **90+ Tests**: Comprehensive coverage with BDD
- ✅ **CI/CD Pipeline**: Industry-standard GitHub Actions
- ✅ **Database**: Neon PostgreSQL with branch-per-environment
- ✅ **Authentication**: Google OAuth fully implemented
- ✅ **Infrastructure**: AWS Amplify + serverless architecture

---

## 🎯 **Immediate Context**

### **What This Project Is**
NailIt is a **construction project management platform** currently in MVP phase with:
- **Frontend**: Next.js/React on AWS Amplify
- **Database**: Neon PostgreSQL (serverless) 
- **Authentication**: NextAuth with Google OAuth
- **CI/CD**: GitHub Actions with PR validation + environment deployment

### **Current Development State**
- **Feature Complete**: Core MVP functionality implemented
- **Test Coverage**: 90+ tests across unit/integration/BDD layers
- **Infrastructure**: Recently migrated from expensive VPC to serverless (~$75/month savings)
- **Documentation**: Comprehensive docs reorganized in January 2025

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend: AWS Amplify (Auto-deploy)                        │
│ App ID: d1rq0k9js5lwg3                                     │
│ Repo: github.com/kennyczadzeck/nailit                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ Database: Neon PostgreSQL (kenny@kennyczadzeck.com)        │
│ Project: nailit-production                                 │
│ Branches: dev/staging/prod                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ AWS Services (Account: 207091906248)                       │
│ S3 + SQS + SNS in us-east-1                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌍 **Three Environment Setup**

| Environment | Branch | URL | Database Branch |
|-------------|--------|-----|-----------------|
| **Development** | `develop` | `develop.d1rq0k9js5lwg3.amplifyapp.com` | `br-still-paper-a5tgtem8` |
| **Staging** | `staging` | `staging.d1rq0k9js5lwg3.amplifyapp.com` | `br-raspy-sound-a5eg97xu` |
| **Production** | `main` | `main.d1rq0k9js5lwg3.amplifyapp.com` | `br-misty-frog-a5pcr9pt` |

---

## 🚀 **Development Workflow**

### **Standard Git Flow**
1. Create feature branch from `develop`
2. Make changes with TDD approach
3. Run `npm run test:all` before push
4. Create PR → triggers automated validation
5. Merge to `develop` → auto-deploys to dev environment
6. Promote: `develop` → `staging` → `main`

### **Essential Commands**
```bash
# Local development
npm run dev                     # Start development server
npm run test:watch              # TDD with watch mode
npm run test:all                # Complete test suite

# Pre-commit checks
npm run type-check              # TypeScript validation
npm run lint:ci                 # Linting with CI threshold
npm run build                   # Production build test

# Database
npx prisma studio               # Database GUI
npx prisma db push              # Push schema changes (dev)
npx prisma migrate deploy       # Deploy migrations (prod)
```

---

## 🧪 **Testing Architecture**

### **Test Organization**
```
tests/
├── unit/           # 21 tests - Component logic
├── integration/    # 4 tests - API routes  
├── bdd/           # 34 tests - User stories
├── fixtures/      # 11 tests - Test data
└── helpers/       # Testing utilities
```

### **CI/CD Workflows**
- **`pr-checks.yml`**: Validates all PRs (no environment secrets)
- **`environment-deployment.yml`**: Tests real environments (with secrets)
- **Industry Standard**: Separate validation from deployment

---

## 🔧 **Key Files to Know**

### **Configuration**
- `next.config.ts` - Environment variable injection
- `amplify.yml` - Build configuration with smart detection
- `prisma/schema.prisma` - Database schema
- `.github/workflows/` - CI/CD pipeline definitions

### **Core Application**
- `app/` - Next.js app router structure
- `app/api/` - API routes (projects, auth, etc.)
- `app/lib/` - Shared utilities and configurations
- `components/` - Reusable React components

### **Environment Variables**
- Development: `.env.local` (local development)
- Staging/Production: AWS Amplify Console (secured)
- Database URLs: Environment-specific Neon branches
- Google OAuth: Same credentials across all environments

---

## 📚 **Documentation Navigation**

### **Quick Reference**
- `docs/architecture/CURRENT_INFRASTRUCTURE.md` - Detailed infrastructure state
- `docs/deployment/CICD_IMPLEMENTATION_SUMMARY.md` - CI/CD pipeline details
- `docs/testing/TESTING_PLAN.md` - Complete testing strategy
- `docs/development/USER_STORIES.md` - MVP requirements and features

### **Common Scenarios**
- **Environment Issues**: Check `docs/deployment/ENVIRONMENT_STRATEGY.md`
- **Database Problems**: Check `docs/development/DATABASE.md`
- **Test Failures**: Check `docs/testing/DATABASE_TESTING_STRATEGY.md`
- **Authentication Issues**: Check `docs/authentication/AUTHENTICATION_STATUS.md`

---

## 🎯 **Key Success Metrics**

### **Current State (January 2025)**
- **Test Success Rate**: 90+ tests passing (near 100%)
- **Build Performance**: < 2 minutes for complete CI validation
- **Infrastructure Cost**: ~$75/month savings with serverless migration
- **Deployment Success**: 3-environment pipeline working smoothly
- **Documentation**: Comprehensive with 25+ organized documents

### **Production Readiness**
- ✅ Google OAuth working across all environments
- ✅ Database connectivity verified in all environments  
- ✅ CI/CD pipeline with industry-standard security
- ✅ Comprehensive test coverage with BDD validation
- ✅ Monitoring and health checks operational

---

## 🚨 **Emergency Contacts & Access**

### **Critical Account Information**
- **AWS Account**: 207091906248 (kenny@kennyczadzeck.com)
- **Neon Database**: kenny@kennyczadzeck.com
- **GitHub Repository**: kennyczadzeck/nailit
- **Google Cloud**: Same Gmail account for OAuth

### **Quick Debug Commands**
```bash
# Health checks
curl https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/health
curl https://staging.d1rq0k9js5lwg3.amplifyapp.com/api/health  
curl https://main.d1rq0k9js5lwg3.amplifyapp.com/api/health

# Environment debugging
curl https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/debug-env
```

---

## 📈 **What's Next**

### **Current Sprint Focus**
- Maintaining test coverage as features are added
- Performance optimization opportunities
- Enhanced monitoring and alerting
- Feature development based on user feedback

### **Architecture Evolution**
- Current: Serverless with Amplify + Neon
- Future: Potential CDK implementation for advanced AWS integration
- Documentation: Keep docs updated as system evolves 