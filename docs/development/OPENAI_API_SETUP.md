# OpenAI API Key Setup Guide

## 🚨 SECURITY FIRST

**NEVER** share your OpenAI API key in:
- Chat logs or messages
- Code commits
- Public repositories
- Unencrypted files

## 🔑 Getting Your OpenAI API Key

1. **Revoke the exposed key** (if you shared one):
   - Go to https://platform.openai.com/api-keys
   - Delete any exposed keys immediately

2. **Generate a new key**:
   - Click "Create new secret key"
   - Name it: `nailit-{environment}` (e.g., `nailit-development`)
   - Copy the key immediately (you won't see it again)

## 🏠 Local Development Setup

### 1. Add to Local Environment File

```bash
# Edit .env.local (already in .gitignore)
echo "OPENAI_API_KEY=sk-proj-your-actual-key-here" >> .env.local
```

### 2. Verify Local Setup

```bash
# Check that the key is set (without showing the value)
grep -q "OPENAI_API_KEY" .env.local && echo "✅ OpenAI API key is set" || echo "❌ OpenAI API key not found"
```

### 3. Test Local Integration

```bash
# Test the API key works
npm run dev
# Visit http://localhost:3000/api/debug-env to verify (development only)
```

## ☁️ AWS Production Setup

### 1. Multi-Environment Key Strategy (To Be Determined)

**Current Status**: We need to investigate the best approach for managing OpenAI API keys across environments.

**Options to Consider**:

**Option A: Single Key for All Environments**
```bash
# Use the same key for all environments initially
NAILIT_OPENAI_API_KEY_DEVELOPMENT="sk-proj-your-single-key"
NAILIT_OPENAI_API_KEY_STAGING="sk-proj-your-single-key"  
NAILIT_OPENAI_API_KEY_PRODUCTION="sk-proj-your-single-key"
```
- ✅ **Pros**: Simple setup, one key to manage
- ❌ **Cons**: Can't track usage by environment, security risk

**Option B: Separate Keys per Environment**
```bash
# Different keys for each environment - best for security and tracking
NAILIT_OPENAI_API_KEY_DEVELOPMENT="sk-proj-dev-specific-key"
NAILIT_OPENAI_API_KEY_STAGING="sk-proj-staging-specific-key"  
NAILIT_OPENAI_API_KEY_PRODUCTION="sk-proj-prod-specific-key"
```
- ✅ **Pros**: 🔒 **Security isolation**: Compromised dev key doesn't affect production
- 📊 **Usage tracking**: Can identify which environment is using what (if OpenAI provides per-key metrics)
- 🔄 **Key rotation**: Can rotate keys independently per environment
- 🚫 **Access control**: Can revoke specific environment access without affecting others

**Option C: Development vs Production Split**
```bash
# One key for dev/staging, separate for production
NAILIT_OPENAI_API_KEY_DEVELOPMENT="sk-proj-dev-key"
NAILIT_OPENAI_API_KEY_STAGING="sk-proj-dev-key"  
NAILIT_OPENAI_API_KEY_PRODUCTION="sk-proj-prod-key"
```
- ✅ **Pros**: Balance of simplicity and security
- ✅ **Pros**: Protects production usage tracking

### 2. Investigation Tasks

Before setting up AWS secrets, we need to research:

1. **OpenAI API Key Management**:
   - Can we create multiple API keys in one OpenAI account?
   - How do we name/organize keys for different environments?
   - Are there usage limits per key vs. per account?

2. **Cost and Usage Tracking**:
   - How does OpenAI track usage - by key or by account?
   - Can we set different spending limits per key?
   - How granular is the usage reporting?

3. **Security Considerations**:
   - What happens if a development key is compromised?
   - Can we restrict key permissions (e.g., models, rate limits)?
   - How often should we rotate keys?

### 3. Recommended Next Steps

**For MVP Development** (immediate):
```bash
# Start with single key for local development
NAILIT_OPENAI_API_KEY_DEVELOPMENT="sk-proj-your-new-key"
# Leave staging/production empty until we decide on strategy
NAILIT_OPENAI_API_KEY_STAGING=""  
NAILIT_OPENAI_API_KEY_PRODUCTION=""
```

**For Production Readiness** (before going live):
1. Research OpenAI key management options
2. Decide on multi-environment strategy
3. Set up appropriate keys based on findings
4. Update AWS secrets accordingly

### 4. AWS Deployment (When Ready)

Once you've decided on the key strategy and have the appropriate keys:

```bash
# Update infrastructure/.env.secrets with your chosen approach
cd infrastructure

# Deploy secrets for development (immediate)
./scripts/deploy-with-secrets.sh development secrets

# Deploy for other environments when ready
./scripts/deploy-with-secrets.sh staging secrets
./scripts/deploy-with-secrets.sh production secrets

# Update App Runner services to use new secrets
./scripts/deploy-with-secrets.sh development app-runner
./scripts/deploy-with-secrets.sh staging app-runner  
./scripts/deploy-with-secrets.sh production app-runner
```

**Note**: For now, you can start with just the development environment and expand to staging/production once you've figured out the key management strategy.

## 🔍 Verification

### Local Development
```bash
# Check environment variable is loaded
node -e "console.log(process.env.OPENAI_API_KEY ? '✅ Key loaded' : '❌ Key missing')"
```

### AWS Production
```bash
# Check AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id nailit-openai-api-key-development \
  --query SecretString \
  --output text
```

## 💰 Cost Management

### 1. Account-Level Billing

**Key Insight**: OpenAI billing and credit allocation is **per account**, not per API key.

This means:
- ✅ **Single spending limit** applies to all API keys in the account
- ✅ **Credits are shared** across all environments/keys
- ✅ **Usage tracking** is aggregated at the account level
- ✅ **Simpler cost management** - no need for per-key budgets

### 2. Recommended Multi-Environment Strategy

Given account-level billing, the best approach is:

**Option B: Separate Keys per Environment** ✅ **RECOMMENDED**
```bash
# Different keys for each environment - best for security and tracking
NAILIT_OPENAI_API_KEY_DEVELOPMENT="sk-proj-dev-specific-key"
NAILIT_OPENAI_API_KEY_STAGING="sk-proj-staging-specific-key"  
NAILIT_OPENAI_API_KEY_PRODUCTION="sk-proj-prod-specific-key"
```

**Benefits**:
- 🔒 **Security isolation**: Compromised dev key doesn't affect production
- 📊 **Usage tracking**: Can identify which environment is using what (if OpenAI provides per-key metrics)
- 🔄 **Key rotation**: Can rotate keys independently per environment
- 🚫 **Access control**: Can revoke specific environment access without affecting others

### 3. Account-Level Settings

In OpenAI dashboard:
- Set **account-wide spending limit** ($50-100 for MVP testing)
- Enable **usage alerts** for the entire account
- Monitor **total usage** across all environments

### 4. Usage Monitoring Strategy

Since costs are account-level, track usage by:

**Application-Level Logging**:
```typescript
// Track usage in your application
const usage = {
  environment: process.env.NODE_ENV,
  apiKey: process.env.OPENAI_API_KEY.slice(-8), // Last 8 chars for identification
  tokensUsed: response.usage.total_tokens,
  cost: estimatedCost,
  timestamp: new Date()
};
```

**OpenAI Usage API**:
```bash
# Check account-wide usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 5. Cost Optimization

With account-level billing:
- **Start with generous limit** ($100/month) to avoid interruptions
- **Monitor usage patterns** across all environments
- **Optimize based on actual usage** rather than pre-allocating per environment
- **Scale limits up** as you move to production volumes

## 🛡️ Security Best Practices

### 1. API Key Rotation

- Rotate keys every 90 days
- Use different keys for each environment
- Immediately revoke compromised keys

### 2. Access Control

- Limit API key permissions in OpenAI dashboard
- Monitor usage for unusual patterns
- Set up billing alerts

### 3. Environment Isolation

```bash
# Development
OPENAI_API_KEY_DEV=sk-proj-dev-key...

# Staging  
OPENAI_API_KEY_STAGING=sk-proj-staging-key...

# Production
OPENAI_API_KEY_PROD=sk-proj-prod-key...
```

## 🔧 Troubleshooting

### Common Issues

**Key not working locally:**
```bash
# Check .env.local exists and has the key
cat .env.local | grep OPENAI_API_KEY
```

**Key not working in AWS:**
```bash
# Check secret exists in AWS
aws secretsmanager describe-secret --secret-id nailit-openai-api-key-development
```

**Permission denied errors:**
```bash
# Verify IAM permissions for App Runner
aws iam get-role-policy --role-name AppRunnerInstanceRole --policy-name SecretsManagerAccess
```

### Getting Help

1. Check AWS CloudWatch logs for App Runner service
2. Verify environment variables in App Runner console
3. Test API key directly in OpenAI playground
4. Review IAM permissions for secrets access

## 📚 Next Steps

Once your OpenAI API key is securely configured:

1. ✅ Test basic API connectivity
2. ✅ Implement email analysis functionality  
3. ✅ Set up usage monitoring
4. ✅ Configure cost alerts
5. ✅ Plan key rotation schedule

---

**Security Reminder**: Never commit API keys to Git. Always use environment variables and AWS Secrets Manager for production.

## ✅ SETUP COMPLETE

**Status**: OpenAI API key has been successfully configured for development environment.

### 🔑 What's Been Set Up:

**Local Development** ✅
- OpenAI API key added to `.env.local`
- Key is properly gitignored and secure
- Ready for local development and testing

**AWS Secrets Manager** ✅
- OpenAI API key deployed to AWS Secrets Manager
- Secret ARN: `arn:aws:secretsmanager:us-east-1:207091906248:secret:nailit-openai-api-key-development-48q8xM`
- Integrated with App Runner infrastructure
- Ready for cloud deployment

### 🧪 Testing Your Setup

**Test Local Environment:**
```bash
# In your project root
node -e "console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Set ✅' : 'Not Set ❌')"
```

**Test AWS Integration:**
```bash
# Deploy App Runner with OpenAI integration
cd infrastructure
./scripts/deploy-with-secrets.sh development app-runner
``` 