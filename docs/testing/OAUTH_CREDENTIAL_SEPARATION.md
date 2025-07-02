# OAuth Credential Separation Guide

## 🚨 **Critical: Two Completely Separate OAuth Systems**

The NailIt application uses **two distinct OAuth configurations** that serve different purposes and must never be mixed:

---

## 📊 **Credential Comparison Matrix**

| Aspect | Email Testing Utility | Production NailIt Application |
|--------|----------------------|-------------------------------|
| **Purpose** | Send automated test emails from contractor account | Authenticate homeowners in deployed app |
| **When Used** | Development & CI/CD testing only | Production runtime for real users |
| **OAuth Client Type** | Desktop Application | Web Application |
| **Google Client ID** | `442433418686-00ap6fao9for4c962k45ntrjlosu8vq0` | Different Client ID (managed by infrastructure) |
| **Scopes** | `gmail.send` only | `openid`, `email`, `profile`, `gmail.readonly`, `gmail.modify` |
| **Callback URL** | `http://localhost` | Environment-specific App Runner URLs |
| **Storage Location** | Local `.env.local` + GitHub Secrets | AWS Secrets Manager |
| **Access Control** | Developers & CI/CD only | Production runtime only |
| **Rotation Schedule** | Manual (quarterly) | Automated via infrastructure |
| **Environment** | Development/Testing | Production/Staging/Development |

---

## 🎯 **Email Testing Utility Credentials**

### **Purpose & Scope**
- **What**: OAuth credentials for automated email sending during testing
- **Who**: Developers and CI/CD pipelines only
- **When**: Development and automated testing phases
- **Where**: Local development environments and GitHub Actions

### **Technical Configuration**
```bash
# Google Cloud Console Configuration
OAuth Client Type: Desktop Application
Client ID: 442433418686-00ap6fao9for4c962k45ntrjlosu8vq0
Scopes: https://www.googleapis.com/auth/gmail.send
Callback URL: http://localhost
Test Account: nailit.test.contractor@gmail.com
```

### **Storage & Access**
```bash
# Local Development (.env.local)
GMAIL_CONTRACTOR_CLIENT_ID="442433418686-00ap6fao9for4c962k45ntrjlosu8vq0"
GMAIL_CONTRACTOR_CLIENT_SECRET="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"
GMAIL_CONTRACTOR_REFRESH_TOKEN="generated_during_oauth_flow"
GMAIL_CONTRACTOR_EMAIL="nailit.test.contractor@gmail.com"

# GitHub Secrets (CI/CD)
GMAIL_CONTRACTOR_CLIENT_ID
GMAIL_CONTRACTOR_CLIENT_SECRET  
GMAIL_CONTRACTOR_REFRESH_TOKEN
GMAIL_CONTRACTOR_EMAIL
```

### **Usage Examples**
```typescript
// scripts/gmail-oauth-setup.ts - OAuth flow setup
// tests/integration/gmail-sender.ts - Email sending utility
// npm run test:gmail:setup - Generate auth URL
// npm run test:gmail:token - Exchange auth code for tokens
```

---

## 🏭 **Production Application Credentials**

### **Purpose & Scope**
- **What**: OAuth credentials for user authentication in deployed app
- **Who**: Real homeowners using the production application
- **When**: Production runtime for user login and email access
- **Where**: AWS App Runner environments (dev/staging/production)

### **Technical Configuration**
```bash
# Google Cloud Console Configuration
OAuth Client Type: Web Application
Client ID: Different from testing utility
Scopes: openid, email, profile, gmail.readonly, gmail.modify
Callback URLs:
  - https://d3pvc5dn43.us-east-1.awsapprunner.com/api/auth/callback/google (dev)
  - https://ubfybdadun.us-east-1.awsapprunner.com/api/auth/callback/google (staging)
  - https://ijj2mc7dhz.us-east-1.awsapprunner.com/api/auth/callback/google (production)
```

### **Storage & Access**
```bash
# AWS Secrets Manager (managed by CDK infrastructure)
Secret Names:
  - nailit-secrets-dev
  - nailit-secrets-staging  
  - nailit-secrets-prod

Contents (per environment):
GOOGLE_CLIENT_ID: "different-client-id-for-production"
GOOGLE_CLIENT_SECRET: "different-secret-for-production"
DATABASE_URL: "environment-specific-database-connection"
NEXTAUTH_SECRET: "environment-specific-nextauth-secret"
```

### **Usage Examples**
```typescript
// app/api/auth/[...nextauth]/route.ts - NextAuth.js configuration
// app/api/email/oauth/gmail/route.ts - Gmail OAuth flow
// infrastructure/secrets-stack.ts - CDK secret management
```

---

## 🚫 **What NOT to Do**

### **❌ Never Mix Credentials**
```bash
# WRONG: Using testing credentials in production
GOOGLE_CLIENT_ID="442433418686-00ap6fao9for4c962k45ntrjlosu8vq0"  # Testing utility ID

# WRONG: Using production credentials for testing  
GMAIL_CONTRACTOR_CLIENT_ID="production-google-client-id"  # Production app ID
```

### **❌ Never Store Production Credentials Locally**
```bash
# WRONG: Production credentials in .env.local
GOOGLE_CLIENT_ID="production-google-client-id"
GOOGLE_CLIENT_SECRET="production-google-secret"
DATABASE_URL="production-database-url"
```

### **❌ Never Commit Any Credentials**
```bash
# WRONG: Any credentials in source code
const CLIENT_ID = "442433418686-00ap6fao9for4c962k45ntrjlosu8vq0";
const CLIENT_SECRET = "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";
```

### **❌ Never Use Wrong OAuth Client Type**
```bash
# WRONG: Using web app client for testing utility
OAuth Client Type: Web Application  # Should be Desktop for testing

# WRONG: Using desktop client for production app  
OAuth Client Type: Desktop Application  # Should be Web for production
```

---

## ✅ **Best Practices**

### **🔒 Security Separation**
1. **Different Google Cloud Projects**: Consider separate projects for testing vs production
2. **Minimal Scopes**: Testing utility uses only `gmail.send`, production uses full auth scopes
3. **Environment Isolation**: Testing credentials never touch production environments
4. **Access Control**: Developers access testing creds, infrastructure manages production creds

### **📁 File Organization**
```
nailit/
├── .env.local                     # ✅ Testing utility credentials only
├── docs/testing/
│   ├── GMAIL_CREDENTIALS_MANAGEMENT.md  # ✅ Testing utility guide
│   └── OAUTH_CREDENTIAL_SEPARATION.md   # ✅ This document
├── scripts/
│   ├── gmail-oauth-setup.ts       # ✅ Testing utility OAuth setup
│   └── gmail-token-exchange.ts    # ✅ Testing utility token exchange
├── infrastructure/
│   ├── secrets-stack.ts           # ✅ Production credential management
│   └── app-runner-stack.ts        # ✅ Production deployment
└── app/api/auth/
    └── [...nextauth]/route.ts     # ✅ Production authentication
```

### **🔄 Credential Rotation**
```bash
# Testing Utility Credentials (Manual)
- Rotate quarterly or when team members leave
- Update local .env.local files
- Update GitHub Secrets
- Update team password manager

# Production Application Credentials (Automated)  
- Managed via CDK infrastructure updates
- Automatic deployment via AWS Secrets Manager
- Environment-specific rotation schedules
- No manual developer intervention required
```

---

## 🆘 **Emergency Procedures**

### **If Testing Utility Credentials Are Compromised**
1. **Immediate**: Revoke OAuth client in Google Cloud Console
2. **1 Hour**: Generate new OAuth client for testing utility only
3. **4 Hours**: Update team environments with new testing credentials
4. **24 Hours**: Audit access logs and notify team
5. **Important**: Production application is NOT affected

### **If Production Application Credentials Are Compromised**
1. **Immediate**: Contact infrastructure team/DevOps
2. **Follow production incident response procedures**
3. **Update AWS Secrets Manager via infrastructure team**
4. **Deploy updated secrets via CDK**
5. **Important**: Testing utility is NOT affected

---

## 📞 **Contact Information**

| Issue Type | Contact |
|------------|---------|
| Testing utility credential access | Team lead or DevOps |
| Production application credentials | Infrastructure team |
| Google Cloud project access | Project administrator |
| Security concerns | Security team immediately |
| OAuth configuration questions | Development team lead |

---

## 📚 **Related Documentation**

- [`docs/testing/GMAIL_CREDENTIALS_MANAGEMENT.md`](./GMAIL_CREDENTIALS_MANAGEMENT.md) - Detailed testing utility credential management
- [`docs/testing/EMAIL_TESTING_STRATEGY.md`](./EMAIL_TESTING_STRATEGY.md) - Overall email testing approach
- [`docs/deployment/ENVIRONMENT_VARIABLES.md`](../deployment/ENVIRONMENT_VARIABLES.md) - Production environment configuration
- [`infrastructure/secrets-stack.ts`](../../infrastructure/lib/secrets-stack.ts) - Production credential infrastructure

---

## ⚠️ **Remember: Testing ≠ Production**

**Two separate systems, two separate purposes, two separate storage locations.**

Never mix testing utility credentials with production application credentials. They serve completely different purposes and must remain isolated for security and functionality. 