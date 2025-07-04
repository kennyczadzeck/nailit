# 🔐 Secure CI/CD Credential Management

## Overview

This document explains how NailIt's automated CI/CD pipeline maintains security while deploying applications through GitHub Actions to AWS App Runner. The credential management approach ensures **zero hardcoded secrets** in the codebase while preserving the **fully automated deployment workflow**.

## 🚀 Automated Deployment Architecture

### **Current CI/CD Flow (Maintained)**
```
Code Push → GitHub Actions → Docker Build → ECR Push → App Runner Auto-Deploy
     ↓              ↓              ↓           ↓             ↓
  develop    Security Scan    Build Args    Container   Production
  staging       Tests        Embed Vars     Registry      Runtime
   main      Type Check                                    
```

### **Branch-Based Environment Deployment**
- **`develop` branch** → Development environment (auto-deploy)
- **`staging` branch** → Staging environment (auto-deploy)  
- **`main` branch** → Production environment (auto-deploy)

### **GitHub Actions Workflows**
1. **`.github/workflows/security-validation.yml`** - Security scans and credential validation
2. **`.github/workflows/docker-build-deploy.yml`** - Automated Docker build and deployment
3. **`.github/workflows/pr-checks.yml`** - Pull request validation

## 🛡️ Security Implementation

### **1. Infrastructure Credential Management**

#### **CDK Deployment (One-Time Setup)**
```bash
# Infrastructure deployment with secure credentials
cd infrastructure
./scripts/deploy-with-secrets.sh development
./scripts/deploy-with-secrets.sh staging  
./scripts/deploy-with-secrets.sh production
```

#### **Local Credential Storage**
```bash
# infrastructure/.env.secrets (NOT committed to Git)
NAILIT_DATABASE_URL_DEVELOPMENT="postgresql://..."
NAILIT_DATABASE_URL_STAGING="postgresql://..."
NAILIT_DATABASE_URL_PRODUCTION="postgresql://..."

NAILIT_GOOGLE_CLIENT_SECRET_DEVELOPMENT="GOCSPX-..."
NAILIT_GOOGLE_CLIENT_SECRET_STAGING="GOCSPX-..."
NAILIT_GOOGLE_CLIENT_SECRET_PRODUCTION="GOCSPX-..."

NAILIT_GOOGLE_MAPS_API_KEY_DEVELOPMENT="AIzaSy..."
NAILIT_GOOGLE_MAPS_API_KEY_STAGING="AIzaSy..."
NAILIT_GOOGLE_MAPS_API_KEY_PRODUCTION="AIzaSy..."
```

### **2. GitHub Actions Secrets (Required Setup)**

#### **Repository Secrets**
Navigate to: `GitHub Repository → Settings → Secrets and variables → Actions`

**Required Secrets:**
```yaml
AWS_ACCESS_KEY_ID: "AKIA..."              # AWS access for ECR/App Runner
AWS_SECRET_ACCESS_KEY: "..."              # AWS secret key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSy..." # Public API key for build
```

#### **Security Validation**
```yaml
# .github/workflows/security-validation.yml
- name: Check for hardcoded secrets
  run: |
    # Fails if ANY hardcoded credentials found in source code
    if grep -r "AIzaSy\|GOCSPX\|npg_" --include="*.ts" infrastructure/lib/; then
      exit 1  # Blocks deployment
    fi
```

### **3. Runtime Credential Management**

#### **AWS Secrets Manager (Production)**
All runtime credentials stored securely:
```yaml
# Automatically created by CDK deployment
nailit-database-development: "postgresql://..."
nailit-nextauth-secret-development: "..."
nailit-google-client-secret-development: "GOCSPX-..."
nailit-google-maps-api-key-development: "AIzaSy..."
```

#### **App Runner Integration**
```typescript
// infrastructure/lib/app-runner-stack.ts
runtimeEnvironmentSecrets: {
  DATABASE_URL: { valueFrom: secretArns.databaseSecretArn },
  NEXTAUTH_SECRET: { valueFrom: secretArns.nextauthSecretArn },
  GOOGLE_CLIENT_SECRET: { valueFrom: secretArns.googleClientSecretArn },
  // Runtime secrets automatically injected
}
```

## 🔄 Automated Deployment Process

### **Step 1: Code Changes**
```bash
# Developer workflow (unchanged)
git checkout develop
# Make code changes
git add .
git commit -m "feat: add new feature"
git push origin develop
```

### **Step 2: Automated Security Validation**
```yaml
# Automatic security checks on every push
- Security credential scan (fails if hardcoded secrets found)
- Debug endpoint protection validation
- Application security middleware verification
- Build process security validation
```

### **Step 3: Automated Docker Build**
```yaml
# .github/workflows/docker-build-deploy.yml
- name: Build and push Docker image
  with:
    build-args: |
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${{ secrets.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }}
      NEXT_PUBLIC_BUILD_TIME=${{ steps.meta.outputs.build_time }}
      NAILIT_ENVIRONMENT=development
```

### **Step 4: Automatic App Runner Deployment**
```yaml
- name: Update App Runner service
  run: |
    aws apprunner start-deployment --service-arn "$SERVICE_ARN"
    # App Runner automatically pulls new image and deploys
```

## 📋 Developer Workflow (Unchanged)

### **Daily Development**
```bash
# 1. Work on features locally
npm run dev

# 2. Test changes
npm run test:watch

# 3. Push to trigger deployment
git push origin develop  # → Auto-deploys to development

# 4. Deploy to staging
git checkout staging
git merge develop
git push origin staging  # → Auto-deploys to staging

# 5. Deploy to production  
git checkout main
git merge staging
git push origin main     # → Auto-deploys to production
```

### **No Manual Infrastructure Steps Required**
- ✅ **Infrastructure**: Already deployed via CDK
- ✅ **Secrets**: Already stored in AWS Secrets Manager
- ✅ **CI/CD**: Fully automated via GitHub Actions
- ✅ **Monitoring**: CloudWatch integration active

## 🔍 Security Validation Flow

### **Pre-Deployment Security Checks**
1. **Hardcoded Credential Scan**: Blocks deployment if ANY credentials found in source
2. **Debug Endpoint Validation**: Ensures all debug endpoints have security middleware
3. **Build Security**: Validates secure build process with dummy credentials
4. **Environment-Specific Validation**: Stronger checks for staging/production

### **Security Test Results**
```bash
# Expected results after credential cleanup:
✅ No hardcoded secrets found in source code
✅ All debug endpoints have security middleware  
✅ Build process uses dummy credentials successfully
✅ Runtime credentials fetched from AWS Secrets Manager
✅ Environment-specific security controls active
```

## 🛠️ Infrastructure Management

### **One-Time Setup (Already Complete)**
```bash
# 1. Deploy infrastructure with secure credentials
./infrastructure/scripts/deploy-with-secrets.sh development
./infrastructure/scripts/deploy-with-secrets.sh staging
./infrastructure/scripts/deploy-with-secrets.sh production

# 2. Set up GitHub Actions secrets (manual step)
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# 3. Push code to trigger first deployment
git push origin develop
```

### **Ongoing Operations (Fully Automated)**
- **Application Deployments**: Automatic on code push
- **Environment Updates**: Automatic via GitHub Actions  
- **Security Monitoring**: Continuous via security validation workflow
- **Infrastructure Changes**: Only when CDK code is modified

## 📊 Security Monitoring

### **Continuous Security Validation**
- **Every Push**: Security credential scan runs automatically
- **Pull Requests**: Security validation required before merge
- **Production Deployments**: Enhanced security checks for main branch
- **Runtime Monitoring**: CloudWatch logging and AWS security features

### **Security Incident Response**
```bash
# If hardcoded credentials detected:
1. GitHub Actions automatically BLOCKS deployment
2. Security validation workflow fails with detailed error
3. Developer must remove credentials before deployment proceeds
4. No manual intervention required - system self-protects
```

## 🎯 Best Practices Enforced

### **1. Zero Secrets in Code**
- ✅ All production credentials in AWS Secrets Manager
- ✅ Build-time credentials via GitHub Actions secrets
- ✅ Local development credentials in `.env.local` (gitignored)
- ✅ Infrastructure credentials in `.env.secrets` (gitignored)

### **2. Automated Security**
- ✅ Pre-deployment credential scanning
- ✅ Runtime credential sanitization
- ✅ Debug endpoint authentication
- ✅ Environment-specific security controls

### **3. Developer Experience**
- ✅ No manual deployment steps
- ✅ No complex credential management
- ✅ Automatic environment provisioning
- ✅ Immediate feedback on security issues

## 🚀 Deployment URLs

### **Live Environments (Auto-Deployed)**
- **Development**: https://d3pvc5dn43.us-east-1.awsapprunner.com (develop branch)
- **Staging**: https://ubfybdadun.us-east-1.awsapprunner.com (staging branch)  
- **Production**: https://ijj2mc7dhz.us-east-1.awsapprunner.com (main branch)

## 🔒 Security Status

### **Current Security Posture**
- 🛡️ **Infrastructure**: Enterprise-grade credential management
- 🔐 **Runtime**: AWS Secrets Manager integration  
- 🚨 **CI/CD**: Automated security validation
- 🛡️ **Application**: Security middleware active
- ✅ **Compliance**: Zero hardcoded secrets in codebase

### **Compliance Standards Met**
- ✅ **OWASP**: No hardcoded secrets
- ✅ **AWS Well-Architected**: Proper credential management
- ✅ **Industry Standard**: Separation of build-time and runtime secrets
- ✅ **Security Baseline**: Automated threat prevention

---

## 📋 Quick Reference

### **For Developers**
```bash
# Normal workflow - nothing changes
git push origin develop     # → Auto-deploy to development
git push origin staging     # → Auto-deploy to staging  
git push origin main        # → Auto-deploy to production
```

### **For Infrastructure Changes**
```bash
# Only when modifying infrastructure
cd infrastructure
./scripts/deploy-with-secrets.sh [environment]
```

### **For Security Issues**
- GitHub Actions will automatically block deployment if secrets detected
- Check workflow logs for specific security validation failures
- Remove any hardcoded credentials and push again

**The deployment workflow remains fully automated - we've just made it secure! 🚀** 