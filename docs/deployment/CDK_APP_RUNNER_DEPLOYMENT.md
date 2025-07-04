# CDK App Runner Deployment Guide

This guide walks you through deploying NailIt to AWS App Runner using AWS CDK for infrastructure as code.

## Overview

We've migrated from AWS Amplify to App Runner due to deployment size limitations and better Next.js support. The infrastructure is managed via CDK, providing:

- ✅ **Infrastructure as Code** - All resources defined in CDK
- ✅ **Environment Management** - Separate dev, staging, and production
- ✅ **Auto Scaling** - Configurable scaling policies per environment
- ✅ **IAM Integration** - Proper permissions for AWS services
- ✅ **Health Monitoring** - Built-in health checks and logging
- ✅ **Cost Optimization** - Environment-specific resource sizing

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   GitHub Repo   │────▶│   App Runner    │────▶│   AWS Services  │
│   (develop)     │     │   Service       │     │   (S3, SQS,     │
│                 │     │                 │     │    SNS, Logs)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │  Auto Scaling   │
                        │  Configuration  │
                        └─────────────────┘
```

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **CDK CLI installed**: `npm install -g aws-cdk`
3. **Node.js 18+** for the CDK application
4. **GitHub repository connection** (will be configured during deployment)

## Environment Configuration

The infrastructure supports three environments:

- **Development**: `develop` branch, minimal resources
- **Staging**: `staging` branch, production-like testing
- **Production**: `main` branch, full production resources

## Deployment Steps

### 1. Prepare Infrastructure

```bash
cd infrastructure
npm install
npm run build
```

### 2. Deploy Infrastructure Stacks

Deploy all stacks for development environment:

```bash
# Deploy all stacks at once
cdk deploy --all --context environment=development

# Or deploy individually
cdk deploy NailIt-dev --context environment=development
cdk deploy LoggingStack-dev --context environment=development  
cdk deploy AppRunner-dev --context environment=development
```

### 3. Configure GitHub Connection

After the App Runner stack deploys, you'll need to connect to GitHub:

1. Go to AWS App Runner console
2. Find your service: `nailit-dev`
3. Go to **Source** configuration
4. Set up GitHub connection if not already configured
5. Verify the repository: `kennyczadzeck/nailit`
6. Verify the branch: `develop`

### 4. Set Environment Variables

Set the required environment variables in App Runner console:

```env
# Database Configuration
DATABASE_URL=postgresql://neondb_owner:***@***
DATABASE_MIGRATION_URL=postgresql://neondb_owner:***@***

# Authentication
NEXTAUTH_URL=https://[your-app-runner-url]
NEXTAUTH_SECRET=***your-nextauth-secret***
GOOGLE_CLIENT_ID=***your-google-client-id***
GOOGLE_CLIENT_SECRET=***your-google-client-secret***

# AWS Services (automatically configured by CDK)
NAILIT_AWS_REGION=us-east-1
NAILIT_S3_BUCKET=nailit-dev-emails-[account-id]
NAILIT_SQS_EMAIL_QUEUE=https://sqs.us-east-1.amazonaws.com/[account-id]/nailit-dev-email-queue
NAILIT_SNS_TOPIC=arn:aws:sns:us-east-1:[account-id]:nailit-dev-notifications

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=***your-maps-api-key***

# Environment Settings
NAILIT_ENVIRONMENT=development
LOG_LEVEL=debug
DISABLE_CLOUDWATCH_LOGS=true
```

## Infrastructure Components

### App Runner Service

**File**: `infrastructure/lib/app-runner-stack.ts`

- **Service Name**: `nailit-{environment}`
- **Source**: GitHub repository with auto-deployment
- **Configuration**: Uses `apprunner.yaml` from repository
- **Health Check**: `/api/health` endpoint
- **Scaling**: Environment-specific auto-scaling configuration

### Auto Scaling Configuration

Environment-specific scaling policies:

| Environment | Min Size | Max Size | Max Concurrency | CPU/Memory |
|-------------|----------|----------|-----------------|------------|
| Development | 1        | 3        | 25              | 0.25 vCPU, 0.5 GB |
| Staging     | 1        | 3        | 25              | 0.25 vCPU, 0.5 GB |
| Production  | 2        | 10       | 100             | 1 vCPU, 2 GB |

### IAM Permissions

The App Runner instance role includes permissions for:

- **S3**: Read/write access to email storage bucket
- **SQS**: Send/receive messages for all application queues
- **SNS**: Publish notifications to topics
- **CloudWatch Logs**: Application logging

### Resource Outputs

After deployment, the stack outputs:

- `AppRunnerServiceUrl`: The service URL
- `AppRunnerServiceArn`: Service ARN for reference
- `AppRunnerServiceId`: Service ID

## Environment Management

### Development Environment

```bash
# Deploy development
cdk deploy --all --context environment=development

# Check outputs
cdk list --context environment=development
```

### Staging Environment

```bash
# Deploy staging (ensure staging branch exists)
cdk deploy --all --context environment=staging
```

### Production Environment

```bash
# Deploy production (ensure main branch exists)
cdk deploy --all --context environment=production
```

## Monitoring and Logging

### Health Checks

App Runner automatically monitors the `/api/health` endpoint:
- **Protocol**: HTTP
- **Path**: `/api/health`
- **Interval**: 10 seconds
- **Timeout**: 5 seconds
- **Healthy threshold**: 1
- **Unhealthy threshold**: 5

### CloudWatch Logs

Application logs are automatically sent to CloudWatch:
- **Log Group**: `/aws/apprunner/nailit-{environment}/service`
- **Log Stream**: Per instance
- **Retention**: As configured in logging stack

### Application Metrics

App Runner provides built-in metrics:
- Request count and latency
- Instance CPU and memory usage
- Auto scaling events
- Health check status

## Cost Optimization

### Development Environment
- **Minimum cost**: ~$5-15/month
- **Scaling**: Starts at 1 instance, scales to 3
- **Resources**: 0.25 vCPU, 0.5 GB memory

### Production Environment  
- **Base cost**: ~$30-50/month
- **Scaling**: Starts at 2 instances, scales to 10
- **Resources**: 1 vCPU, 2 GB memory
- **High availability**: Spread across multiple AZs

## Deployment Automation

### Automatic Deployments

App Runner automatically deploys when:
- Code is pushed to the configured branch
- `apprunner.yaml` configuration changes
- Environment variables are updated

### Manual Deployment Trigger

Force a deployment from the console or CLI:

```bash
aws apprunner start-deployment --service-arn [service-arn]
```

## Rollback Strategy

### Infrastructure Rollback

```bash
# Rollback to previous CDK deployment
cdk diff --context environment=development
cdk deploy --rollback --context environment=development
```

### Application Rollback

1. **Quick rollback**: Revert the Git commit and push
2. **Point-in-time**: Deploy a specific commit SHA
3. **Configuration rollback**: Use previous auto-scaling configuration

## Troubleshooting

### Common Issues

1. **Build failures**: Check `apprunner.yaml` configuration
2. **Health check failures**: Verify `/api/health` endpoint
3. **Environment variables**: Ensure all required vars are set
4. **IAM permissions**: Check instance role permissions

### Debugging Commands

```bash
# Check CDK diff
cdk diff --context environment=development

# Synthesize CloudFormation
cdk synth --context environment=development

# Describe App Runner service
aws apprunner describe-service --service-arn [service-arn]

# View logs
aws logs tail /aws/apprunner/nailit-dev/service --follow
```

### Log Analysis

Check App Runner logs for:
- Application startup errors
- Database connection issues
- Authentication problems
- API endpoint failures

## Security Considerations

### Network Security
- **VPC**: App Runner service can optionally use VPC connector
- **HTTPS**: All traffic encrypted in transit
- **IAM**: Principle of least privilege for service roles

### Application Security
- **Environment variables**: Sensitive data encrypted at rest
- **Health checks**: No sensitive information exposed
- **Logging**: Avoid logging sensitive data

## Migration Notes

### From Amplify

Key differences when migrating from Amplify:
1. **File size**: No 230MB limit with App Runner
2. **Build process**: Simpler container-based builds
3. **Environment variables**: Set in App Runner console
4. **Custom domains**: Configured in App Runner service
5. **Auto-scaling**: More flexible scaling policies

### Database Migration

No database migration required:
- Same Neon database connections
- Same environment variables
- Same Prisma configuration

## Next Steps

After successful deployment:

1. **Configure custom domain** in App Runner console
2. **Update DNS records** to point to App Runner URL
3. **Update OAuth redirects** in Google Console
4. **Set up monitoring alerts** in CloudWatch
5. **Configure backup strategies** for application data
6. **Test staging deployment** process
7. **Plan production rollout** strategy

## Support

For infrastructure issues:
- Check CDK documentation: https://docs.aws.amazon.com/cdk/
- Review App Runner guide: https://docs.aws.amazon.com/apprunner/
- Monitor AWS service health: https://status.aws.amazon.com/

For application issues:
- Check application logs in CloudWatch
- Review health check endpoint responses
- Verify environment variable configuration 