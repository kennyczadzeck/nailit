# NailIt Multi-Environment Setup Guide

## 🎯 **Environment Strategy Overview**

NailIt uses a three-environment approach with branch-based deployments:

```
Development → Staging → Production
     ↓           ↓          ↓
   develop    staging      main
     ↓           ↓          ↓
   Neon Dev   Neon Stage  Neon Prod
```

## 🗄️ **Database Environment Mapping**

### **Neon PostgreSQL Branches**
- **Production**: `br-yellow-mouse-a5c2gnvp` (Main/Default branch)
- **Staging**: `br-lively-brook-a5wck55u` 
- **Development**: `br-late-wildflower-a5s97ll8`

### **Connection Strings by Environment**

#### **Production Database**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### **Staging Database**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### **Development Database**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## 🚀 **AWS Amplify Setup Instructions**

### **Step 1: Configure Amplify Environments**

1. **Go to AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. **Find your existing app**: `nailit` or similar
3. **Add new environments** for staging and development

### **Step 2: Connect Git Branches to Amplify Environments**

#### **Production Environment**
- **Branch**: `main`
- **Build Settings**: Use `amplify.yml`
- **Environment Name**: `production` or `main`

#### **Staging Environment**
- **Branch**: `staging`
- **Build Settings**: Use `amplify-staging.yml`
- **Environment Name**: `staging`

#### **Development Environment**  
- **Branch**: `develop`
- **Build Settings**: Use `amplify-develop.yml`
- **Environment Name**: `development` or `develop`

### **Step 3: Configure Environment Variables**

For each Amplify environment, add these variables:

#### **All Environments (Common Variables)**
```bash
NEXTAUTH_SECRET=[generate-unique-secret-per-environment]
GOOGLE_CLIENT_ID=[your-google-oauth-client-id]
GOOGLE_CLIENT_SECRET=[your-google-oauth-client-secret]
```

#### **Production Environment Variables**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://main.d1rq0k9js5lwg3.amplifyapp.com
```

#### **Staging Environment Variables**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://staging.[your-app-id].amplifyapp.com
```

#### **Development Environment Variables**
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://develop.[your-app-id].amplifyapp.com
```

## 🔄 **Development Workflow**

### **Feature Development Process**

1. **Start from develop branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/email-monitoring
   ```

2. **Develop and test locally**
   ```bash
   npm run dev
   # Use development database automatically
   ```

3. **Push to feature branch and create PR to develop**
   ```bash
   git push origin feature/email-monitoring
   # Create PR: feature/email-monitoring → develop
   ```

4. **Test in development environment**
   - Merge PR to `develop`
   - Amplify automatically deploys to development environment
   - Uses development Neon database branch
   - Uses `npx prisma db push` for rapid iteration

5. **Promote to staging for validation**
   ```bash
   git checkout staging
   git merge develop
   git push origin staging
   ```
   - Amplify automatically deploys to staging environment
   - Uses staging Neon database branch  
   - Uses `npx prisma migrate deploy` for formal migrations

6. **Deploy to production**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```
   - Amplify automatically deploys to production environment
   - Uses production Neon database branch
   - Uses `npx prisma migrate deploy` for formal migrations

### **Database Schema Changes**

#### **Development Environment**
- **Schema Changes**: Use `npx prisma db push` (rapid iteration)
- **Data**: Can be reset/lost during development
- **Purpose**: Fast prototyping and testing

#### **Staging Environment**  
- **Schema Changes**: Use `npx prisma migrate dev` locally, then `npx prisma migrate deploy`
- **Data**: Production-like data for testing
- **Purpose**: Final validation before production

#### **Production Environment**
- **Schema Changes**: Only through formal migrations
- **Data**: Production data (never lost)
- **Purpose**: Live application

## 🛠️ **Local Development Setup**

### **Environment Configuration**

Create `.env.local` for local development:
```bash
# Local development uses development database
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-local-development-secret

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

### **Database Operations**

```bash
# Create new migration (development)
npx prisma migrate dev --name add-email-tables

# Push schema changes without migration (development)
npx prisma db push

# Deploy existing migrations (staging/production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# View database in browser
npx prisma studio
```

## 🔍 **Environment Verification**

### **Check Current Environment**
Add this to your app to verify environment configuration:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    environment: process.env.NODE_ENV,
    database: process.env.DATABASE_URL?.includes('misty-frog') ? 'production' :
              process.env.DATABASE_URL?.includes('raspy-sound') ? 'staging' : 
              process.env.DATABASE_URL?.includes('still-paper') ? 'development' : 'unknown',
    nextauth_url: process.env.NEXTAUTH_URL,
    timestamp: new Date().toISOString()
  });
}
```

### **Test Each Environment**
- **Development**: https://develop.[app-id].amplifyapp.com/api/health
- **Staging**: https://staging.[app-id].amplifyapp.com/api/health  
- **Production**: https://main.d1rq0k9js5lwg3.amplifyapp.com/api/health

## 📋 **Deployment Checklist**

### **Before Each Deployment**

#### **Development → Staging**
- [ ] All features tested locally
- [ ] Database migrations created if needed
- [ ] No console errors in browser
- [ ] API endpoints working
- [ ] Authentication working

#### **Staging → Production**
- [ ] Full end-to-end testing in staging
- [ ] Performance testing completed
- [ ] Database migrations tested in staging
- [ ] Security review completed
- [ ] Backup plan in place

### **After Each Deployment**

- [ ] Health check endpoint responds correctly
- [ ] Database connection working
- [ ] Authentication working
- [ ] Core features functional
- [ ] Monitor for errors in first 10 minutes

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Build Failures**
```bash
# Check environment variables in Amplify Console
# Verify build specification file is correct
# Check for TypeScript/linting errors
```

#### **Database Connection Issues**
```bash
# Verify DATABASE_URL is correct for environment
# Check Neon branch is active and running
# Verify IP allowlist settings in Neon
```

#### **Authentication Issues**
```bash
# Verify NEXTAUTH_URL matches actual URL
# Check NEXTAUTH_SECRET is set
# Verify Google OAuth redirect URLs
```

## 🔄 **Future Email Monitoring Variables**

When implementing email monitoring, add these variables to each environment:

```bash
# Email Integration
GMAIL_CLIENT_ID=your-gmail-oauth-client-id
GMAIL_CLIENT_SECRET=your-gmail-oauth-client-secret
OUTLOOK_CLIENT_ID=your-microsoft-azure-app-id
OUTLOOK_CLIENT_SECRET=your-microsoft-azure-client-secret

# AI Processing
OPENAI_API_KEY=sk-your-openai-api-key

# Storage (S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=nailit-email-storage-{environment}
AWS_S3_REGION=us-east-1

# SMS Integration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## ✅ **Benefits of This Setup**

- **🔒 Safe Deployment**: Never deploy untested code to production
- **🚀 Fast Iteration**: Development environment allows rapid prototyping
- **📊 Real Testing**: Staging environment provides production-like validation
- **📈 Scalable**: Can add more environments as team grows
- **🗄️ Data Safety**: Each environment has its own database branch
- **🔄 Automated**: Git-based deployments with no manual steps 