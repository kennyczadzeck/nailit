# Email Test Account Setup Guide

## Quick Start

Since you have Gmail test accounts set up, here's how to test email ingestion:

### Option 1: Database Loading (Recommended First) ⚡
```bash
# Load realistic emails directly into DB using your test accounts
npm run test:email:db your-nailit.test.homeowner@gmail.com your-nailit.test.contractor@gmail.com
```

**Benefits:**
- ✅ Immediate results (3 seconds vs 3 minutes)
- ✅ Predictable test data
- ✅ No external dependencies
- ✅ Uses your actual email addresses

### Option 2: Real Email Testing (Integration Validation) 📧
```bash
# Set up for real Gmail webhook testing
npm run test:email:real your-nailit.test.homeowner@gmail.com your-nailit.test.contractor@gmail.com

# Then manually send emails between your test accounts
# Webhooks will process them automatically
```

**Benefits:**
- ✅ End-to-end validation
- ✅ Tests actual Gmail webhooks
- ✅ Real-world scenarios

## Recommended Workflow

1. **Start with Database Loading** for daily development:
   ```bash
   npm run test:email:db nailit.test.homeowner@gmail.com nailit.test.contractor@gmail.com
   npm run dev  # Check timeline/dashboard
   ```

2. **Add Real Email Testing** for weekly validation:
   ```bash
   npm run test:email:real nailit.test.homeowner@gmail.com nailit.test.contractor@gmail.com
   # Send test emails manually between accounts
   ```

3. **Cleanup** when done:
   ```bash
   npm run test:email:cleanup
   ```

## What Gets Loaded (Database Approach)

The system loads realistic construction emails:
- Kitchen renovation quotes ($45,000)
- Permit notifications with deadlines
- Contractor progress updates
- Inspection scheduling (urgent)
- Material delivery confirmations

All emails use your actual test account addresses and include AI analysis results.

## Real Email Testing Example

Send this between your test accounts:
```
From: nailit.test.contractor@gmail.com
To: nailit.test.homeowner@gmail.com
Subject: Kitchen renovation quote - final version

Hi Sarah,

Attached is the final quote for your kitchen renovation project.

Project Details:
- Total cost: $45,000 (includes materials and labor)
- Timeline: 6-8 weeks starting December 1st

Best regards,
Mike Johnson - General Contractor Pro
```

## Troubleshooting

- **No emails loaded**: Check database connection with `npm run test:email:setup`
- **Real emails not processing**: Verify Gmail OAuth tokens are valid
- **Classification errors**: Check AI service API keys

## Available Commands

```bash
npm run test:email:setup     # Verify setup
npm run test:email:db        # Load historical emails  
npm run test:email:real      # Set up real email testing
npm run test:email:both      # Both approaches
npm run test:email:cleanup   # Remove test data
```

---

**💡 Pro Tip**: Use database loading for speed during development, real emails for confidence before deployment.