# AWS App Runner Migration Guide

## Why We're Migrating from Amplify

After extensive troubleshooting with AWS Amplify, we encountered several fundamental limitations:

1. **230MB deployment size limit** - Too restrictive for modern Next.js applications
2. **Complex serverless file structure requirements** - Amplify expects specific trace file locations
3. **Build configuration complexity** - Excessive time spent on deployment configs vs. features
4. **Poor Next.js App Router support** - Amplify wasn't designed for modern full-stack Next.js

## AWS App Runner Benefits

- ✅ **No file size limits** - Deploy your entire Next.js application
- ✅ **Container-based** - More predictable and flexible than serverless
- ✅ **Simple configuration** - Minimal setup, maximum reliability
- ✅ **Automatic scaling** - Handles traffic spikes seamlessly
- ✅ **AWS ecosystem integration** - Works perfectly with RDS, S3, SQS, SNS
- ✅ **Cost-effective** - Pay for actual usage, not Lambda invocations

## Migration Steps

### 1. Create App Runner Service

1. Go to AWS App Runner console
2. Click "Create service"
3. Choose "Source code repository"
4. Connect to GitHub and select `kennyczadzeck/nailit`
5. Branch: `develop`
6. Configuration: Use `apprunner.yaml` in repository

### 2. Environment Variables

Copy these from your Amplify app to App Runner (replace with actual values):

```
DATABASE_URL=postgresql://neondb_owner:***@***
DATABASE_MIGRATION_URL=postgresql://neondb_owner:***@***
NEXTAUTH_URL=https://your-app-runner-url
NEXTAUTH_SECRET=***your-nextauth-secret***
GOOGLE_CLIENT_ID=***your-google-client-id***
GOOGLE_CLIENT_SECRET=***your-google-client-secret***
NAILIT_AWS_REGION=us-east-1
NAILIT_S3_BUCKET=nailit-dev-emails-***
NAILIT_SQS_EMAIL_QUEUE=https://sqs.us-east-1.amazonaws.com/***/nailit-dev-email-queue
NAILIT_SNS_TOPIC=arn:aws:sns:us-east-1:***:nailit-dev-notifications
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=***your-maps-api-key***
NAILIT_ENVIRONMENT=development
NAILIT_IAM_ACCESS_KEY_ID=***your-access-key***
NAILIT_IAM_ACCESS_KEY_SECRET=***your-secret-key***
LOG_LEVEL=debug
DISABLE_CLOUDWATCH_LOGS=true
```

### 3. Custom Domain Setup

1. In App Runner service settings
2. Go to "Custom domains"
3. Add your domain (e.g., `develop.nailit.app`)
4. Update DNS CNAME record to point to App Runner URL

### 4. Database Migration (if needed)

The database stays the same - no migration needed! App Runner will connect to the same Neon database.

### 5. Update OAuth Redirects

Update your Google OAuth settings:
- Replace Amplify URLs with new App Runner URLs
- Update NEXTAUTH_URL environment variable

## File Structure

```
nailit/
├── apprunner.yaml          # App Runner configuration
├── Dockerfile              # Container definition
├── .dockerignore           # Docker build optimization
├── next.config.ts          # Updated with standalone output
└── ... (rest of your app)
```

## Deployment Process

1. **Push to develop branch** → Automatic deployment
2. **No complex build configs** → Just works
3. **No file size limits** → Deploy everything
4. **Automatic scaling** → Handles traffic

## Cost Comparison

- **Amplify**: $0.01 per build minute + $0.023 per GB-month + Lambda costs
- **App Runner**: $0.007 per vCPU-hour + $0.0008 per GB-hour (only when running)

For typical usage, App Runner is often more cost-effective and predictable.

## Rollback Plan

If anything goes wrong:
1. Keep Amplify app running during migration
2. Test App Runner thoroughly before DNS switch
3. Can revert DNS in minutes if needed

## Next Steps

1. ✅ Configuration files created
2. ⏳ Create App Runner service
3. ⏳ Configure environment variables
4. ⏳ Test deployment
5. ⏳ Update DNS
6. ⏳ Decommission Amplify

## Support

App Runner has excellent documentation and is much more straightforward than Amplify's serverless complexity. No more fighting deployment configs! 